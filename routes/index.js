const express = require('express');
const router = express.Router();
const { User, History, Notification } = require('../db');

function requireAuth(req, res, next) {
    if (!req.session.user) return res.redirect('/signin');
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user) return res.redirect('/signin');
    if (req.session.user.role !== 'admin') return res.redirect('/dashboard/security');
    next();
}

function requireAgent(req, res, next) {
    if (!req.session.user) return res.redirect('/signin');
    if (req.session.user.role === 'admin') return res.redirect('/admin/dashboard');
    next();
}

// Page d'accueil
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/dashboard/security');
    }
    res.render('home', { title: 'YURA GUARDIAN', page: 'home' });
});

// Sign In GET
router.get('/signin', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/dashboard/security');
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
        
        // On ne notifie que si l'utilisateur se connecte trop souvent (plus de 3 fois par jour)
        const today = new Date();
        today.setHours(0,0,0,0);
        const dailyLogins = await History.countDocuments({
            userName: user.name,
            action: 'Connexion au système',
            timestamp: { $gte: today }
        });

        if (dailyLogins > 3) {
            await Notification.create({ 
                type: 'warning', 
                message: `⚠️ Activité suspecte: ${user.name} s'est connecté ${dailyLogins} fois aujourd'hui.`,
                userName: user.name 
            });
        }
        if (user.role === 'admin') res.redirect('/admin/dashboard');
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

// Forgot Password GET
router.get('/forgot-password', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/dashboard/security');
    }
    res.render('forgot-password', { title: 'Mot de passe oublié - YURA GUARDIAN', error: null, success: null });
});

// Forgot Password POST
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user) {
            await Notification.create({ 
                type: 'warning', 
                message: `Demande de réinitialisation de mot de passe pour l'utilisateur: ${user.name} (${user.email})`,
                userName: 'Système' 
            });
            await History.create({ action: 'Demande de réinitialisation MDP', userName: user.name, details: `Email: ${email}` });
        }
        res.render('signin', { 
            title: 'Connexion - YURA GUARDIAN', 
            page: 'signin', 
            error: null,
            success: 'Si cet email existe, un administrateur vous contactera pour réinitialiser votre mot de passe.' 
        });
    } catch (error) {
        console.error('Erreur forgot password:', error);
        res.render('forgot-password', { title: 'Mot de passe oublié - YURA GUARDIAN', error: 'Erreur serveur. Réessayez.', success: null });
    }
});

// ===== ROUTES ADMIN =====
router.get('/admin/dashboard', requireAdmin, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).limit(10);
        const histories = await History.find().sort({ timestamp: -1 }).limit(12);
        res.render('admin/dashboard', {
            title: 'Dashboard Admin - YURA GUARDIAN',
            page: 'dashboard',
            users,
            histories,
            user: req.session.user
        });
    } catch (error) {
        res.status(500).send('Erreur serveur');
    }
});

router.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        const total = await User.countDocuments();
        const users = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
        const successMsg = req.query.success === 'password' ? 'Mot de passe modifié avec succès!' : null;
        res.render('admin/users', {
            title: 'Utilisateurs - YURA GUARDIAN',
            page: 'users',
            users,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            user: req.session.user,
            successMsg,
            error: req.query.error || null
        });
    } catch (error) {
        res.status(500).send('Erreur serveur');
    }
});

