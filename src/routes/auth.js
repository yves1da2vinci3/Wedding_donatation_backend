const express = require('express');
const router = express.Router();

const {
  login,
  refreshTokens,
  getMe,
  logout,
  logoutAll,
  changePassword,
  updateProfile,
  getActiveTokens,
  revokeToken
} = require('../controllers/authController');

const { authenticate } = require('../middleware/auth');
const {
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
  validateRefreshToken
} = require('../utils/validators');

// @route   POST /api/auth/login
// @desc    Login administrateur
// @access  Public
router.post('/login', validateLogin, login);

// @route   POST /api/auth/refresh
// @desc    Renouveler les tokens avec un refresh token
// @access  Public
router.post('/refresh', validateRefreshToken, refreshTokens);

// @route   GET /api/auth/me
// @desc    Obtenir le profil de l'admin connecté
// @access  Private
router.get('/me', authenticate, getMe);

// @route   POST /api/auth/logout
// @desc    Logout administrateur (révoque le refresh token)
// @access  Private
router.post('/logout', authenticate, logout);

// @route   POST /api/auth/logout-all
// @desc    Logout de tous les appareils (révoque tous les refresh tokens)
// @access  Private
router.post('/logout-all', authenticate, logoutAll);

// @route   PUT /api/auth/change-password
// @desc    Changer le mot de passe
// @access  Private
router.put('/change-password', authenticate, validateChangePassword, changePassword);

// @route   PUT /api/auth/profile
// @desc    Mettre à jour le profil admin
// @access  Private
router.put('/profile', authenticate, validateUpdateProfile, updateProfile);

// @route   GET /api/auth/tokens
// @desc    Obtenir les tokens actifs de l'admin
// @access  Private
router.get('/tokens', authenticate, getActiveTokens);

// @route   DELETE /api/auth/tokens/:tokenId
// @desc    Révoquer un token spécifique
// @access  Private
router.delete('/tokens/:tokenId', authenticate, revokeToken);

module.exports = router;