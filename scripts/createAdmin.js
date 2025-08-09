#!/usr/bin/env node

/**
 * Script pour créer l'administrateur par défaut
 * Usage: npm run create-admin
 */

const mongoose = require('mongoose');
const { createDefaultAdmin } = require('../src/utils/seedData');
const config = require('../src/config/config');

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.blue}🚀 ${msg}${colors.reset}`)
};

async function main() {
  try {
    log.title('Création de l\'administrateur par défaut');
    
    // Vérifier la configuration
    if (!config.mongodb?.uri) {
      throw new Error('Configuration MongoDB manquante. Vérifiez votre fichier .env et la variable MONGODB_URI');
    }
    
    log.info(`Connexion à la base de données: ${config.mongodb.uri}`);

    // Connexion à MongoDB
    await mongoose.connect(config.mongodb.uri);

    log.success('Connexion à la base de données établie');

    // Créer l'admin par défaut
    await createDefaultAdmin();

    log.success('Script terminé avec succès');
    log.info('Informations de connexion par défaut:');
    console.log(`   📧 Email: ${colors.bright}admin@wedding-donation.com${colors.reset}`);
    console.log(`   🔐 Mot de passe: ${colors.bright}Admin123!${colors.reset}`);
    console.log(`   👤 Rôle: ${colors.bright}super_admin${colors.reset}`);

  } catch (error) {
    log.error(`Erreur lors de l'exécution du script: ${error.message}`);
    process.exit(1);
  } finally {
    // Fermer la connexion
    await mongoose.connection.close();
    log.info('Connexion fermée');
    process.exit(0);
  }
}

// Gestion des signaux pour une fermeture propre
process.on('SIGINT', async () => {
  log.warning('Interruption détectée, fermeture...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.warning('Terminaison détectée, fermeture...');
  await mongoose.connection.close();
  process.exit(0);
});

// Exécuter le script
main();
