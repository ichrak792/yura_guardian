const express = require('express');
const router = express.Router();
const { User, History, Notification } = require('../db');

function requireAuth(req, res, next) {
    if (!req.session.user) return res.redirect('/signin');
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/dashboard/security');
    next();
}

// Page d'accueil
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin/users' : '/dashboard/security');
    }
    res.render('home', { title: 'YURA GUARDIAN', page: 'home' });
});

// Sign In GET
router.get('/signin', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin/users' : '/dashboard/security');
    }
    res.render('signin', { title: 'Connexion - YURA GUARDIAN', page: 'signin', error: null });
});

// Sign In POST
router.post('/signin', async (req, res) => {
    const { identifiant, email, password } = req.body;
    try {
        const user = await User.findOne({ identifiant, email });
        if (!user) {
            return res.render('signin', { title: 'Connexion - YURA GUARDIAN', page: 'signin', error: 'Identifiant ou email incorrect' });
        }
        if (user.password !== password) {
            return res.render('signin', { title: 'Connexion - YURA GUARDIAN', page: 'signin', error: 'Mot de passe incorrect' });
        }
        if (user.status === 'inactive') {
            return res.render('signin', { title: 'Connexion - YURA GUARDIAN', page: 'signin', error: 'Compte désactivé. Contactez l\'administrateur.' });
        }
        req.session.user = {
            id: user._id,
            identifiant: user.identifiant,
            email: user.email,
            role: user.role,
            name: user.name
        };
        await History.create({ action: 'Connexion au système', userName: user.name, details: `Rôle: ${user.role}` });
        await Notification.create({ type: 'connexion', message: `Connexion: ${user.name}`, userName: user.name });
        if (user.role === 'admin') res.redirect('/admin/users');
        else res.redirect('/dashboard/security');
    } catch (error) {
        console.error('Erreur de connexion:', error);
        res.render('signin', { title: 'Connexion - YURA GUARDIAN', page: 'signin', error: 'Erreur serveur. Réessayez.' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/signin');
});

// ===== ROUTES ADMIN =====
router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        const total = await User.countDocuments();
        const users = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
        res.render('admin/users', { title: 'Utilisateurs - YURA GUARDIAN', page: 'users', users, currentPage: page, totalPages: Math.ceil(total / limit), total });
    } catch (error) {
        res.status(500).send('Erreur serveur');
    }
});

router.post('/admin/users/add', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { identifiant, email, password, name, role, position, status } = req.body;
        await User.create({ identifiant, email, password, name, role, position, status: status || 'active' });
        await History.create({ action: 'Utilisateur créé', userName: req.session.user.name, details: `Nouvel utilisateur: ${name}` });
        res.redirect('/admin/users');
    } catch (error) {
        res.redirect('/admin/users?error=exists');
    }
});

router.post('/admin/users/delete/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (user) await History.create({ action: 'Utilisateur supprimé', userName: req.session.user.name, details: `Utilisateur supprimé: ${user.name}` });
        res.redirect('/admin/users');
    } catch (error) {
        res.redirect('/admin/users');
    }
});

router.post('/admin/users/toggle/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) { user.status = user.status === 'active' ? 'inactive' : 'active'; await user.save(); }
        res.redirect('/admin/users');
    } catch (error) {
        res.redirect('/admin/users');
    }
});

router.get('/admin/camera',   requireAuth, requireAdmin, (req, res) => res.render('admin/camera',   { title: 'Caméra - YURA GUARDIAN',    page: 'camera' }));
router.get('/admin/map',      requireAuth, requireAdmin, (req, res) => res.render('admin/map',      { title: 'Carte - YURA GUARDIAN',      page: 'map' }));
router.get('/admin/position', requireAuth, requireAdmin, (req, res) => res.render('admin/position', { title: 'Position - YURA GUARDIAN',   page: 'position' }));

router.get('/admin/history', requireAuth, requireAdmin, async (req, res) => {
    try {
        const histories = await History.find().sort({ timestamp: -1 }).limit(50);
        res.render('admin/history', { title: 'Historique - YURA GUARDIAN', page: 'history', histories });
    } catch (error) {
        res.status(500).send('Erreur serveur');
    }
});

