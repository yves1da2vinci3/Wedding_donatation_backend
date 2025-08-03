const Donation = require('../models/Donation');
const Envelope = require('../models/Envelope');
const Admin = require('../models/Admin');

// @desc    Obtenir les statistiques du dashboard
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculer la date de début selon la période
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // 1. Statistiques générales des donations
    const donationStats = await Donation.aggregate([
      {
        $facet: {
          // Statistiques totales
          total: [
            {
              $group: {
                _id: null,
                totalAmount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                totalDonations: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
                pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                averageAmount: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', null] } }
              }
            }
          ],
          // Statistiques de la période
          period: [
            { $match: { createdAt: { $gte: startDate } } },
            {
              $group: {
                _id: null,
                periodAmount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                periodDonations: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
              }
            }
          ],
          // Répartition par méthode de paiement
          paymentMethods: [
            { $match: { status: 'completed' } },
            {
              $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            },
            { $sort: { amount: -1 } }
          ],
          // Répartition par option
          options: [
            { $match: { status: 'completed' } },
            {
              $group: {
                _id: '$option',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            }
          ]
        }
      }
    ]);

    // 2. Donations récentes (10 dernières)
    const recentDonations = await Donation.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('envelope', 'title amount')
      .select('reference amount donor date time anonymous message paymentMethod');

    // 3. Statistiques des enveloppes
    const envelopeStats = await Envelope.aggregate([
      {
        $group: {
          _id: null,
          totalEnvelopes: { $sum: 1 },
          activeEnvelopes: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalUsage: { $sum: '$usageCount' }
        }
      }
    ]);

    // 4. Enveloppes populaires
    const popularEnvelopes = await Envelope.find({ isActive: true })
      .sort({ usageCount: -1 })
      .limit(5)
      .select('title amount usageCount');

    // 5. Évolution des donations par jour (derniers 30 jours)
    const donationTrends = await Donation.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          dailyAmount: { $sum: '$amount' },
          dailyCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          amount: '$dailyAmount',
          count: '$dailyCount'
        }
      }
    ]);

    // 6. Statistiques des donateurs
    const donorStats = await Donation.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$email',
          totalAmount: { $sum: '$amount' },
          donationCount: { $sum: 1 },
          donor: { $first: '$donor' },
          anonymous: { $first: '$anonymous' }
        }
      },
      {
        $group: {
          _id: null,
          uniqueDonors: { $sum: 1 },
          repeatDonors: { $sum: { $cond: [{ $gt: ['$donationCount', 1] }, 1, 0] } },
          anonymousDonors: { $sum: { $cond: ['$anonymous', 1, 0] } }
        }
      }
    ]);

    // 7. Top donateurs
    const topDonors = await Donation.aggregate([
      { $match: { status: 'completed', anonymous: false } },
      {
        $group: {
          _id: '$email',
          totalAmount: { $sum: '$amount' },
          donationCount: { $sum: 1 },
          donor: { $first: '$donor' },
          lastDonation: { $max: '$createdAt' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // Formater la réponse
    const stats = donationStats[0];
    
    res.json({
      summary: {
        totalAmount: stats.total[0]?.totalAmount || 0,
        totalDonations: stats.total[0]?.totalDonations || 0,
        averageAmount: Math.round(stats.total[0]?.averageAmount || 0),
        pendingAmount: stats.total[0]?.pendingAmount || 0,
        pendingCount: stats.total[0]?.pendingCount || 0,
        periodAmount: stats.period[0]?.periodAmount || 0,
        periodDonations: stats.period[0]?.periodDonations || 0
      },
      envelopes: {
        total: envelopeStats[0]?.totalEnvelopes || 0,
        active: envelopeStats[0]?.activeEnvelopes || 0,
        totalUsage: envelopeStats[0]?.totalUsage || 0,
        popular: popularEnvelopes
      },
      donors: {
        unique: donorStats[0]?.uniqueDonors || 0,
        repeat: donorStats[0]?.repeatDonors || 0,
        anonymous: donorStats[0]?.anonymousDonors || 0,
        top: topDonors
      },
      distributions: {
        paymentMethods: stats.paymentMethods || [],
        options: stats.options || []
      },
      recentDonations,
      trends: donationTrends
    });

  } catch (error) {
    console.error('Erreur récupération statistiques dashboard:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Obtenir un aperçu rapide des statistiques
// @route   GET /api/dashboard/overview
// @access  Private
const getDashboardOverview = async (req, res) => {
  try {
    // Statistiques de base
    const [totalDonations, totalEnvelopes, totalAmount, recentDonationCount] = await Promise.all([
      Donation.countDocuments({ status: 'completed' }),
      Envelope.countDocuments({ isActive: true }),
      Donation.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Donation.countDocuments({
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      totalDonations,
      totalEnvelopes,
      totalAmount: totalAmount[0]?.total || 0,
      recentDonationCount
    });

  } catch (error) {
    console.error('Erreur récupération aperçu dashboard:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

module.exports = {
  getDashboardStats,
  getDashboardOverview
};