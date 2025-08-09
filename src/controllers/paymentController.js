const paystackService = require('../services/paystackService');
const Donation = require('../models/Donation');
const Envelope = require('../models/Envelope');

/**
 * Payment Controller
 * Handles all payment-related operations using PaystackService
 */

/**
 * Initialize bank payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const initializeBankPayment = async (req, res) => {
    try {
        const { email, amount, currency = 'XOF', donationData, envelopeId } = req.body;

        // Validate required fields
        if (!email || !amount || !envelopeId) {
            return res.status(400).json({
                status: false,
                message: 'Email, amount, and envelopeId are required'
            });
        }

        // Verify envelope exists
        const envelope = await Envelope.findById(envelopeId);
        if (!envelope) {
            return res.status(404).json({
                status: false,
                message: 'Envelope not found'
            });
        }

        // Create callback URL
        const callbackUrl = `${process.env.FRONTEND_URL}/donation?payment_status=callback`;

        // Initialize bank payment with Paystack
        const paymentResult = await paystackService.initializeBankTransaction(
            email,
            amount,
            currency,
            callbackUrl
        );

        if (!paymentResult.status) {
            return res.status(400).json(paymentResult);
        }

        // Store pending donation in database
        const donorName = donationData?.isAnonymous 
            ? 'Donateur Anonyme' 
            : `${donationData?.firstName || ''} ${donationData?.lastName || ''}`.trim() || 'Donateur';
        
        const donationEmail = donationData?.isAnonymous && (!email || email.trim() === '')
            ? 'diomadelacorano@gmail.com'
            : email;

        const pendingDonation = await Donation.create({
            reference: paymentResult.data.reference,
            envelope: envelopeId,
            amount: amount,
            donor: donorName,
            email: donationEmail,
            message: donationData?.message || '',
            anonymous: donationData?.isAnonymous || false,
            paymentMethod: 'Visa Mastercard',
            status: 'pending',
            date: new Date(),
            time: new Date().toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        });

        console.log('Bank payment initialized:', {
            reference: paymentResult.data.reference,
            donationId: pendingDonation._id
        });

        res.json({
            status: true,
            message: 'Bank payment initialized successfully',
            data: {
                authorization_url: paymentResult.data.authorization_url,
                access_code: paymentResult.data.access_code,
                reference: paymentResult.data.reference,
                donationId: pendingDonation._id
            }
        });

    } catch (error) {
        console.error('Bank payment initialization error:', error);
        res.status(500).json({
            status: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Initialize mobile money payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const initializeMobileMoneyPayment = async (req, res) => {
    try {
        const { 
            email, 
            amount, 
            provider, 
            phone, 
            currency = 'XOF', 
            donationData, 
            envelopeId 
        } = req.body;

        // Validate required fields
        if (!email || !amount || !provider || !phone || !envelopeId) {
            return res.status(400).json({
                status: false,
                message: 'Email, amount, provider, phone, and envelopeId are required'
            });
        }

        // Validate provider
        if (!paystackService.validateMobileMoneyProvider(provider)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid mobile money provider. Supported: wave, orange, mtn, moov'
            });
        }

        // Verify envelope exists
        const envelope = await Envelope.findById(envelopeId);
        if (!envelope) {
            return res.status(404).json({
                status: false,
                message: 'Envelope not found'
            });
        }

        // Initialize mobile money payment with Paystack
        const paymentResult = await paystackService.initializeMobileMoneyTransaction(
            amount,
            email,
            provider,
            phone,
            currency
        );

        if (!paymentResult.status) {
            return res.status(400).json(paymentResult);
        }

        // Store pending donation in database
        const donorName = donationData?.isAnonymous 
            ? 'Donateur Anonyme' 
            : `${donationData?.firstName || ''} ${donationData?.lastName || ''}`.trim() || 'Donateur';
        
        const donationEmail = donationData?.isAnonymous && (!email || email.trim() === '')
            ? 'diomadelacorano@gmail.com'
            : email;

        // Map provider to model enum values
        const paymentMethodMap = {
            'wave': 'Wave',
            'orange': 'OM',
            'mtn': 'MTN Momo',
            'moov': 'Moov'
        };

        const pendingDonation = await Donation.create({
            reference: paymentResult.data.reference,
            envelope: envelopeId,
            amount: amount,
            donor: donorName,
            email: donationEmail,
            message: donationData?.message || '',
            anonymous: donationData?.isAnonymous || false,
            paymentMethod: paymentMethodMap[provider.toLowerCase()] || 'Wave',
            status: 'pending',
            date: new Date(),
            time: new Date().toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        });

        console.log('Mobile money payment initialized:', {
            provider,
            reference: paymentResult.data.reference,
            donationId: pendingDonation.id
        });

        res.json({
            status: true,
            message: 'Mobile money payment initialized successfully',
            data: {
                ...paymentResult.data,
                donationId: pendingDonation._id,
                provider: provider
            }
        });

    } catch (error) {
        console.error('Mobile money payment initialization error:', error);
        res.status(500).json({
            status: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Submit OTP for Orange mobile money payments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const submitMobileMoneyOtp = async (req, res) => {
    try {
        const { otp, reference } = req.body;

        // Validate required fields
        if (!otp || !reference) {
            return res.status(400).json({
                status: false,
                message: 'OTP and reference are required'
            });
        }

        // Submit OTP to Paystack
        const otpResult = await paystackService.submitOtp(otp, reference);

        if (!otpResult.status) {
            return res.status(400).json(otpResult);
        }

        // Update donation status if payment successful
        if (otpResult.data?.status === 'success') {
            const donation = await Donation.findOne({ reference: reference });
            if (donation) {
                donation.status = 'completed';
                await donation.save();
            }
        }

        console.log('OTP submitted successfully:', {
            reference,
            status: otpResult.data?.status
        });

        res.json({
            status: true,
            message: 'OTP submitted successfully',
            data: otpResult.data
        });

    } catch (error) {
        console.error('OTP submission error:', error);
        res.status(500).json({
            status: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Verify payment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;

        if (!reference) {
            return res.status(400).json({
                status: false,
                message: 'Reference is required'
            });
        }

        // Verify payment with Paystack
        const verificationResult = await paystackService.verifyPayment(reference);

        if (!verificationResult.status) {
            return res.status(400).json(verificationResult);
        }

        // Update donation status in database
        const donation = await Donation.findOne({ reference });
        if (donation) {
            const paymentStatus = verificationResult.data?.status;
            let donationStatus = 'pending';

            if (paymentStatus === 'success') {
                donationStatus = 'completed';
            } else if (paymentStatus === 'failed') {
                donationStatus = 'failed';
            }

            donation.status = donationStatus;
            await donation.save();

            console.log('Payment verification completed:', {
                reference,
                paymentStatus,
                donationStatus
            });
        }

        res.json({
            status: true,
            message: 'Payment verification completed',
            data: {
                ...verificationResult.data,
                donation: donation ? {
                    id: donation._id,
                    status: donation.status,
                    envelopeId: donation.envelope
                } : null
            }
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            status: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Handle Paystack webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleWebhook = async (req, res) => {
    try {
        const event = req.body;
        
        console.log('Paystack webhook received:', {
            event: event.event,
            reference: event.data?.reference
        });

        // Handle charge.success event
        if (event.event === 'charge.success') {
            const { reference, status, amount } = event.data;
            
            // Update donation status
            const donation = await Donation.findOne({ reference });
            if (donation && status === 'success') {
                donation.status = 'completed';
                await donation.save();
                
                console.log('Donation completed via webhook:', {
                    reference,
                    donationId: donation._id
                });
            }
        }

        res.status(200).json({ status: 'success' });

    } catch (error) {
        console.error('Webhook handling error:', error);
        res.status(500).json({
            status: false,
            message: 'Webhook processing failed',
            error: error.message
        });
    }
};

/**
 * Handle payment callback from Paystack (for bank payments)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleCallback = async (req, res) => {
    try {
        const { reference, trxref } = req.query;
        const paymentReference = reference || trxref;

        console.log('Payment callback received:', {
            reference: paymentReference,
            query: req.query
        });

        if (paymentReference) {
            // Verify the payment
            const verificationResult = await paystackService.verifyPayment(paymentReference);
            
            if (verificationResult.status && verificationResult.data?.status === 'success') {
                // Update donation status
                const donation = await Donation.findOne({ reference: paymentReference });
                if (donation) {
                    donation.status = 'completed';
                    await donation.save();
                }
                
                // Redirect to frontend with success status
                return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=success&reference=${paymentReference}`);
            }
        }

        // Redirect to frontend with error status
        res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=error&reference=${paymentReference || 'unknown'}`);

    } catch (error) {
        console.error('Payment callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=error&reference=unknown`);
    }
};

module.exports = {
    initializeBankPayment,
    initializeMobileMoneyPayment,
    submitMobileMoneyOtp,
    verifyPayment,
    handleWebhook,
    handleCallback
};
