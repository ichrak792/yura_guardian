const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
require('dotenv').config();
const { User, History, Notification } = require('./db');


const app = express();

// ===== CONFIGURATION BLUETOOTH HC-06 =====
const ROBOT_PORT = 'COM9';

global.sensorData = {
    temperature: 0,
    humidity: 0,
    battery: 0,
    signal: 'DISCONNECTED',
    distance: 0,
    obstacle: false
};

global.bluetoothConnected = false;

let btPort = null;
let parser = null;

// ===== FONCTION CONNEXION BLUETOOTH =====
function connectBluetooth() {
    try {
        btPort = new SerialPort({ path: ROBOT_PORT, baudRate: 9600, autoOpen: true });
        parser = btPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        btPort.on('open', () => {
            console.log('✅ 🤖 Robot YURA GUARDIAN connecté!');
            console.log('📡 Port:', ROBOT_PORT);
            global.bluetoothConnected = true;
        });

        btPort.on('error', (err) => {
            console.error('❌ Erreur Bluetooth:', err.message);
            global.bluetoothConnected = false;
        });

        btPort.on('close', () => {
            console.log('🔌 Connexion Bluetooth fermée');
            global.bluetoothConnected = false;
        });

        parser.on('data', async (line) => {
    const raw = line.trim();
    console.log('🤖 Arduino RAW:', raw);

    try {
        if (raw.startsWith('Temp:')) {
            const val = parseFloat(raw.replace('Temp:', '').trim());
            if (!isNaN(val)) {
                global.sensorData.temperature = val;
            }
        }

        // ✅ OBSTACLE (المهم)
        if (raw.toLowerCase().includes('obstacle')) {

            console.log('🚨 OBSTACLE DETECTED');

            // 🔥 Notification
            await Notification.create({
                type: 'alerte',
                message: '🚧 Obstacle détecté!'
            });

            // 🔥 Historique
            await History.create({
                action: 'Obstacle détecté',
                userName: 'Robot'
            });
        } 

    } catch(e) {
        console.error('❌ DB error:', e.message);
    }
});

    } catch (error) {
        console.error('⚠️ Impossible de connecter le robot:', error.message);
        global.bluetoothConnected = false;
    }
}

// ===== COMMANDE ROBOT =====
global.sendCommandToRobot = function(command) {
    return new Promise((resolve, reject) => {
        if (!global.bluetoothConnected || !btPort || !btPort.isOpen) {
            reject(new Error('Robot non connecté'));
            return;
        }
        btPort.write(command + '\n', (err) => {
            if (err) { reject(err); }
            else {
                console.log('📤 Commande envoyée:', command);
                resolve();
            }
        });
    });
};

// ===== DÉMARRER BLUETOOTH =====
console.log('[BT] Tentative de connexion à', ROBOT_PORT, '...');
connectBluetooth();

// ===== EXPRESS CONFIG =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'yura-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ===== ROUTES =====
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

// ===== 404 =====
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - YURA GUARDIAN</title>
            <style>
                body { font-family:'Segoe UI',sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:linear-gradient(135deg,#5c1f1f,#3d1414); color:#fff; text-align:center; }
                h1 { font-size:5rem; margin:0; }
                a { color:#fff; background:#2563eb; padding:12px 30px; text-decoration:none; border-radius:25px; display:inline-block; margin-top:20px; }
            </style>
        </head>
        <body>
            <div><h1>404</h1><h2>Page non trouvée</h2><a href="/">Retour</a></div>
        </body>
        </html>
    `);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 Serveur YURA GUARDIAN démarré!');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log('📊 État Bluetooth:', global.bluetoothConnected ? '✅ Connecté' : '⚠️ Déconnecté');
    console.log('='.repeat(50));
});

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    if (btPort && btPort.isOpen) {
        btPort.close(() => {
            console.log('🔌 Bluetooth déconnecté');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});