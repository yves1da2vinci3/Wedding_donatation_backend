const mongoose = require('mongoose');
const { seedData, createDefaultAdmin, getDataStats } = require('./src/utils/seedData');

// Configuration de la base de données
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding-donation';

async function testSeeders() {
  try {
    console.log('🔗 Connexion à la base de données...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connexion réussie');

    console.log('\n🌱 Test des seeders...');
    
    // Créer l'admin par défaut
    console.log('\n1. Création de l\'admin par défaut...');
    await createDefaultAdmin();
    
    // Créer les données de test
    console.log('\n2. Création des données de test...');
    await seedData();
    
    // Obtenir les statistiques
    console.log('\n3. Statistiques des données...');
    const stats = await getDataStats();
    
    if (stats) {
      console.log('📊 Résultats:');
      console.log(`   - Admins: ${stats.admins}`);
      console.log(`   - Enveloppes: ${stats.envelopes} (${stats.activeEnvelopes} actives)`);
      console.log(`   - Donations: ${stats.donations} (${stats.completedDonations} complétées)`);
    }

    console.log('\n✅ Test des seeders terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test des seeders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnexion de la base de données');
    process.exit(0);
  }
}

// Exécuter le test si le script est appelé directement
if (require.main === module) {
  testSeeders();
}

module.exports = { testSeeders }; 