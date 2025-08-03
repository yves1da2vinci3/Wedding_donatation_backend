const Admin = require('../models/Admin');
const Envelope = require('../models/Envelope');
const Donation = require('../models/Donation');
const RefreshToken = require('../models/RefreshToken');

/**
 * Créer l'administrateur par défaut
 */
const createDefaultAdmin = async () => {
  try {
    // Vérifier si un admin existe déjà
    const existingAdmin = await Admin.findOne({ email: 'admin@wedding-donation.com' });
    
    if (!existingAdmin) {
      const defaultAdmin = new Admin({
        name: 'Administrateur Principal',
        email: 'admin@wedding-donation.com',
        password: 'Admin123!',
        phone: '+225 0701234567',
        role: 'super_admin',
        isActive: true,
        settings: {
          emailNotifications: true,
          smsNotifications: false,
          autoExport: true,
          twoFactorAuth: false
        }
      });

      await defaultAdmin.save();
      console.log('✅ Admin par défaut créé:', defaultAdmin.email);
    } else {
      console.log('ℹ️ Admin par défaut existe déjà');
    }
  } catch (error) {
    console.error('❌ Erreur création admin par défaut:', error.message);
  }
};

/**
 * Créer des enveloppes de test
 */
const createTestEnvelopes = async () => {
  try {
    const envelopes = [
      {
        title: 'Don Standard',
        amount: 50,
        description: 'Votre participation nous fait très plaisir et contribue à notre bonheur.',
        isActive: true,
        color: '#10b981',
        icon: 'Mail',
        sortOrder: 1
      },
      {
        title: 'Don Premium',
        amount: 100,
        description: 'Un don généreux qui nous aide à réaliser nos rêves de mariage.',
        isActive: true,
        color: '#3b82f6',
        icon: 'Heart',
        sortOrder: 2
      },
      {
        title: 'Don VIP',
        amount: 200,
        description: 'Votre soutien exceptionnel nous touche profondément. Merci pour votre générosité.',
        isActive: true,
        color: '#8b5cf6',
        icon: 'Star',
        sortOrder: 3
      },
      {
        title: 'Don Célébration',
        amount: 150,
        description: 'Participez à notre célébration et créez des souvenirs inoubliables avec nous.',
        isActive: true,
        color: '#f59e0b',
        icon: 'Gift',
        sortOrder: 4
      },
      {
        title: 'Don Amitié',
        amount: 75,
        description: 'L\'amitié est le plus beau cadeau. Merci de partager ce moment avec nous.',
        isActive: true,
        color: '#ec4899',
        icon: 'Users',
        sortOrder: 5
      },
      {
        title: 'Don Famille',
        amount: 300,
        description: 'Le soutien de notre famille est notre plus grande force. Merci pour votre amour.',
        isActive: true,
        color: '#06b6d4',
        icon: 'Home',
        sortOrder: 6
      },
      {
        title: 'Don Modeste',
        amount: 25,
        description: 'Chaque don, même modeste, compte pour nous. Merci pour votre soutien.',
        isActive: true,
        color: '#84cc16',
        icon: 'Smile',
        sortOrder: 7
      },
      {
        title: 'Don Luxe',
        amount: 500,
        description: 'Votre générosité exceptionnelle nous permet de réaliser nos rêves les plus fous.',
        isActive: false,
        color: '#f97316',
        icon: 'Crown',
        sortOrder: 8
      }
    ];

    let createdCount = 0;
    for (const envelopeData of envelopes) {
      const existingEnvelope = await Envelope.findOne({ title: envelopeData.title });
      if (!existingEnvelope) {
        const envelope = new Envelope(envelopeData);
        await envelope.save();
        console.log(`✅ Enveloppe créée: ${envelope.title}`);
        createdCount++;
      } else {
        console.log(`ℹ️ Enveloppe existe déjà: ${envelopeData.title}`);
      }
    }

    console.log(`✅ ${createdCount} nouvelles enveloppes créées`);
  } catch (error) {
    console.error('❌ Erreur création enveloppes:', error.message);
  }
};

/**
 * Créer des donations de test
 */