router.post('/admin/users/add', requireAdmin, async (req, res) => {
    console.log('📝 Tentative ajout utilisateur');
    console.log('Données reçues:', req.body);
    
    try {
        const { identifiant, email, password, name, role, position, status } = req.body;
        
        // Vérifier les champs obligatoires
        if (!identifiant || !email || !password || !name || !role) {
            console.log('❌ Champs manquants');
            return res.redirect('/admin/users?error=missing');
        }
        
        // Nettoyer les données (enlever espaces)
        const cleanId = identifiant.trim();
        const cleanEmail = email.trim().toLowerCase();
        
        // Vérifier si l'identifiant existe déjà
        const existingId = await User.findOne({ identifiant: cleanId });
        if (existingId) {
            console.log('❌ Identifiant existe déjà:', cleanId);
            return res.redirect('/admin/users?error=id_exists');
        }
        
        // Vérifier si l'email existe déjà
        const existingEmail = await User.findOne({ email: cleanEmail });
        if (existingEmail) {
            console.log('❌ Email existe déjà:', cleanEmail);
            return res.redirect('/admin/users?error=email_exists');
        }
        
        // Créer le nouvel utilisateur
        const newUser = await User.create({
            identifiant: cleanId,
            email: cleanEmail,
            password: password,
            name: name,
            role: role,
            position: position || '',
            status: status || 'active'
        });
        
        console.log('✅ Utilisateur créé:', newUser.identifiant);
        
        // Ajouter dans l'historique
        await History.create({
            action: 'Utilisateur créé',
            userName: req.session.user.name,
            details: `Nouvel utilisateur: ${name} (${role})`
        });
        
        res.redirect('/admin/users?success=created');
        
    } catch (error) {
        console.error('❌ Erreur création utilisateur:', error);
        
        // Identifier le type d'erreur
        if (error.code === 11000) {
            // Erreur de duplication MongoDB
            const field = Object.keys(error.keyPattern)[0];
            console.log('❌ Duplication détectée sur:', field);
            return res.redirect(`/admin/users?error=${field}_exists`);
        }
        
        // Autre erreur
        res.redirect('/admin/users?error=server');
    }
});

router.post('/admin/users/delete/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (user) await History.create({ action: 'Utilisateur supprimé', userName: req.session.user.name, details: `Utilisateur supprimé: ${user.name}` });
        res.redirect('/admin/users');
    } catch (error) {
        res.redirect('/admin/users');
    }
});

router.post('/admin/users/toggle/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.status = user.status === 'active' ? 'inactive' : 'active';
            await user.save();
        }
        res.redirect('/admin/users');
    } catch (error) {
        res.redirect('/admin/users');
    }
});
router.post('/admin/users/change-password/:id', requireAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) return res.redirect('/admin/users?error=password');
        await User.findByIdAndUpdate(req.params.id, { password: newPassword });
        await History.create({ action: 'Mot de passe modifié (admin)', userName: req.session.user.name, details: `Utilisateur ID: ${req.params.id}` });
        res.redirect('/admin/users?success=password');
    } catch (error) {
        res.redirect('/admin/users');
    }
});


router.get('/admin/robot', requireAdmin, (req, res) => res.render('admin/robot', {
    title: 'Contrôle Robot - YURA GUARDIAN',
    page: 'robot',
    user: req.session.user
}));
router.get('/admin/camera', requireAdmin, (req, res) => res.render('admin/camera', {
    title: 'Caméra - YURA GUARDIAN',
    page: 'camera',
    user: req.session.user
}));

router.get('/admin/map', requireAdmin, (req, res) => res.render('admin/map', {
    title: 'Carte - YURA GUARDIAN',
    page: 'map',
    user: req.session.user
}));
router.get('/admin/notifications', requireAdmin, async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(100);
        const unreadCount = await Notification.countDocuments({ read: false });
        res.render('admin/notifications', {
            title: 'Alertes - YURA GUARDIAN',
            page: 'notifications',
            notifications,
            unreadCount,
            user: req.session.user
        });
    } catch(e) {
        res.render('admin/notifications', {
            title: 'Alertes - YURA GUARDIAN',
            page: 'notifications',
            notifications: [],
            unreadCount: 0,
            user: req.session.user
        });
    }
});
router.get('/admin/settings', requireAdmin, async (req, res) => {
    try {
        const total = await User.countDocuments();
        res.render('admin/settings', {
            title: 'Paramètres - YURA GUARDIAN',
            page: 'settings',
            total,
            user: req.session.user
        });
    } catch(e) {
        res.render('admin/settings', {
            title: 'Paramètres - YURA GUARDIAN',
            page: 'settings',
            total: 0,
            user: req.session.user
        });
    }
});

router.post('/admin/settings/change-password', requireAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.session.user.id);
        if (!user) return res.json({ success: false, message: 'Utilisateur introuvable' });
        if (user.password !== currentPassword) return res.json({ success: false, message: 'Mot de passe actuel incorrect' });
        if (newPassword.length < 6) return res.json({ success: false, message: 'Mot de passe trop court (min 6 caractères)' });
        if (newPassword !== confirmPassword) return res.json({ success: false, message: 'Les mots de passe ne correspondent pas' });
        user.password = newPassword;
        await user.save();
        await History.create({
            action: 'Mot de passe modifié',
            userName: req.session.user.name,
            details: 'Changement de mot de passe réussi (admin)'
        });
        res.json({ success: true, message: 'Mot de passe changé avec succès!' });
    } catch (error) {
        res.json({ success: false, message: 'Erreur serveur' });
    }
});
router.get('/admin/position', requireAdmin, (req, res) => res.render('admin/position', {
    title: 'Position - YURA GUARDIAN',
    page: 'position',
    user: req.session.user
}));

