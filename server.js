const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();
require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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

const indexRouter = require('./routes/index');
app.use('/', indexRouter);

app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - YURA GUARDIAN</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #5c1f1f 0%, #3d1414 100%); color: white; text-align: center; }
                h1 { font-size: 5rem; margin: 0; }
                h2 { font-size: 2rem; }
                a { color: white; background: #2563eb; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div>
                <h1>404</h1>
                <h2>Page non trouvée</h2>
                <a href="/">Retour à l'accueil</a>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 Serveur YURA GUARDIAN démarré!');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(50));
});

process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du serveur...');
    process.exit(0);
});
