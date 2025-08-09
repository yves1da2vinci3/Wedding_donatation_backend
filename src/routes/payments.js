const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const webhookMiddleware = require('../middleware/webhookMiddleware');

/**
 * Payment routes for handling various payment methods
 */

// Initialize bank payment
router.post('/bank/initialize', paymentController.initializeBankPayment);

// Initialize mobile money payment
router.post('/mobile-money/initialize', paymentController.initializeMobileMoneyPayment);

// Submit OTP for Orange payments
router.post('/mobile-money/submit-otp', paymentController.submitMobileMoneyOtp);

// Verify payment
router.get('/verify/:reference', paymentController.verifyPayment);

// Webhook for payment completion (with special middleware for signature verification)
router.post('/webhook', webhookMiddleware, paymentController.handleWebhook);

// Payment callback from Paystack (for bank payments)
router.get('/callback', paymentController.handleCallback);

module.exports = router;
