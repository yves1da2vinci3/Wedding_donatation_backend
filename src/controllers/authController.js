const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const RefreshToken = require('../models/RefreshToken');
const config = require('../config/config');
const { 
  createTokenPair, 
  renewTokens, 
  revokeRefreshToken, 
  revokeAllRefreshTokens,
  getActiveTokensInfo,
} = require('../utils/tokenUtils');

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

   console.log("🚀 ~ login ~ req.body:", req.body)

    // Vérifier si l'admin existe
    const admin = await Admin.findOne({ email }).select('+password');
    // console.log("🚀 ~ login ~ admin:", admin)
    
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

    // Créer les tokens (access + refresh)
    const tokenOptions = {
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip || req.connection.remoteAddress || ''
    };

    const tokens = await createTokenPair(admin, tokenOptions);

    // Réponse de succès
    res.json({
      message: 'Connexion réussie',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: tokens.tokenType,
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

// @desc    Renouveler les tokens avec un refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshTokens = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        message: 'Refresh token requis'
      });
    }

    // Options pour le nouveau token
    const tokenOptions = {
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip || req.connection.remoteAddress || ''
    };

    // Renouveler les tokens
    const result = await renewTokens(refreshToken, tokenOptions);

    res.json({
      message: 'Tokens renouvelés avec succès',
      token: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: config.jwt.expiresIn || '15m',
      tokenType: 'Bearer',
      admin: result.admin
    });

  } catch (error) {
    console.error('Erreur renouvellement tokens:', error);
    res.status(401).json({
      message: 'Échec du renouvellement des tokens',
      error: error.message
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
    const refreshToken = req.body.refreshToken;
    
    // Révoquer le refresh token spécifique s'il est fourni
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    // Révoquer tous les tokens de l'admin connecté pour une déconnexion complète
    await revokeAllRefreshTokens(req.admin.id);

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

// @desc    Logout de tous les appareils
// @route   POST /api/auth/logout-all
// @access  Private
const logoutAll = async (req, res) => {
  try {
    // Révoquer tous les refresh tokens de l'admin
    await revokeAllRefreshTokens(req.admin.id);

    res.json({
      message: 'Déconnexion de tous les appareils réussie'
    });

  } catch (error) {
    console.error('Erreur déconnexion globale:', error);
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

    const { currentPassword, newPassword, revokeAllTokens = true } = req.body;
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

    // Révoquer tous les refresh tokens pour forcer une nouvelle connexion
    if (revokeAllTokens) {
      await revokeAllRefreshTokens(admin._id);
    }

    res.json({
      message: 'Mot de passe modifié avec succès',
      tokensRevoked: revokeAllTokens
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

// @desc    Obtenir les tokens actifs de l'admin
// @route   GET /api/auth/tokens
// @access  Private
const getActiveTokens = async (req, res) => {
  try {
    const tokens = await getActiveTokensInfo(req.admin.id);

    res.json({
      message: 'Tokens actifs récupérés',
      tokens,
      count: tokens.length
    });

  } catch (error) {
    console.error('Erreur récupération tokens:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// @desc    Révoquer un token spécifique
// @route   DELETE /api/auth/tokens/:tokenId
// @access  Private
const revokeToken = async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Trouver et révoquer le token s'il appartient à l'admin connecté
    const token = await RefreshToken.findOne({
      _id: tokenId,
      admin: req.admin.id,
      isRevoked: false
    });

    if (!token) {
      return res.status(404).json({
        message: 'Token non trouvé ou déjà révoqué'
      });
    }

    await token.revoke();

    res.json({
      message: 'Token révoqué avec succès'
    });

  } catch (error) {
    console.error('Erreur révocation token:', error);
    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

module.exports = {
  login,
  refreshTokens,
  getMe,
  logout,
  logoutAll,
  changePassword,
  updateProfile,
  getActiveTokens,
  revokeToken
};