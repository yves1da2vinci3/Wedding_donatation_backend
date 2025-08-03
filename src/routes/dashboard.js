const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getDashboardOverview
} = require('../controllers/dashboardController');

const { authenticate } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// @route   GET /api/dashboard/stats
// @desc    Obtenir les statistiques du dashboard
// @access  Private
router.get('/stats', getDashboardStats);

// @route   GET /api/dashboard/overview
// @desc    Obtenir un aperçu rapide des statistiques
// @access  Private
router.get('/overview', getDashboardOverview);

module.exports = router;