const createTestDonations = async () => {
  try {
    // Récupérer les enveloppes existantes
    const envelopes = await Envelope.find({ isActive: true }).limit(5);
    
    if (envelopes.length === 0) {
      console.log('ℹ️ Aucune enveloppe active trouvée pour créer des donations');
      return;
    }

    // Vérifier s'il y a déjà des donations de test
    const existingDonations = await Donation.countDocuments({
      email: { $regex: /@example\.com$/ }
    });

    if (existingDonations > 0) {
      console.log(`ℹ️ ${existingDonations} donations de test existent déjà`);
      return;
    }

    const donors = [
      'Marie Dupont',
      'Jean Martin',
      'Sophie Bernard',
      'Pierre Durand',
      'Anne Moreau',
      'Michel Petit',
      'Isabelle Roux',
      'François Simon',
      'Catherine Michel',
      'Philippe Leroy',
      'Nathalie David',
      'Laurent Bertrand',
      'Valérie Rousseau',
      'Thierry Henry',
      'Sandrine Girard'
    ];

    const messages = [
      'Félicitations pour votre mariage !',
      'Que votre union soit remplie de bonheur.',
      'Meilleurs vœux pour votre nouvelle vie.',
      'Profitez bien de ce moment spécial.',
      'Que l\'amour vous guide toujours.',
      'Bonne chance pour votre avenir ensemble.',
      'Que votre mariage soit magnifique.',
      'Tous nos vœux de bonheur.',
      'Célébrez votre amour avec joie.',
      'Que cette journée soit inoubliable.'
    ];

    const paymentMethods = ['Wave', 'OM', 'MTN Momo', 'Moov', 'Visa Mastercard'];
    const options = ['Option A', 'Option B', 'Option C'];
    const statuses = ['completed', 'pending', 'failed'];

    // Créer 50 donations de test
    for (let i = 0; i < 50; i++) {
      const randomEnvelope = envelopes[Math.floor(Math.random() * envelopes.length)];
      const randomDonor = donors[Math.floor(Math.random() * donors.length)];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      const randomPaymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const randomOption = options[Math.floor(Math.random() * options.length)];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      // Date aléatoire dans les 30 derniers jours
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));

      const donation = new Donation({
        reference: `DON-${String(i + 1).padStart(6, '0')}`, // Ajouter explicitement la référence
        amount: randomEnvelope.amount,
        donor: randomDonor,
        email: `${randomDonor.toLowerCase().replace(' ', '.')}@example.com`,
        date: randomDate,
        time: randomDate.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        status: randomStatus,
        anonymous: Math.random() < 0.1, // 10% de donations anonymes
        message: Math.random() < 0.7 ? randomMessage : '', // 70% avec message
        paymentMethod: randomPaymentMethod,
        option: randomOption,
        envelope: randomEnvelope._id,
        transactionId: `TXN-${String(i + 1).padStart(6, '0')}`,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      await donation.save();

      // Incrémenter le compteur d'utilisation si la donation est complétée
      if (randomStatus === 'completed') {
        await randomEnvelope.incrementUsage();
      }
    }

    console.log('✅ 50 donations de test créées');
  } catch (error) {
    console.error('❌ Erreur création donations:', error.message);
  }
};

/**
 * Nettoyer les données de test (optionnel)
 */
const cleanupTestData = async () => {
  try {
    // Supprimer les donations de test (avec email example.com)
    const deletedDonations = await Donation.deleteMany({
      email: { $regex: /@example\.com$/ }
    });

    // Réinitialiser les compteurs d'utilisation des enveloppes
    await Envelope.updateMany({}, { usageCount: 0 });

    console.log(`✅ ${deletedDonations.deletedCount} donations de test supprimées`);
    console.log('✅ Compteurs d\'utilisation réinitialisés');
  } catch (error) {
    console.error('❌ Erreur nettoyage données:', error.message);
  }
};

/**
 * Fonction principale pour initialiser toutes les données de test
 */
const seedData = async () => {
  console.log('🌱 Début de l\'initialisation des données de test...');
  
  await createTestEnvelopes();
  await createTestDonations();
  
  console.log('✅ Initialisation des données de test terminée');
};

/**
 * Obtenir les statistiques des données
 */
const getDataStats = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    const envelopeCount = await Envelope.countDocuments();
    const donationCount = await Donation.countDocuments();
    const activeEnvelopeCount = await Envelope.countDocuments({ isActive: true });
    const completedDonationCount = await Donation.countDocuments({ status: 'completed' });

    console.log('📊 Statistiques des données:');
    console.log(`   - Admins: ${adminCount}`);
    console.log(`   - Enveloppes: ${envelopeCount} (${activeEnvelopeCount} actives)`);
    console.log(`   - Donations: ${donationCount} (${completedDonationCount} complétées)`);

    return {
      admins: adminCount,
      envelopes: envelopeCount,
      activeEnvelopes: activeEnvelopeCount,
      donations: donationCount,
      completedDonations: completedDonationCount
    };
  } catch (error) {
    console.error('❌ Erreur récupération statistiques:', error.message);
    return null;
  }
};

module.exports = {
  createDefaultAdmin,
  createTestEnvelopes,
  createTestDonations,
  cleanupTestData,
  seedData,
  getDataStats
};
