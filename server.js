const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const http = require('http');
require('dotenv').config();
const { User, History, Notification, SensorData } = require('./db');
const app = express();

// ===== SENSOR DATA GLOBAL =====
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

// Kol minute:
setInterval(async () => {
    try {
        await SensorData.create({
            temperature: global.sensorData.temperature,
            humidity: global.sensorData.humidity,
            distance: global.sensorData.distance,
            obstacle: global.sensorData.obstacle,
            lat: global.sensorData.lat,
            lng: global.sensorData.lng
        });
    } catch(e) {}
}, 60000);
global.simConnected = false;

const IS_WINDOWS = process.platform === 'win32';

if (IS_WINDOWS) {
    const { SerialPort } = require('serialport');
    const { ReadlineParser } = require('@serialport/parser-readline');

    const SIM_PORT = 'COM3';
    const ARDUINO_PORT = 'COM5';

    let simPort = null;
    let simParser = null;

    function connectSIM7600() {
        try {
            simPort = new SerialPort({ path: SIM_PORT, baudRate: 115200 });
            simParser = simPort.pipe(new ReadlineParser({ delimiter: '\n' }));

            simPort.on('open', () => {
                console.log('📡 SIM7600 CONNECTED on', SIM_PORT);
                global.simConnected = true;
                global.sensorData.signal = "4G_CONNECTED";
            });

            simPort.on('error', (err) => {
                console.error('SIM connected:', err.message);
                global.simConnected = false;
                global.sensorData.signal = "DISCONNECTED";
                setTimeout(connectSIM7600, 10000);
            });

            simPort.on('close', () => {
                console.log('🔌 SIM disconnected');
                global.simConnected = false;
                global.sensorData.signal = "DISCONNECTED";
                setTimeout(connectSIM7600, 10000);
            });

            simParser.on('data', async (line) => {
                const raw = line.trim();
                try {
                    const data = JSON.parse(raw);
                    global.sensorData = { ...global.sensorData, ...data };
                    if (data.obstacle) {
                        await Notification.create({ type: 'alerte', message: '🚧 Obstacle détecté!', read: false });
                        await History.create({ action: 'Obstacle détecté', userName: 'Robot' });
                    }
                } catch (e) {}
            });

        } catch (error) {
            console.error('⚠️ SIM connect failed:', error.message);
            global.simConnected = false;
            setTimeout(connectSIM7600, 10000);
        }
    }

    let arduinoSerial = null;
    let arduinoParser = null;

    function connectArduino() {
        try {
            arduinoSerial = new SerialPort({ path: ARDUINO_PORT, baudRate: 9600 });
            arduinoParser = arduinoSerial.pipe(new ReadlineParser({ delimiter: '\n' }));

            arduinoSerial.on('open', () => {
                console.log('✅ Arduino connected on', ARDUINO_PORT);
            });

            arduinoParser.on('data', (line) => {
                try {
                    const data = JSON.parse(line.trim());
                    if (!isNaN(data.temp))           global.sensorData.temperature = data.temp;
                    if (!isNaN(data.hum))            global.sensorData.humidity    = data.hum;
                    if (data.lat !== undefined)      global.sensorData.lat         = data.lat;
                    if (data.lng !== undefined)      global.sensorData.lng         = data.lng;
                    if (data.distance !== undefined) global.sensorData.distance    = data.distance;
                    if (data.obstacle !== undefined) global.sensorData.obstacle    = data.obstacle;
                } catch(e) {}
            });

            arduinoSerial.on('error', (err) => {
                console.error('Arduino connecté:', err.message);
                setTimeout(connectArduino, 10000);
            });

            arduinoSerial.on('close', () => {
                console.log('🔌 Arduino disconnected, retrying...');
                setTimeout(connectArduino, 10000);
            });

        } catch (error) {
            console.error('⚠️ Arduino connect failed:', error.message);
            setTimeout(connectArduino, 10000);
        }
    }

    connectSIM7600();
    connectArduino();

} else {
    console.log('ℹ️ Linux mode — serial ports gérés par camera_server.py sur RPI');
}

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

