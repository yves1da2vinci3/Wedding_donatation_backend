const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');

// Générer un token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Login administrateur
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Vérifier si l'admin existe
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est actif
    if (!admin.isActive) {
      return res.status(401).json({
        message: 'Compte administrateur désactivé'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Mettre à jour la dernière connexion
    admin.lastLogin = new Date();
    await admin.save();

    // Générer le token
    const token = generateToken(admin._id);

    // Réponse de succès
    res.json({
      message: 'Connexion réussie',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Obtenir le profil de l'admin connecté
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    
    if (!admin) {
      return res.status(404).json({
        message: 'Administrateur non trouvé'
      });
    }

    res.json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        settings: admin.settings,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    });

  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Logout administrateur
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Dans une vraie application, on pourrait maintenir une blacklist des tokens
    // ou utiliser une base de données Redis pour gérer les sessions
    
    res.json({
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('Erreur de déconnexion:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Changer le mot de passe
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id).select('+password');

    if (!admin) {
      return res.status(404).json({
        message: 'Administrateur non trouvé'
      });
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe
    admin.password = newPassword;
    await admin.save();

    res.json({
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Mettre à jour le profil admin
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { name, phone, settings } = req.body;
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        message: 'Administrateur non trouvé'
      });
    }

    // Mettre à jour les champs
    if (name) admin.name = name;
    if (phone !== undefined) admin.phone = phone;
    if (settings) {
      admin.settings = { ...admin.settings, ...settings };
    }

    await admin.save();

    res.json({
      message: 'Profil mis à jour avec succès',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        settings: admin.settings,
        updatedAt: admin.updatedAt
      }
    });

  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

module.exports = {
  login,
  getMe,
  logout,
  changePassword,
  updateProfile
};