// Robot command — version unique avec Notification
router.post('/admin/robot/command', requireAuth, async (req, res) => {
    try {
        const { command } = req.body;
        await History.create({ action: `Robot: ${command}`, userName: req.session.user.name, details: `Commande envoyée: ${command}` });
        await Notification.create({ type: 'robot', message: `Commande robot: ${command}`, userName: req.session.user.name });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// ===== NOTIFICATIONS (admin) =====
router.get('/notifications', requireAuth, async (req, res) => {
    try {
        const filter = req.query.filter || 'tous';
        const type   = req.query.type   || 'toutes';
        const now = new Date();
        let dateFilter = {};
        if (filter === 'aujourd_hui') {
            const start = new Date(now); start.setHours(0,0,0,0);
            const end   = new Date(now); end.setHours(23,59,59,999);
            dateFilter = { createdAt: { $gte: start, $lte: end } };
        } else if (filter === 'semaine') {
            const start = new Date(now); start.setDate(now.getDate() - 7);
            dateFilter = { createdAt: { $gte: start } };
        } else if (filter === 'mois') {
            const start = new Date(now); start.setDate(now.getDate() - 30);
            dateFilter = { createdAt: { $gte: start } };
        }
        if (type !== 'toutes') dateFilter.type = type;
        const notifications = await Notification.find(dateFilter).sort({ createdAt: -1 }).limit(100);
        const unreadCount   = await Notification.countDocuments({ read: false });
        res.render('notifications', { title: 'Notifications - YURA GUARDIAN', page: 'notifications', notifications, filter, type, unreadCount });
    } catch(e) {
        res.render('notifications', { title: 'Notifications', page: 'notifications', notifications: [], filter: 'tous', type: 'toutes', unreadCount: 0 });
    }
});

router.post('/notifications/read/:id', requireAuth, async (req, res) => {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.redirect('/notifications');
});

router.post('/notifications/delete/:id', requireAuth, async (req, res) => {
    await Notification.findByIdAndDelete(req.params.id);
    res.redirect('/notifications');
});

router.post('/notifications/read-all', requireAuth, async (req, res) => {
    await Notification.updateMany({ read: false }, { read: true });
    res.redirect('/notifications');
});

// ===== ROUTES SECURITY =====
router.get('/dashboard/security', requireAuth, async (req, res) => {
    try {
        const histories = await History.find().sort({ timestamp: -1 }).limit(10);
        res.render('security/dashboard', { title: 'Robot Dashboard - YURA GUARDIAN', page: 'dashboard', histories });
    } catch (error) {
        res.render('security/dashboard', { title: 'Robot Dashboard - YURA GUARDIAN', page: 'dashboard', histories: [] });
    }
});

// Notifications security (alerts statiques)
router.get('/dashboard/notifications', requireAuth, (req, res) => {
    const alerts = [
        { id:1,  type:'danger',  icon:'🌡️', title:'Température élevée',   message:'Température critique détectée à 45°C dans la zone A', time:'2 minutes',  zone:'Zone A',           value:'45°C',            isNew:true  },
        { id:2,  type:'danger',  icon:'☣️', title:'Gaz détecté',           message:'Niveau de gaz dangereux: 45 ppm',                    time:'8 minutes',  zone:'Zone C',           value:'45 ppm',          isNew:false },
        { id:3,  type:'warning', icon:'💧', title:'Humidité anormale',     message:'Taux d\'humidité critique: 85%',                     time:'5 minutes',  zone:'Zone B',           value:'85%',             isNew:true  },
        { id:4,  type:'warning', icon:'🔋', title:'Batterie faible',       message:'Niveau de batterie critique: 15%',                   time:'12 minutes', zone:'Robot',            value:'15%',             isNew:false },
        { id:5,  type:'info',   icon:'📹', title:'Mouvement détecté',     message:'Personne détectée par caméra 3 à l\'entrée',         time:'3 minutes',  zone:'Entrée principale',value:'Caméra 3',        isNew:true  },
        { id:6,  type:'info',   icon:'🚪', title:'Accès autorisé',        message:'Badge scanné avec succès - Employé #245',            time:'10 minutes', zone:'Porte A',          value:'Badge #245',      isNew:false },
        { id:7,  type:'info',   icon:'🤖', title:'Robot en mouvement',    message:'Robot a démarré la ronde de surveillance Zone B',    time:'15 minutes', zone:'Zone B',           value:'Ronde programmée',isNew:false },
        { id:8,  type:'success',icon:'✅', title:'Ronde terminée',        message:'Ronde de sécurité Zone A-B-C terminée sans incident',time:'30 minutes', zone:'Toutes zones',     value:'0 incident',      isNew:false },
        { id:9,  type:'success',icon:'💚', title:'Batterie rechargée',    message:'Robot rechargé à 100% - Prêt pour la prochaine mission',time:'45 minutes',zone:'Station de charge',value:'100%',           isNew:false },
        { id:10, type:'success',icon:'🔐', title:'Sécurité maintenue',    message:'Aucune intrusion détectée dans les dernières 24h',   time:'1 heure',    zone:'Global',           value:'0 incident',      isNew:false }
    ];
    res.render('security/notifications', { title: 'Notifications - YURA GUARDIAN', page: 'notifications', alerts });
});

router.get('/dashboard/settings', requireAuth, (req, res) => {
    res.render('security/settings', { title: 'Paramètres - YURA GUARDIAN', page: 'settings' });
});

router.post('/dashboard/settings/save', requireAuth, async (req, res) => {
    try {
        console.log('⚙️ Paramètres sauvegardés:', req.body);
        res.json({ success: true, message: 'Paramètres sauvegardés avec succès!' });
    } catch (error) {
        res.json({ success: false, message: 'Erreur lors de la sauvegarde' });
    }
});

router.get('/dashboard/history', requireAuth, async (req, res) => {
    try {
        const histories = await History.find().sort({ timestamp: -1 }).limit(100);
        res.render('security/history', { title: 'Historique - YURA GUARDIAN', page: 'history', histories });
    } catch (error) {
        res.render('security/history', { title: 'Historique - YURA GUARDIAN', page: 'history', histories: [] });
    }
});

router.get('/dashboard/camera', requireAuth, (req, res) => res.render('security/camera', { title: 'Caméra - YURA GUARDIAN', page: 'camera' }));
router.get('/dashboard/map',    requireAuth, (req, res) => res.render('security/map',    { title: 'Map - YURA GUARDIAN',    page: 'map' }));

module.exports = router;