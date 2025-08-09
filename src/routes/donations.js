const express = require('express');
const router = express.Router();

const {
  getDonations,
  getDonationById,
  getDonationByReference,
  createDonation,
  updateDonation,
  deleteDonation,
  exportDonationsCSV
} = require('../controllers/donationController');

const { authenticate } = require('../middleware/auth');
const {
  validateDonation,
  validateUpdateDonation
} = require('../utils/validators');

// Routes publiques (sans authentification)
router.get('/by-reference/:reference', getDonationByReference);

// Routes protégées (avec authentification)
router.use(authenticate);

// @route   GET /api/donations/export/csv
// @desc    Exporter les donations en CSV
// @access  Private
router.get('/export/csv', exportDonationsCSV);

// @route   GET /api/donations
// @desc    Obtenir toutes les donations avec filtres
// @access  Private
router.get('/', getDonations);



// @route   GET /api/donations/:id
// @desc    Obtenir une donation par ID
// @access  Private
router.get('/:id', getDonationById);

// @route   POST /api/donations
// @desc    Créer une nouvelle donation
// @access  Private
router.post('/', validateDonation, createDonation);

// @route   PUT /api/donations/:id
// @desc    Mettre à jour une donation
// @access  Private
router.put('/:id', validateUpdateDonation, updateDonation);

// @route   DELETE /api/donations/:id
// @desc    Supprimer une donation
// @access  Private
router.delete('/:id', deleteDonation);

module.exports = router;