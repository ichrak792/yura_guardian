const mongoose = require('mongoose');

const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/yura-guardian';

mongoose.connect(mongoURL)
    .then(() => console.log('✅ Connecté à MongoDB'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

// USER
const userSchema = new mongoose.Schema({
    identifiant: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['security', 'admin','agent'], required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    position: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// HISTORY
const historySchema = new mongoose.Schema({
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: '' }
});
const History = mongoose.model('History', historySchema);

// NOTIFICATION
const notificationSchema = new mongoose.Schema({
    type: { type: String, enum: ['robot', 'connexion', 'alerte', 'camera'], required: true },
    message: { type: String, required: true },
    userName: { type: String, default: 'Système' },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);
//sensors data
const sensorSchema = new mongoose.Schema({
    temperature: Number,
    humidity: Number,
    distance: Number,
    obstacle: Boolean,
    lat: Number,
    lng: Number,
    timestamp: { type: Date, default: Date.now }
});
const SensorData = mongoose.model('SensorData', sensorSchema);

module.exports = { User, History, Notification, SensorData };