router.get('/admin/history', requireAdmin, async (req, res) => {
    try {
        const histories = await History.find().sort({ timestamp: -1 }).limit(50);
        res.render('admin/history', {
            title: 'Historique - YURA GUARDIAN',
            page: 'history',
            histories,
            user: req.session.user
        });
    } catch (error) {
        res.status(500).send('Erreur serveur');
    }
});
router.get('/admin/settings', requireAdmin, async (req, res) => {
    try {
        const total = await User.countDocuments();
        res.render('admin/settings', {
            title: 'Paramètres - YURA GUARDIAN',
            page: 'settings',
            total,
            user: req.session.user
        });
    } catch(e) {
        res.render('admin/settings', {
            title: 'Paramètres - YURA GUARDIAN',
            page: 'settings',
            total: 0,
            user: req.session.user
        });
    }
});
// Robot command
//const bt = require('./bluetooth'); // adapti le chemin

// Route déjà existante dans ton dashboard:
// Robot command → RPI via Tailscale
router.post('/admin/robot/command', requireAuth, async (req, res) => {
    const { command, speed } = req.body;
    if (!command) return res.status(400).json({ error: 'No command' });

    const cmdMap = {
        'avancer':    'forward',
        'reculer':    'backward',
        'gauche':     'left',
        'droite':     'right',
        'stop':       'stop',
        'patrouille': 'patrol',
        'base':       'home',
        'scanner':    'scan',
        'charger':    'charge',
        'urgence':    'stop',
        'Forward':    'forward',
        'Backward':   'backward',
        'Left':       'left',
        'Right':      'right',
        'STOP':       'stop'
    };

    const arduinoCmd = cmdMap[command] || command.toLowerCase();
    const RPI_URL = 'http://100.90.80.29:5000';

    try {
        const response = await fetch(`${RPI_URL}/api/robot/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: arduinoCmd, speed: speed || 70 }),
            signal: AbortSignal.timeout(3000)
        });
        const result = await response.json();
        console.log('🤖 Robot cmd sent:', arduinoCmd, result);
        await History.create({ action: `Commande robot: ${arduinoCmd}`, userName: req.session.user.name });
        res.json({ success: true, command: arduinoCmd });
    } catch (err) {
        console.error('❌ Robot command error:', err.message);
        res.json({ success: false, error: err.message });
    }
});

router.get('/admin/robot/status', (req, res) => {
    res.json({ connected: true, url: 'http://100.90.80.29:5000' });
});

// ===== NOTIFICATIONS =====
router.get('/notifications', requireAuth, async (req, res) => {
    // Admin → redirect l page admin
    if (req.session.user.role === 'admin') {
        return res.redirect('/admin/notifications');
    }
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(100);
        const unreadCount = await Notification.countDocuments({ read: false });
        res.render('security/notifications', {
            title: 'Notifications - YURA GUARDIAN',
            page: 'notifications',
            notifications,
            unreadCount,
            user: req.session.user
        });
    } catch (e) {
        res.render('security/notifications', {
            title: 'Notifications - YURA GUARDIAN',
            page: 'notifications',
            notifications: [],
            unreadCount: 0,
            user: req.session.user
        });
    }
});

router.post('/notifications/read/:id', requireAuth, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        const redirect = req.session.user.role === 'admin' ? '/admin/notifications' : '/notifications';
        res.redirect(redirect);
    } catch (error) {
        res.redirect(req.session.user.role === 'admin' ? '/admin/notifications' : '/notifications');
    }
});

router.post('/notifications/delete/:id', requireAuth, async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        const redirect = req.session.user.role === 'admin' ? '/admin/notifications' : '/notifications';
        res.redirect(redirect);
    } catch (error) {
        res.redirect(req.session.user.role === 'admin' ? '/admin/notifications' : '/notifications');
    }
});

router.post('/notifications/read-all', requireAuth, async (req, res) => {
    try {
        await Notification.updateMany({ read: false }, { read: true });
        const redirect = req.session.user.role === 'admin' ? '/admin/notifications' : '/notifications';
        res.redirect(redirect);
    } catch (error) {
        res.redirect(req.session.user.role === 'admin' ? '/admin/notifications' : '/notifications');
    }
});

// ===== ROUTES SECURITY (AGENT) =====
router.get('/dashboard/security', requireAgent, async (req, res) => {
    try {
        const histories = await History.find().sort({ timestamp: -1 }).limit(10);
        res.render('security/dashboard', {
            title: 'Robot Dashboard - YURA GUARDIAN',
            page: 'dashboard',
            histories,
            user: req.session.user
        });
    } catch (error) {
        res.render('security/dashboard', {
            title: 'Robot Dashboard - YURA GUARDIAN',
            page: 'dashboard',
            histories: [],
            user: req.session.user
        });
    }
});

router.get('/dashboard/history', requireAgent, async (req, res) => {
    try {
        const histories = await History.find().sort({ timestamp: -1 }).limit(100);
        res.render('security/history', {
            title: 'Historique - YURA GUARDIAN',
            page: 'history',
            histories,
            user: req.session.user
        });
    } catch (error) {
        res.render('security/history', {
            title: 'Historique - YURA GUARDIAN',
            page: 'history',
            histories: [],
            user: req.session.user
        });
    }
});

router.get('/dashboard/camera', requireAgent, (req, res) => res.render('security/camera', {
    title: 'Caméra - YURA GUARDIAN',
    page: 'camera',
    user: req.session.user
}));

router.get('/dashboard/map', requireAgent, (req, res) => res.render('security/map', {
    title: 'Map - YURA GUARDIAN',
    page: 'map',
    user: req.session.user
}));

router.get('/dashboard/settings', requireAgent, (req, res) => {
    res.render('security/settings', {
        title: 'Paramètres - YURA GUARDIAN',
        page: 'settings',
        user: req.session.user
    });
});
// Route pour enregistrer les paramètres
router.post('/dashboard/settings/save', (req, res) => {
    console.log('📥 Paramètres reçus:', req.body);
    
    // Ici tu peux sauvegarder dans MongoDB si tu veux
    // Pour l'instant on retourne juste success
    
    res.json({
        success: true,
        message: 'Paramètres enregistrés avec succès!'
    });
});
router.get('/dashboard/notifications', requireAgent, (req, res) => {
    res.redirect('/notifications');
});

router.post('/dashboard/settings/save', requireAgent, async (req, res) => {
    try {
        await History.create({
            action: 'Paramètres modifiés',
            userName: req.session.user.name,
            details: 'Paramètres utilisateur mis à jour'
        });
        res.json({ success: true, message: 'Paramètres sauvegardés avec succès!' });
    } catch (error) {
        res.json({ success: false, message: 'Erreur lors de la sauvegarde' });
    }
});

router.post('/dashboard/settings/change-password', requireAgent, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.session.user.id);
        if (!user) return res.json({ success: false, message: 'Utilisateur introuvable' });
        if (user.password !== currentPassword) return res.json({ success: false, message: 'Mot de passe actuel incorrect' });
        if (newPassword.length < 6) return res.json({ success: false, message: 'Mot de passe trop court (min 6 caractères)' });
        if (newPassword !== confirmPassword) return res.json({ success: false, message: 'Les mots de passe ne correspondent pas' });
        user.password = newPassword;
        await user.save();
        await History.create({
            action: 'Mot de passe modifié',
            userName: req.session.user.name,
            details: 'Changement de mot de passe réussi'
        });
        res.json({ success: true, message: 'Mot de passe changé avec succès!' });
    } catch (error) {
        res.json({ success: false, message: 'Erreur serveur' });
    }
});
router.get('/api/sensors', (req, res) => {
    res.json({
        success: true,
        connected: global.bluetoothConnected || false,
        data: {
            temperature: global.sensorData.temperature,
            humidity:    global.sensorData.humidity,
            battery:     global.sensorData.battery,
            signal:      global.sensorData.signal,
            distance:    global.sensorData.distance,  // ← ajoute
            obstacle:    global.sensorData.obstacle   // ← ajoute
        }
    });
});



module.exports = router;