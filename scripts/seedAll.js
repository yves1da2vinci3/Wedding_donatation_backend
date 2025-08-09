#!/usr/bin/env node

/**
 * Script pour initialiser toutes les données (admin + données de test)
 * Usage: npm run seed
 */

const mongoose = require('mongoose');
const { createDefaultAdmin, seedData, getDataStats } = require('../src/utils/seedData');
const config = require('../src/config/config');

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.blue}🚀 ${msg}${colors.reset}`),
  subtitle: (msg) => console.log(`${colors.magenta}📋 ${msg}${colors.reset}`)
};

async function main() {
  try {
    log.title('Initialisation complète de la base de données');
    log.info('Connexion à la base de données...');

    // Connexion à MongoDB
    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    log.success('Connexion à la base de données établie');

    // 1. Créer l'admin par défaut
    log.subtitle('Étape 1: Création de l\'administrateur par défaut');
    await createDefaultAdmin();

    // 2. Créer les données de test
    log.subtitle('Étape 2: Création des données de test');
    await seedData();

    // 3. Afficher les statistiques
    log.subtitle('Étape 3: Récapitulatif des données');
    await getDataStats();

    log.success('Initialisation complète terminée avec succès');
    
    console.log(`\n${colors.bright}${colors.green}🎉 Base de données prête à l'emploi !${colors.reset}`);
    console.log(`${colors.cyan}📝 Informations de connexion admin:${colors.reset}`);
    console.log(`   📧 Email: ${colors.bright}admin@wedding-donation.com${colors.reset}`);
    console.log(`   🔐 Mot de passe: ${colors.bright}Admin123!${colors.reset}`);
    console.log(`   👤 Rôle: ${colors.bright}super_admin${colors.reset}`);
    console.log(`\n${colors.yellow}💡 Commandes utiles:${colors.reset}`);
    console.log(`   ${colors.cyan}npm run create-admin${colors.reset} - Créer seulement l'admin`);
    console.log(`   ${colors.cyan}npm run seed${colors.reset} - Initialisation complète`);
    console.log(`   ${colors.cyan}npm run dev${colors.reset} - Démarrer le serveur en mode développement`);

  } catch (error) {
    log.error(`Erreur lors de l'exécution du script: ${error.message}`);
    console.error(error.stack);
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
