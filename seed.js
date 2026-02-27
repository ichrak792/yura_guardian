const mongoose = require('mongoose');
require('dotenv').config();
const { User, History } = require('./db');

async function seedDatabase() {
    try {
        await User.deleteMany({});
        await History.deleteMany({});
        console.log('🗑️  Anciens données supprimées');

        await User.create({
            identifiant: 'admin',
            email: 'admin@yura.com',
            password: 'admin123',
            role: 'admin',
            name: 'Administrateur Principal',
            status: 'active',
            position: 'Responsable Système'
        });
        console.log('✅ Admin créé: admin / admin123');

        await User.create({
            identifiant: 'agent1',
            email: 'agent1@yura.com',
            password: 'agent123',
            role: 'security',
            name: 'Agent Sécurité 1',
            status: 'active',
            position: 'Agent de Surveillance'
        });
        console.log('✅ Agent créé: agent1 / agent123');

        const users = [
            { identifiant: 'user1', email: 'utilisateur1@yura.com', password: 'pass123', role: 'security', name: 'Utilisateur 1', status: 'active', position: 'Product Designer' },
            { identifiant: 'user2', email: 'utilisateur2@yura.com', password: 'pass123', role: 'admin', name: 'Utilisateur 2', status: 'active', position: 'Product Manager' },
            { identifiant: 'user3', email: 'utilisateur3@yura.com', password: 'pass123', role: 'security', name: 'Utilisateur 3', status: 'active', position: 'Frontend Developer' },
            { identifiant: 'user4', email: 'utilisateur4@yura.com', password: 'pass123', role: 'security', name: 'Utilisateur 4', status: 'inactive', position: 'Backend Developer' },
            { identifiant: 'user5', email: 'utilisateur5@yura.com', password: 'pass123', role: 'admin', name: 'Utilisateur 5', status: 'active', position: 'Fullstack Developer' },
        ];

        await User.insertMany(users);

        // Seed historique
        const histories = [
            { action: 'Robot avancé', userName: 'Agent Sécurité 1', details: 'Commande: Forward' },
            { action: 'Robot arrêté', userName: 'Agent Sécurité 1', details: 'Commande: STOP' },
            { action: 'Caméra démarrée', userName: 'Administrateur Principal', details: 'Session caméra ouverte' },
            { action: 'Robot tourné à gauche', userName: 'Agent Sécurité 1', details: 'Commande: Left' },
            { action: 'Robot tourné à droite', userName: 'Utilisateur 3', details: 'Commande: Right' },
            { action: 'Carte consultée', userName: 'Administrateur Principal', details: 'Position GPS actualisée' },
        ];
        await History.insertMany(histories);

        console.log('✅ Historique créé');
        console.log('\n📊 Base de données initialisée avec succès!');
        console.log('\n🔑 Comptes de test:');
        console.log('   Admin: admin / admin123 → admin@yura.com');
        console.log('   Agent: agent1 / agent123 → agent1@yura.com');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

seedDatabase();
