# Wedding Donation Backend

Backend API pour la plateforme de dons de mariage.

## Configuration

Créer un fichier `.env` à la racine du backend avec le contenu suivant :

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/wedding_donation
MONGODB_TEST_URI=mongodb://localhost:27017/wedding_donation_test

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=wedding_donation_super_secret_jwt_key_2024
JWT_EXPIRES_IN=7d

# Admin Default Credentials
ADMIN_EMAIL=admin@wedding.com
ADMIN_PASSWORD=admin123456

# CORS Origins
CORS_ORIGIN=http://localhost:3000
```

## Installation

```bash
npm install
```

## Démarrage

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## API Endpoints

### Authentification
- POST `/api/auth/login` - Connexion admin
- POST `/api/auth/logout` - Déconnexion
- GET `/api/auth/me` - Profil admin actuel

### Dashboard
- GET `/api/dashboard/stats` - Statistiques du dashboard

### Donations
- GET `/api/donations` - Liste des donations (avec filtres)
- POST `/api/donations` - Créer une donation
- PUT `/api/donations/:id` - Modifier une donation
- DELETE `/api/donations/:id` - Supprimer une donation

### Enveloppes
- GET `/api/envelopes` - Liste des enveloppes
- POST `/api/envelopes` - Créer une enveloppe
- PUT `/api/envelopes/:id` - Modifier une enveloppe
- DELETE `/api/envelopes/:id` - Supprimer une enveloppe

### Paramètres
- GET `/api/settings` - Paramètres admin
- PUT `/api/settings` - Modifier les paramètres