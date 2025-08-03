const express = require('express');
const router = express.Router();

const {
  getEnvelopes,
  getEnvelopeById,
  createEnvelope,
  updateEnvelope,
  deleteEnvelope,
  getActiveEnvelopes,
  getPopularEnvelopes,
  duplicateEnvelope
} = require('../controllers/envelopeController');

const { authenticate, optionalAuth } = require('../middleware/auth');
const {
  validateEnvelope,
  validateUpdateEnvelope
} = require('../utils/validators');

// @route   GET /api/envelopes/active
// @desc    Obtenir les enveloppes actives (pour le frontend public)
// @access  Public
router.get('/active', getActiveEnvelopes);

// @route   GET /api/envelopes/popular
// @desc    Obtenir les enveloppes populaires
// @access  Private
router.get('/popular', authenticate, getPopularEnvelopes);

// Toutes les autres routes nécessitent une authentification
router.use(authenticate);

// @route   GET /api/envelopes
// @desc    Obtenir toutes les enveloppes
// @access  Private
router.get('/', getEnvelopes);

// @route   GET /api/envelopes/:id
// @desc    Obtenir une enveloppe par ID
// @access  Private
router.get('/:id', getEnvelopeById);

// @route   POST /api/envelopes
// @desc    Créer une nouvelle enveloppe
// @access  Private
router.post('/', validateEnvelope, createEnvelope);

// @route   PUT /api/envelopes/:id
// @desc    Mettre à jour une enveloppe
// @access  Private
router.put('/:id', validateUpdateEnvelope, updateEnvelope);

// @route   DELETE /api/envelopes/:id
// @desc    Supprimer une enveloppe
// @access  Private
router.delete('/:id', deleteEnvelope);

// @route   POST /api/envelopes/:id/duplicate
// @desc    Dupliquer une enveloppe
// @access  Private
router.post('/:id/duplicate', duplicateEnvelope);

module.exports = router;