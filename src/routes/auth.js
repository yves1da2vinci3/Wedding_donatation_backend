const express = require('express');
const router = express.Router();

const {
  login,
  getMe,
  logout,
  changePassword,
  updateProfile
} = require('../controllers/authController');

const { authenticate } = require('../middleware/auth');
const {
  validateLogin,
  validateChangePassword,
  validateUpdateProfile
} = require('../utils/validators');

// @route   POST /api/auth/login
// @desc    Login administrateur
// @access  Public
router.post('/login', validateLogin, login);

// @route   GET /api/auth/me
// @desc    Obtenir le profil de l'admin connecté
// @access  Private
router.get('/me', authenticate, getMe);

// @route   POST /api/auth/logout
// @desc    Logout administrateur
// @access  Private
router.post('/logout', authenticate, logout);

// @route   PUT /api/auth/change-password
// @desc    Changer le mot de passe
// @access  Private
router.put('/change-password', authenticate, validateChangePassword, changePassword);

// @route   PUT /api/auth/profile
// @desc    Mettre à jour le profil admin
// @access  Private
router.put('/profile', authenticate, validateUpdateProfile, updateProfile);

module.exports = router;