const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
require('dotenv').config();
const { User, History, Notification } = require('./db');

const app = express();

// ===== CONFIGURATION SIM7600 =====
const SIM_PORT = 'COM3'; // بدّلها حسب جهازك

global.sensorData = {
    temperature: 0,
    humidity: 0,
    battery: 0,
    signal: 'DISCONNECTED',
    distance: 0,
    obstacle: false,
    lat: 0,    
    lng: 0    
};
global.simConnected = false;

let simPort = null;
let parser = null;

// ===== FONCTION CONNEXION SIM7600 =====
function connectSIM7600() {
    try {
        simPort = new SerialPort({ path: SIM_PORT, baudRate: 115200 });
        parser = simPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        simPort.on('open', () => {
            console.log('📡 SIM7600 CONNECTED');
            global.simConnected = true;
            global.sensorData.signal = "4G_CONNECTED";
        });

        simPort.on('error', (err) => {
            console.error('❌ SIM Error:', err.message);
            global.simConnected = false;
            global.sensorData.signal = "DISCONNECTED";
        });

        simPort.on('close', () => {
            console.log('🔌 SIM disconnected');
            global.simConnected = false;
            global.sensorData.signal = "DISCONNECTED";
        });

        parser.on('data', async (line) => {
            const raw = line.trim();
            console.log('📡 SIM RAW:', raw);

            try {
                const data = JSON.parse(raw);

                // update sensors
                global.sensorData = {
                    ...global.sensorData,
                    ...data
                };

                // OBSTACLE ALERT
                if (data.obstacle) {

                    console.log('🚨 OBSTACLE DETECTED');

                    await Notification.create({
                        type: 'alerte',
                        message: '🚧 Obstacle détecté!'
                    });

                    await History.create({
                        action: 'Obstacle détecté',
                        userName: 'Robot'
                    });

                }

            } catch (e) {
                console.log('❌ bad data:', raw);
            }
        });

    } catch (error) {
        console.error('⚠️ SIM connect failed:', error.message);
        global.simConnected = false;
    }
}

// ===== START SIM =====
console.log('[SIM] Connecting to', SIM_PORT);
connectSIM7600();
// ===== ARDUINO SERIAL =====   ← zid min hna
const ARDUINO_PORT = 'COM5'; // badel b port Arduino mte3ek
const arduinoSerial = new SerialPort({ path: ARDUINO_PORT, baudRate: 9600 });
const arduinoParser = arduinoSerial.pipe(new ReadlineParser({ delimiter: '\n' }));

arduinoSerial.on('open', () => {
    console.log('Arduino connected on', ARDUINO_PORT);
});

arduinoParser.on('data', (line) => {
    try {
        const data = JSON.parse(line.trim());
        if (!isNaN(data.temp))  global.sensorData.temperature = data.temp;
        if (!isNaN(data.hum))   global.sensorData.humidity    = data.hum;
        if (data.lat !== undefined) global.sensorData.lat     = data.lat;
        if (data.lng !== undefined) global.sensorData.lng     = data.lng;
        console.log('Arduino data:', global.sensorData);
    } catch(e) {}
});

arduinoSerial.on('error', (err) => {
    console.error('Arduino error:', err.message);
});

// ===== EXPRESS CONFIG =====   ← w taw yibda el code mte3ek
app.set('view engine', 'ejs');


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

// ===== API SENSORS =====
app.get('/api/sensors', (req, res) => {
    res.json({ data: global.sensorData });
});
// ===== CAMERA PROXY =====
const { createProxyMiddleware } = require('http-proxy-middleware');
app.use('/camera-stream', createProxyMiddleware({
    target: 'http://192.168.0.155:5000',
    changeOrigin: true,
    pathRewrite: { '^/camera-stream': '/video' },
    on: {
        error: (err, req, res) => {
            res.status(502).send('Camera offline');
        }
    }
}));
// ===== ARDUINO DATA FROM RPI =====
app.post('/api/arduino-data', (req, res) => {
    const data = req.body;
    if (!isNaN(data.temp)) global.sensorData.temperature = data.temp;
    if (!isNaN(data.hum))  global.sensorData.humidity    = data.hum;
    if (data.lat !== undefined) global.sensorData.lat    = data.lat;
    if (data.lng !== undefined) global.sensorData.lng    = data.lng;
    console.log('✅ Data from RPi:', global.sensorData);
    res.json({ ok: true });
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
    console.log('📡 SIM status:', global.simConnected ? 'CONNECTED' : 'DISCONNECTED');
    console.log('='.repeat(50));
});

// ===== SHUTDOWN =====
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt serveur...');
    if (simPort && simPort.isOpen) {
        simPort.close(() => {
            console.log('🔌 SIM closed');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});