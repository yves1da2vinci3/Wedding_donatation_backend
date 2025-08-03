const { validationResult } = require('express-validator');
const Donation = require('../models/Donation');
const Envelope = require('../models/Envelope');

// @desc    Obtenir toutes les donations avec filtres
// @route   GET /api/donations
// @access  Private
const getDonations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      paymentMethod,
      option,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construire le filtre
    const filter = {};

    // Filtre par statut
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Filtre par méthode de paiement
    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    // Filtre par option
    if (option && option !== 'all') {
      filter.option = option;
    }

    // Filtre par recherche (nom du donateur ou référence)
    if (search) {
      filter.$or = [
        { donor: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtre par date
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Exécuter la requête
    const donations = await Donation.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('envelope', 'title amount');

    // Compter le total pour la pagination
    const total = await Donation.countDocuments(filter);

    // Calculer les statistiques filtrées
    const stats = await Donation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          completedAmount: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] 
            } 
          },
          averageAmount: { $avg: '$amount' },
          totalCount: { $sum: 1 },
          completedCount: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] 
            } 
          }
        }
      }
    ]);

    res.json({
      donations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      stats: stats.length > 0 ? stats[0] : {
        totalAmount: 0,
        completedAmount: 0,
        averageAmount: 0,
        totalCount: 0,
        completedCount: 0
      }
    });

  } catch (error) {
    console.error('Erreur récupération donations:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Obtenir une donation par ID
// @route   GET /api/donations/:id
// @access  Private
const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('envelope', 'title amount description');

    if (!donation) {
      return res.status(404).json({
        message: 'Donation non trouvée'
      });
    }

    res.json({ donation });

  } catch (error) {
    console.error('Erreur récupération donation:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Créer une nouvelle donation
// @route   POST /api/donations
// @access  Private
const createDonation = async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      amount,
      donor,
      email,
      paymentMethod,
      option,
      anonymous = false,
      message,
      envelope,
      transactionId
    } = req.body;

    // Vérifier si l'enveloppe existe (si fournie)
    let envelopeDoc = null;
    if (envelope) {
      envelopeDoc = await Envelope.findById(envelope);
      if (!envelopeDoc) {
        return res.status(400).json({
          message: 'Enveloppe non trouvée'
        });
      }
    }

    // Créer la donation
    const donation = new Donation({
      amount,
      donor: anonymous ? 'Donation Anonyme' : donor,
      email: anonymous ? 'anonyme@system.com' : email,
      paymentMethod,
      option,
      anonymous,
      message,
      envelope,
      transactionId,
      status: 'completed', // Par défaut complétée pour l'admin
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await donation.save();

    // Incrémenter le compteur d'utilisation de l'enveloppe
    if (envelopeDoc) {
      await envelopeDoc.incrementUsage();
    }

    res.status(201).json({
      message: 'Donation créée avec succès',
      donation
    });

  } catch (error) {
    console.error('Erreur création donation:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Mettre à jour une donation
// @route   PUT /api/donations/:id
// @access  Private
const updateDonation = async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({
        message: 'Donation non trouvée'
      });
    }

    // Champs modifiables
    const {
      amount,
      donor,
      status,
      message,
      transactionId
    } = req.body;

    // Gérer le changement de statut et l'impact sur l'enveloppe
    const oldStatus = donation.status;
    const newStatus = status || donation.status;

    if (amount !== undefined) donation.amount = amount;
    if (donor !== undefined) donation.donor = donor;
    if (status !== undefined) donation.status = status;
    if (message !== undefined) donation.message = message;
    if (transactionId !== undefined) donation.transactionId = transactionId;

    await donation.save();

    // Ajuster le compteur d'utilisation de l'enveloppe si nécessaire
    if (donation.envelope && oldStatus !== newStatus) {
      const envelope = await Envelope.findById(donation.envelope);
      if (envelope) {
        if (oldStatus === 'completed' && newStatus !== 'completed') {
          // Donation annulée ou échouée
          await envelope.decrementUsage();
        } else if (oldStatus !== 'completed' && newStatus === 'completed') {
          // Donation complétée
          await envelope.incrementUsage();
        }
      }
    }

    const updatedDonation = await Donation.findById(req.params.id)
      .populate('envelope', 'title amount');

    res.json({
      message: 'Donation mise à jour avec succès',
      donation: updatedDonation
    });

  } catch (error) {
    console.error('Erreur mise à jour donation:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Supprimer une donation
// @route   DELETE /api/donations/:id
// @access  Private
const deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({
        message: 'Donation non trouvée'
      });
    }

    // Décrémenter le compteur d'utilisation de l'enveloppe si la donation était complétée
    if (donation.envelope && donation.status === 'completed') {
      const envelope = await Envelope.findById(donation.envelope);
      if (envelope) {
        await envelope.decrementUsage();
      }
    }

    await Donation.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Donation supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression donation:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Exporter les donations en CSV
// @route   GET /api/donations/export/csv
// @access  Private
const exportDonationsCSV = async (req, res) => {
  try {
    const { status, paymentMethod, startDate, endDate } = req.query;
    
    // Construire le filtre
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (paymentMethod && paymentMethod !== 'all') filter.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const donations = await Donation.find(filter)
      .sort({ createdAt: -1 })
      .populate('envelope', 'title');

    // Générer le CSV
    const csvHeader = 'Référence,Montant,Donateur,Email,Date,Heure,Statut,Méthode de paiement,Option,Message,Enveloppe,Anonyme\n';
    const csvData = donations.map(donation => {
      return [
        donation.reference,
        donation.amount,
        `"${donation.donor}"`,
        donation.email,
        donation.date.toLocaleDateString('fr-FR'),
        donation.time,
        donation.status,
        `"${donation.paymentMethod}"`,
        donation.option,
        `"${(donation.message || '').replace(/"/g, '""')}"`,
        donation.envelope ? `"${donation.envelope.title}"` : '',
        donation.anonymous ? 'Oui' : 'Non'
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=donations_${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\ufeff' + csv); // BOM pour Excel

  } catch (error) {
    console.error('Erreur export CSV:', error);
    res.status(500).json({
      message: 'Erreur lors de l\'export CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

module.exports = {
  getDonations,
  getDonationById,
  createDonation,
  updateDonation,
  deleteDonation,
  exportDonationsCSV
};