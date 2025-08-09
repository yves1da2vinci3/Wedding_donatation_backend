# 👤 Configuration Administrateur

## 🚀 **Commandes Disponibles**

### **Créer uniquement l'admin**
```bash
npm run create-admin
```

**Cette commande :**
- ✅ Crée l'administrateur par défaut si il n'existe pas
- ✅ Ne modifie aucune autre donnée
- ✅ Affiche les informations de connexion
- ✅ Fermeture propre de la connexion DB

### **Initialisation complète**
```bash
npm run seed
```

**Cette commande :**
- ✅ Crée l'administrateur par défaut
- ✅ Crée les enveloppes de test (8 enveloppes)
- ✅ Crée les donations de test (50 donations)
- ✅ Affiche les statistiques finales
- ✅ Récapitulatif complet des données

## 📋 **Informations Admin Par Défaut**

| Champ | Valeur |
|-------|---------|
| **Nom** | Administrateur Principal |
| **Email** | `admin@wedding-donation.com` |
| **Mot de passe** | `Admin123!` |
| **Téléphone** | `+225 0701234567` |
| **Rôle** | `super_admin` |
| **Statut** | Actif |

## ⚙️ **Paramètres Par Défaut**

```javascript
{
  emailNotifications: true,
  smsNotifications: false,
  autoExport: true,
  twoFactorAuth: false
}
```

## 🔧 **Utilisation**

### **1. Première Installation**
```bash
# Backend
cd backend
npm install
npm run create-admin

# Frontend Admin
cd ../admin
npm install
npm run dev
```

### **2. Développement avec Données de Test**
```bash
cd backend
npm install
npm run seed  # Crée admin + données de test
npm run dev   # Démarrer le serveur
```

### **3. Connexion Admin**
1. Accéder à `http://localhost:5173` (frontend admin)
2. Utiliser les identifiants par défaut
3. Changer le mot de passe à la première connexion

## 🛡️ **Sécurité**

### **⚠️ IMPORTANT - Production**
- ✅ Changer le mot de passe par défaut immédiatement
- ✅ Configurer un email admin réel
- ✅ Activer la double authentification
- ✅ Utiliser des variables d'environnement pour les secrets

### **Variables d'Environnement Requises**
```env
# .env
MONGODB_URI=mongodb://localhost:27017/wedding_donation
JWT_SECRET=your_super_secret_key_here
PAYSTACK_SECRET_KEY=sk_test_xxxxx
FRONTEND_URL=http://localhost:3000
```

## 🔍 **Dépannage**

### **Erreur "Admin existe déjà"**
```bash
# L'admin existe, pas de problème
ℹ️ Admin par défaut existe déjà
```

### **Erreur de connexion DB**
```bash
# Vérifier MongoDB est démarré
brew services start mongodb/brew/mongodb-community
# ou
sudo systemctl start mongod
```

### **Reset complet**
```javascript
// Supprimer l'admin en DB (MongoDB Compass ou CLI)
db.admins.deleteOne({ email: "admin@wedding-donation.com" })

// Puis relancer
npm run create-admin
```

## 📊 **Logs de Sortie**

### **Succès**
```
🚀 Création de l'administrateur par défaut
ℹ️  Connexion à la base de données...
✅ Connexion à la base de données établie
✅ Admin par défaut créé: admin@wedding-donation.com
✅ Script terminé avec succès
📧 Email: admin@wedding-donation.com
🔐 Mot de passe: Admin123!
👤 Rôle: super_admin
```

### **Admin Existe Déjà**
```
🚀 Création de l'administrateur par défaut
ℹ️  Connexion à la base de données...
✅ Connexion à la base de données établie
ℹ️ Admin par défaut existe déjà
✅ Script terminé avec succès
```

## 🔄 **Workflow Recommandé**

1. **Installation** → `npm run create-admin`
2. **Test Frontend** → Se connecter avec les identifiants
3. **Changer MDP** → Via l'interface admin
4. **Configuration** → Paramètres email/notifications
5. **Production Ready** → Variables d'environnement + SSL

**La commande est maintenant disponible et prête à l'emploi !** 🎉
