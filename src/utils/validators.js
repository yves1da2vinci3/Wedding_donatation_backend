const { body } = require('express-validator');

// Validateurs pour l'authentification
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Le mot de passe actuel est requis'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre')
];

const validateUpdateProfile = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Numéro de téléphone invalide'),
  body('settings.emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications email doivent être vraies ou fausses'),
  body('settings.smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications SMS doivent être vraies ou fausses'),
  body('settings.autoExport')
    .optional()
    .isBoolean()
    .withMessage('L\'export automatique doit être vrai ou faux')
];

// Validateurs pour les donations
const validateDonation = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Le montant doit être supérieur à 0'),
  body('donor')
    .isLength({ min: 2, max: 200 })
    .withMessage('Le nom du donateur doit contenir entre 2 et 200 caractères'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('paymentMethod')
    .isIn(['Wave', 'OM', 'MTN Momo', 'Moov', 'Visa Mastercard'])
    .withMessage('Méthode de paiement invalide'),
  body('option')
    .isIn(['Option A', 'Option B', 'Option C'])
    .withMessage('Option invalide'),
  body('anonymous')
    .optional()
    .isBoolean()
    .withMessage('Le champ anonyme doit être vrai ou faux'),
  body('message')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Le message ne peut pas dépasser 1000 caractères')
];

const validateUpdateDonation = [
  body('amount')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Le montant doit être supérieur à 0'),
  body('donor')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Le nom du donateur doit contenir entre 2 et 200 caractères'),
  body('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Statut invalide'),
  body('message')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Le message ne peut pas dépasser 1000 caractères')
];

// Validateurs pour les enveloppes
const validateEnvelope = [
  body('title')
    .isLength({ min: 2, max: 100 })
    .withMessage('Le titre doit contenir entre 2 et 100 caractères'),
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Le montant doit être supérieur à 0'),
  body('description')
    .isLength({ min: 10, max: 500 })
    .withMessage('La description doit contenir entre 10 et 500 caractères'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Le statut actif doit être vrai ou faux'),
  body('maxUsage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('La limite d\'utilisation doit être un nombre positif'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('La couleur doit être un code hexadécimal valide')
];

const validateUpdateEnvelope = [
  body('title')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le titre doit contenir entre 2 et 100 caractères'),
  body('amount')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Le montant doit être supérieur à 0'),
  body('description')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('La description doit contenir entre 10 et 500 caractères'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Le statut actif doit être vrai ou faux'),
  body('maxUsage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('La limite d\'utilisation doit être un nombre positif')
];

module.exports = {
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
  validateDonation,
  validateUpdateDonation,
  validateEnvelope,
  validateUpdateEnvelope
};