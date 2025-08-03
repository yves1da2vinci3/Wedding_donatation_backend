const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');

// @desc    Obtenir les paramètres de l'admin connecté
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    
    if (!admin) {
      return res.status(404).json({
        message: 'Administrateur non trouvé'
      });
    }

    res.json({
      settings: {
        profile: {
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role
        },
        preferences: admin.settings,
        security: {
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt,
          isActive: admin.isActive
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération paramètres:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Mettre à jour les paramètres de l'admin
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const admin = await Admin.findById(req.admin.id);
    
    if (!admin) {
      return res.status(404).json({
        message: 'Administrateur non trouvé'
      });
    }

    const {
      name,
      phone,
      emailNotifications,
      smsNotifications,
      autoExport,
      twoFactorAuth
    } = req.body;

    // Mettre à jour le profil
    if (name !== undefined) admin.name = name;
    if (phone !== undefined) admin.phone = phone;

    // Mettre à jour les préférences
    if (emailNotifications !== undefined) admin.settings.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) admin.settings.smsNotifications = smsNotifications;
    if (autoExport !== undefined) admin.settings.autoExport = autoExport;
    if (twoFactorAuth !== undefined) admin.settings.twoFactorAuth = twoFactorAuth;

    await admin.save();

    res.json({
      message: 'Paramètres mis à jour avec succès',
      settings: {
        profile: {
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role
        },
        preferences: admin.settings
      }
    });

  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Réinitialiser les paramètres par défaut
// @route   POST /api/settings/reset
// @access  Private
const resetSettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    
    if (!admin) {
      return res.status(404).json({
        message: 'Administrateur non trouvé'
      });
    }

    // Réinitialiser les paramètres par défaut
    admin.settings = {
      emailNotifications: true,
      smsNotifications: false,
      autoExport: true,
      twoFactorAuth: false
    };

    await admin.save();

    res.json({
      message: 'Paramètres réinitialisés avec succès',
      settings: {
        profile: {
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role
        },
        preferences: admin.settings
      }
    });

  } catch (error) {
    console.error('Erreur réinitialisation paramètres:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Obtenir les statistiques de l'admin
// @route   GET /api/settings/admin-stats
// @access  Private
const getAdminStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    
    if (!admin) {
      return res.status(404).json({
        message: 'Administrateur non trouvé'
      });
    }

    // Calculer depuis quand l'admin est inscrit
    const accountAge = Math.floor((new Date() - admin.createdAt) / (1000 * 60 * 60 * 24));
    
    // Calculer les sessions (basé sur lastLogin)
    const daysSinceLastLogin = admin.lastLogin 
      ? Math.floor((new Date() - admin.lastLogin) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      adminStats: {
        accountAge: accountAge,
        daysSinceLastLogin: daysSinceLastLogin,
        role: admin.role,
        isActive: admin.isActive,
        settingsConfigured: {
          emailNotifications: admin.settings.emailNotifications,
          smsNotifications: admin.settings.smsNotifications,
          autoExport: admin.settings.autoExport,
          twoFactorAuth: admin.settings.twoFactorAuth
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération statistiques admin:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  resetSettings,
  getAdminStats
};