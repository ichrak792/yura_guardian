# 🛡️ YURA GUARDIAN - Guide d'installation

## Prérequis
- Node.js v16+
- MongoDB (local ou Atlas)
- npm

## Installation rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la base de données (modifier .env si nécessaire)
# Par défaut: mongodb://localhost:27017/yura-guardian

# 3. Initialiser la base de données avec les utilisateurs de test
node seed.js

# 4. Démarrer le serveur
npm start
# → http://localhost:3000
```

## Comptes de test

| Rôle | Identifiant | Email | Mot de passe |
|------|-------------|-------|--------------|
| Admin | `admin` | `admin@yura.com` | `admin123` |
| Sécurité | `agent1` | `agent1@yura.com` | `agent123` |

## Pages disponibles

### 👑 Dashboard Admin (`/admin/users`)
- **Utilisateurs** - Liste, ajout, suppression, activation/désactivation
- **Caméra** - Flux vidéo en direct (via navigateur)
- **Map** - Carte OpenStreetMap avec position du robot
- **Position** - Contrôle robot + caméra mini + carte mini
- **Historique** - Journal de toutes les actions

### 🤖 Dashboard Sécurité (`/dashboard/security`)
- **Dashboard** - Vue complète: batterie, contrôles robot, caméra, environnement, historique, carte
- **History** - Historique détaillé (timeline)
- **Camera** - Flux caméra dédié
- **Map** - Carte dédiée

## Contrôles robot (clavier)
- ↑ Forward | ↓ Backward | ← Left | → Right | Espace: STOP

## Structure du projet
```
yura-guardian/
├── server.js           # Serveur Express
├── db.js               # Config MongoDB + Schemas
├── seed.js             # Données de test
├── routes/
│   └── index.js        # Toutes les routes
├── views/
│   ├── home.ejs
│   ├── signin.ejs
│   ├── admin/          # 5 pages admin
│   ├── security/       # 4 pages sécurité
│   └── partials/
├── public/
│   ├── css/            # home.css, signin.css, admin.css, security.css
│   └── images/         # Logo YURA GUARDIAN
└── .env                # Configuration
```

## Technologies
- **Backend**: Node.js, Express.js, EJS
- **Database**: MongoDB + Mongoose
- **Maps**: Leaflet.js + OpenStreetMap (gratuit, pas de clé API)
- **Auth**: express-session