// ===== CAMERA STREAM DIRECTE (sans proxy middleware) =====
app.get('/camera-stream', (req, res) => {
    const options = {
        hostname: '100.90.80.29',
        port: 5000,
        path: '/video',
        method: 'GET',
        timeout: 60000
    };

    res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');

    const proxyReq = http.request(options, (proxyRes) => {
        proxyRes.on('data', (chunk) => {
            if (!res.writableEnded) res.write(chunk);
        });
        proxyRes.on('end', () => { if (!res.writableEnded) res.end(); });
        proxyRes.on('error', () => { if (!res.writableEnded) res.end(); });
    });

    proxyReq.on('error', (err) => {
        console.error('Camera proxy error:', err.message);
        if (!res.writableEnded) res.end();
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.writableEnded) res.end();
    });

    req.on('close', () => proxyReq.destroy());
    proxyReq.setTimeout(60000);
    proxyReq.end();
});
// ===== DATA FROM RPI (/api/arduino-data) =====
app.post('/api/arduino-data', async (req, res) => {
    const data = req.body;
    if (!isNaN(data.temp))           global.sensorData.temperature = data.temp;
    if (!isNaN(data.hum))            global.sensorData.humidity    = data.hum;
    if (data.lat !== undefined)      global.sensorData.lat         = data.lat;
    if (data.lng !== undefined)      global.sensorData.lng         = data.lng;
    if (data.distance !== undefined) global.sensorData.distance    = data.distance;
    if (data.obstacle !== undefined) global.sensorData.obstacle    = data.obstacle;

    if (data.obstacle === true) {
        console.log('🚨 OBSTACLE from RPi (/arduino-data)');
        try {
            await Notification.create({ type: 'alerte', message: `🚧 Obstacle détecté à ${data.distance || '?'} cm`, read: false });
            await History.create({ action: `Obstacle détecté à ${data.distance || '?'} cm`, userName: 'Robot YURA' });
        } catch(e) { console.error('DB error:', e.message); }
    }

    console.log('✅ Data from RPi (arduino-data):', global.sensorData);
    res.json({ ok: true });
});

// ===== DATA FROM RPI (/api/sensors-data) =====
app.post('/api/sensors-data', async (req, res) => {
    const data = req.body;
    if (!isNaN(data.temp))           global.sensorData.temperature = data.temp;
    if (!isNaN(data.hum))            global.sensorData.humidity    = data.hum;
    if (data.distance !== undefined) global.sensorData.distance    = data.distance;
    if (data.obstacle !== undefined) global.sensorData.obstacle    = data.obstacle;
    if (data.lat !== undefined)      global.sensorData.lat         = data.lat;
    if (data.lng !== undefined)      global.sensorData.lng         = data.lng;

    if (data.obstacle === true) {
        console.log('🚨 OBSTACLE from RPi (/sensors-data)');
        try {
            await Notification.create({ type: 'alerte', message: `🚧 Obstacle détecté à ${data.distance || '?'} cm`, read: false });
            await History.create({ action: `Obstacle détecté à ${data.distance || '?'} cm`, userName: 'Robot YURA' });
        } catch(e) { console.error('DB error:', e.message); }
    }

    console.log('✅ Data from RPi (sensors-data):', global.sensorData);
    res.json({ ok: true });
});

// ===== YOLO ALERT =====
app.post('/api/yolo-alert', async (req, res) => {
    const data = req.body;
    if (data.detections)             global.sensorData.detections = data.detections;
    if (data.obstacle !== undefined) global.sensorData.obstacle   = data.obstacle;
    if (data.distance !== undefined) global.sensorData.distance   = data.distance;

    if (data.obstacle === true) {
        try {
            await Notification.create({ type: 'alerte', message: `🚧 Obstacle détecté à ${data.distance || '?'} cm`, read: false });
            await History.create({ action: `Obstacle détecté à ${data.distance || '?'} cm`, userName: 'Robot YURA' });
        } catch(e) { console.error('DB error:', e.message); }
    }

    console.log('🎯 YOLO alert:', data);
    res.json({ ok: true });
});

// ===== OBSTACLE ALERT =====
app.post('/api/obstacle-alert', async (req, res) => {
    const data = req.body;
    if (data.distance !== undefined) global.sensorData.distance = data.distance;
    global.sensorData.obstacle = true;

    console.log('🚨 OBSTACLE ALERT from RPi:', data.distance, 'cm');
    try {
        await Notification.create({ type: 'alerte', message: `🚧 Obstacle détecté à ${data.distance || '?'} cm`, read: false });
        await History.create({ action: `Obstacle détecté à ${data.distance || '?'} cm`, userName: 'Robot YURA' });
    } catch(e) { console.error('DB error:', e.message); }

    res.json({ ok: true });
});

// ===== NOTIFICATIONS API =====
app.get('/api/notifications', async (req, res) => {
    try {
        const notifs = await Notification.findAll({ order: [['createdAt', 'DESC']], limit: 50 });
        res.json({ notifications: notifs });
    } catch(e) { res.json({ notifications: [] }); }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        await Notification.update({ read: true }, { where: { id: req.params.id } });
        res.json({ ok: true });
    } catch(e) { res.json({ ok: false }); }
});

app.delete('/api/notifications/:id', async (req, res) => {
    try {
        await Notification.destroy({ where: { id: req.params.id } });
        res.json({ ok: true });
    } catch(e) { res.json({ ok: false }); }
});

app.delete('/api/notifications/all', async (req, res) => {
    try {
        await Notification.destroy({ where: {} });
        res.json({ ok: true });
    } catch(e) { res.json({ ok: false }); }
});

// ===== ROUTES =====
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

// ===== 404 =====
app.use((req, res) => {
    res.status(404).render('404');
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🚀 Serveur YURA GUARDIAN démarré!');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📍 Tailscale: http://100.101.144.123:${PORT}`);
    console.log(`📷 Camera RPI: http://100.90.80.29:5000`);
    console.log('='.repeat(50));
});

// ===== SHUTDOWN =====
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt serveur...');
    process.exit(0);
});