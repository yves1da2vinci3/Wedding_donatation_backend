const express = require('express');
const router = express.Router();

const {
  getSettings,
  updateSettings,
  resetSettings,
  getAdminStats
} = require('../controllers/settingsController');

const { authenticate } = require('../middleware/auth');
const { validateUpdateProfile } = require('../utils/validators');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// @route   GET /api/settings
// @desc    Obtenir les paramètres de l'admin connecté
// @access  Private
router.get('/', getSettings);

// @route   PUT /api/settings
// @desc    Mettre à jour les paramètres de l'admin
// @access  Private
router.put('/', validateUpdateProfile, updateSettings);

// @route   POST /api/settings/reset
// @desc    Réinitialiser les paramètres par défaut
// @access  Private
router.post('/reset', resetSettings);

// @route   GET /api/settings/admin-stats
// @desc    Obtenir les statistiques de l'admin
// @access  Private
router.get('/admin-stats', getAdminStats);

module.exports = router;