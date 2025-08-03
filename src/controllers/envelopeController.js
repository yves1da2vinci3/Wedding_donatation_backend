const { validationResult } = require('express-validator');
const Envelope = require('../models/Envelope');
const Donation = require('../models/Donation');

// @desc    Obtenir toutes les enveloppes
// @route   GET /api/envelopes
// @access  Private
const getEnvelopes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      isActive,
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = req.query;

    // Construire le filtre
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Exécuter la requête
    const envelopes = await Envelope.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Compter le total pour la pagination
    const total = await Envelope.countDocuments(filter);

    // Obtenir les statistiques
    const stats = await Envelope.getEnvelopeStats();

    res.json({
      envelopes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      stats: stats.length > 0 ? stats[0] : {
        totalEnvelopes: 0,
        activeEnvelopes: 0,
        totalUsage: 0,
        averageAmount: 0
      }
    });

  } catch (error) {
    console.error('Erreur récupération enveloppes:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Obtenir une enveloppe par ID
// @route   GET /api/envelopes/:id
// @access  Private
const getEnvelopeById = async (req, res) => {
  try {
    const envelope = await Envelope.findById(req.params.id);

    if (!envelope) {
      return res.status(404).json({
        message: 'Enveloppe non trouvée'
      });
    }

    // Obtenir les donations liées à cette enveloppe
    const donations = await Donation.find({ envelope: envelope._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('amount donor date status reference');

    res.json({
      envelope,
      recentDonations: donations
    });

  } catch (error) {
    console.error('Erreur récupération enveloppe:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Créer une nouvelle enveloppe
// @route   POST /api/envelopes
// @access  Private
const createEnvelope = async (req, res) => {
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
      title,
      amount,
      description,
      isActive = true,
      color = '#10b981',
      icon = 'Mail',
      maxUsage,
      expiresAt
    } = req.body;

    // Vérifier si une enveloppe avec le même titre existe déjà
    const existingEnvelope = await Envelope.findOne({ title });
    if (existingEnvelope) {
      return res.status(400).json({
        message: 'Une enveloppe avec ce titre existe déjà'
      });
    }

    // Créer l'enveloppe
    const envelope = new Envelope({
      title,
      amount,
      description,
      isActive,
      color,
      icon,
      maxUsage,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    await envelope.save();

    res.status(201).json({
      message: 'Enveloppe créée avec succès',
      envelope
    });

  } catch (error) {
    console.error('Erreur création enveloppe:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Mettre à jour une enveloppe
// @route   PUT /api/envelopes/:id
// @access  Private
const updateEnvelope = async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const envelope = await Envelope.findById(req.params.id);
    
    if (!envelope) {
      return res.status(404).json({
        message: 'Enveloppe non trouvée'
      });
    }

    const {
      title,
      amount,
      description,
      isActive,
      color,
      icon,
      maxUsage,
      expiresAt,
      sortOrder
    } = req.body;

    // Vérifier si le nouveau titre existe déjà (si modifié)
    if (title && title !== envelope.title) {
      const existingEnvelope = await Envelope.findOne({ title });
      if (existingEnvelope) {
        return res.status(400).json({
          message: 'Une enveloppe avec ce titre existe déjà'
        });
      }
    }

    // Mettre à jour les champs
    if (title !== undefined) envelope.title = title;
    if (amount !== undefined) envelope.amount = amount;
    if (description !== undefined) envelope.description = description;
    if (isActive !== undefined) envelope.isActive = isActive;
    if (color !== undefined) envelope.color = color;
    if (icon !== undefined) envelope.icon = icon;
    if (maxUsage !== undefined) envelope.maxUsage = maxUsage;
    if (expiresAt !== undefined) envelope.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (sortOrder !== undefined) envelope.sortOrder = sortOrder;

    await envelope.save();

    res.json({
      message: 'Enveloppe mise à jour avec succès',
      envelope
    });

  } catch (error) {
    console.error('Erreur mise à jour enveloppe:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Supprimer une enveloppe
// @route   DELETE /api/envelopes/:id
// @access  Private
const deleteEnvelope = async (req, res) => {
  try {
    const envelope = await Envelope.findById(req.params.id);
    
    if (!envelope) {
      return res.status(404).json({
        message: 'Enveloppe non trouvée'
      });
    }

    // Vérifier s'il y a des donations liées à cette enveloppe
    const donationCount = await Donation.countDocuments({ envelope: envelope._id });
    
    if (donationCount > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer cette enveloppe car elle est utilisée dans ${donationCount} donation(s). Vous pouvez la désactiver à la place.`
      });
    }

    await Envelope.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Enveloppe supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression enveloppe:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Obtenir les enveloppes actives (pour le frontend public)
// @route   GET /api/envelopes/active
// @access  Public
const getActiveEnvelopes = async (req, res) => {
  try {
    const envelopes = await Envelope.getActiveEnvelopes();
    
    // Filtrer les enveloppes disponibles
    const availableEnvelopes = envelopes.filter(envelope => envelope.isAvailable);

    res.json({
      envelopes: availableEnvelopes
    });

  } catch (error) {
    console.error('Erreur récupération enveloppes actives:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Obtenir les enveloppes populaires
// @route   GET /api/envelopes/popular
// @access  Private
const getPopularEnvelopes = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const envelopes = await Envelope.getPopularEnvelopes(parseInt(limit));

    res.json({
      envelopes
    });

  } catch (error) {
    console.error('Erreur récupération enveloppes populaires:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Dupliquer une enveloppe
// @route   POST /api/envelopes/:id/duplicate
// @access  Private
const duplicateEnvelope = async (req, res) => {
  try {
    const originalEnvelope = await Envelope.findById(req.params.id);
    
    if (!originalEnvelope) {
      return res.status(404).json({
        message: 'Enveloppe non trouvée'
      });
    }

    // Créer une copie avec un nouveau titre
    const duplicatedEnvelope = new Envelope({
      title: `${originalEnvelope.title} (Copie)`,
      amount: originalEnvelope.amount,
      description: originalEnvelope.description,
      color: originalEnvelope.color,
      icon: originalEnvelope.icon,
      maxUsage: originalEnvelope.maxUsage,
      isActive: false // Par défaut désactivée
    });

    await duplicatedEnvelope.save();

    res.status(201).json({
      message: 'Enveloppe dupliquée avec succès',
      envelope: duplicatedEnvelope
    });

  } catch (error) {
    console.error('Erreur duplication enveloppe:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

module.exports = {
  getEnvelopes,
  getEnvelopeById,
  createEnvelope,
  updateEnvelope,
  deleteEnvelope,
  getActiveEnvelopes,
  getPopularEnvelopes,
  duplicateEnvelope
};