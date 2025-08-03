const Donation = require('../models/Donation');
const Envelope = require('../models/Envelope');

// Créer des données de test
const seedData = async () => {
  try {
    console.log('🌱 Création des données de test...');

    // Vérifier si des données existent déjà
    const existingDonations = await Donation.countDocuments();
    const existingEnvelopes = await Envelope.countDocuments();

    if (existingDonations > 0 || existingEnvelopes > 0) {
      console.log('📊 Des données existent déjà. Pas de création automatique.');
      return;
    }

    // Créer des enveloppes de test
    const envelopes = [
      {
        title: 'Petit Don',
        amount: 50,
        description: 'Un petit geste qui compte énormément pour nous',
        color: '#10b981',
        icon: 'Mail',
        isActive: true,
        sortOrder: 1
      },
      {
        title: 'Don Standard',
        amount: 100,
        description: 'Votre participation nous fait très plaisir',
        color: '#3b82f6',
        icon: 'Mail',
        isActive: true,
        sortOrder: 2
      },
      {
        title: 'Don Généreux',
        amount: 200,
        description: 'Un don généreux pour notre nouveau départ',
        color: '#8b5cf6',
        icon: 'Mail',
        isActive: true,
        sortOrder: 3
      },
      {
        title: 'Don Exceptionnel',
        amount: 500,
        description: 'Une contribution exceptionnelle à notre bonheur',
        color: '#f59e0b',
        icon: 'Mail',
        isActive: true,
        sortOrder: 4
      }
    ];

    const createdEnvelopes = await Envelope.insertMany(envelopes);
    console.log(`✅ ${createdEnvelopes.length} enveloppes créées`);

    // Créer des donations de test
    const donations = [
      {
        amount: 150,
        donor: 'Marie Laurent',
        email: 'marie.laurent@email.com',
        paymentMethod: 'Wave',
        option: 'Option A',
        status: 'completed',
        anonymous: false,
        message: 'Félicitations pour votre union !',
        envelope: createdEnvelopes[1]._id, // Don Standard
        date: new Date('2024-01-15'),
        time: '14:30'
      },
      {
        amount: 75,
        donor: 'Donation Anonyme',
        email: 'anonyme@system.com',
        paymentMethod: 'MTN Momo',
        option: 'Option B',
        status: 'completed',
        anonymous: true,
        message: '',
        envelope: createdEnvelopes[0]._id, // Petit Don
        date: new Date('2024-01-15'),
        time: '12:15'
      },
      {
        amount: 200,
        donor: 'Pierre Martin',
        email: 'pierre.martin@email.com',
        paymentMethod: 'Visa Mastercard',
        option: 'Option A',
        status: 'completed',
        anonymous: false,
        message: 'Avec toute mon amitié',
        envelope: createdEnvelopes[2]._id, // Don Généreux
        date: new Date('2024-01-14'),
        time: '16:45'
      },
      {
        amount: 100,
        donor: 'Sophie Rodriguez',
        email: 'sophie.r@email.com',
        paymentMethod: 'OM',
        option: 'Option C',
        status: 'pending',
        anonymous: false,
        message: 'Que le bonheur vous accompagne',
        envelope: createdEnvelopes[1]._id, // Don Standard
        date: new Date('2024-01-14'),
        time: '10:20'
      },
      {
        amount: 300,
        donor: 'Donation Anonyme',
        email: 'anonyme@system.com',
        paymentMethod: 'Moov',
        option: 'Option B',
        status: 'completed',
        anonymous: true,
        message: '',
        envelope: createdEnvelopes[2]._id, // Don Généreux
        date: new Date('2024-01-13'),
        time: '18:00'
      },
      {
        amount: 500,
        donor: 'Jean Dupont',
        email: 'jean.dupont@email.com',
        paymentMethod: 'Wave',
        option: 'Option A',
        status: 'completed',
        anonymous: false,
        message: 'Pour votre bonheur éternel',
        envelope: createdEnvelopes[3]._id, // Don Exceptionnel
        date: new Date('2024-01-12'),
        time: '20:15'
      }
    ];

    const createdDonations = await Donation.insertMany(donations);
    console.log(`✅ ${createdDonations.length} donations créées`);

    // Mettre à jour les compteurs d'utilisation des enveloppes
    for (const envelope of createdEnvelopes) {
      const usageCount = donations.filter(d => 
        d.envelope.toString() === envelope._id.toString() && d.status === 'completed'
      ).length;
      
      await Envelope.findByIdAndUpdate(envelope._id, { usageCount });
    }

    console.log('✅ Compteurs d\'enveloppes mis à jour');
    console.log('🎉 Données de test créées avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error);
  }
};

module.exports = { seedData };