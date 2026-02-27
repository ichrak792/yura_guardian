const mongoose = require('mongoose');

const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/yura-guardian';

mongoose.connect(mongoURL)
    .then(() => console.log('✅ Connecté à MongoDB'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

// Schéma utilisateur
const userSchema = new mongoose.Schema({
    identifiant: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['security', 'admin'], required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    position: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Schéma historique des actions robot
const historySchema = new mongoose.Schema({
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: '' }
});

const History = mongoose.model('History', historySchema);

module.exports = { User, History };
const notificationSchema = new mongoose.Schema({
    type: { type: String, enum: ['robot', 'connexion', 'alerte', 'camera'], required: true },
    message: { type: String, required: true },
    userName: { type: String, default: 'Système' },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { User, History, Notification };