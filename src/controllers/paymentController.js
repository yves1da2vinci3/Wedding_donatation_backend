const paystackService = require('../services/paystackService');
const Donation = require('../models/Donation');
const Envelope = require('../models/Envelope');
const crypto = require('crypto');

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
        if (!email || !amount) {
            return res.status(400).json({
                status: false,
                message: 'Email and amount are required'
            });
        }

        // Verify envelope exists if provided
        let envelope = null;
        if (envelopeId) {
            envelope = await Envelope.findById(envelopeId);
            if (!envelope) {
                return res.status(404).json({
                    status: false,
                    message: 'Envelope not found'
                });
            }
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
            envelope: envelopeId || null,
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
        if (!amount || !provider || !phone) {
            return res.status(400).json({
                status: false,
                message: 'Amount, provider, and phone are required'
            });
        }

        // Email is required for non-anonymous donations
        if (!donationData?.isAnonymous && !email) {
            return res.status(400).json({
                status: false,
                message: 'Email is required for non-anonymous donations'
            });
        }

        // Validate provider
        if (!paystackService.validateMobileMoneyProvider(provider)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid mobile money provider. Supported: wave, orange, mtn'
            });
        }

        // Verify envelope exists if provided
        let envelope = null;
        if (envelopeId) {
            envelope = await Envelope.findById(envelopeId);
            if (!envelope) {
                return res.status(404).json({
                    status: false,
                    message: 'Envelope not found'
                });
            }
        }

          // For anonymous donations, use default email if none provided
          const donationEmail = donationData?.isAnonymous 
          ? (email && email.trim() !== '' ? email : 'diomadelacorano@gmail.com')
          : email;

        // Create callback URL for mobile money payments
        const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/donation`;

        // Initialize mobile money payment with Paystack
        const paymentResult = await paystackService.initializeMobileMoneyTransaction(
            amount,
            donationEmail, // Use the processed email
            provider,
            phone,
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
        
      

        // Map provider to model enum values
        const paymentMethodMap = {
            'wave': 'Wave',
            'orange': 'OM',
            'mtn': 'MTN Momo'
        };

        const pendingDonation = await Donation.create({
            reference: paymentResult.data.reference,
            envelope: envelopeId || null,
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
 * Verify Paystack webhook signature
 * @param {string} rawPayload - Raw request body string
 * @param {string} signature - Paystack signature from headers
 * @returns {boolean} - True if signature is valid
 */
const verifyWebhookSignature = (rawPayload, signature) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        console.error('PAYSTACK_SECRET_KEY not found in environment variables');
        return false;
    }
    
    const hash = crypto.createHmac('sha512', secret)
        .update(rawPayload)
        .digest('hex');
    
    return hash === signature;
};

/**
 * Handle Paystack webhook with signature verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleWebhook = async (req, res) => {
    try {
        // Get the signature from headers
        const signature = req.headers['x-paystack-signature'];
        
        if (!signature) {
            console.error('Missing x-paystack-signature header');
            return res.status(400).json({
                status: false,
                message: 'Missing signature'
            });
        }

        // Verify webhook signature using raw body
        const rawBody = req.rawBody || JSON.stringify(req.body);
        if (!verifyWebhookSignature(rawBody, signature)) {
            console.error('Invalid webhook signature');
            return res.status(400).json({
                status: false,
                message: 'Invalid signature'
            });
        }

        const event = req.body;
        
        console.log('Verified Paystack webhook received:', {
            event: event.event,
            reference: event.data?.reference,
            timestamp: new Date().toISOString()
        });

        // Handle different webhook events
        switch (event.event) {
            case 'charge.success':
                await handleChargeSuccess(event.data);
                break;
                
            case 'charge.failed':
                await handleChargeFailed(event.data);
                break;
                
            case 'charge.pending':
                await handleChargePending(event.data);
                break;
                
            default:
                console.log('Unhandled webhook event:', event.event);
        }

        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ 
            status: 'success',
            message: 'Webhook processed successfully'
        });

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
 * Handle successful charge webhook
 * @param {Object} data - Webhook event data
 */
const handleChargeSuccess = async (data) => {
    try {
        const { reference, status, amount, customer, authorization } = data;
        
        console.log('Processing charge.success:', {
            reference,
            status,
            amount,
            customer_email: customer?.email
        });

        // Find and update donation
        const donation = await Donation.findOne({ reference });
        if (donation) {
            // Only update if not already completed
            if (donation.status !== 'completed') {
                donation.status = 'completed';
                await donation.save();
                
                console.log('Donation marked as completed via webhook:', {
                    reference,
                    donationId: donation._id,
                    amount: amount / 100 // Convert from kobo to main currency
                });
            } else {
                console.log('Donation already completed:', reference);
            }
        } else {
            console.warn('Donation not found for reference:', reference);
        }
    } catch (error) {
        console.error('Error handling charge.success:', error);
        throw error;
    }
};

/**
 * Handle failed charge webhook
 * @param {Object} data - Webhook event data
 */
const handleChargeFailed = async (data) => {
    try {
        const { reference, status } = data;
        
        console.log('Processing charge.failed:', {
            reference,
            status
        });

        // Find and update donation
        const donation = await Donation.findOne({ reference });
        if (donation) {
            donation.status = 'failed';
            await donation.save();
            
            console.log('Donation marked as failed via webhook:', {
                reference,
                donationId: donation._id
            });
        }
    } catch (error) {
        console.error('Error handling charge.failed:', error);
        throw error;
    }
};

/**
 * Handle pending charge webhook
 * @param {Object} data - Webhook event data
 */
const handleChargePending = async (data) => {
    try {
        const { reference, status } = data;
        
        console.log('Processing charge.pending:', {
            reference,
            status
        });

        // Find and update donation status if needed
        const donation = await Donation.findOne({ reference });
        if (donation && donation.status === 'pending') {
            // Keep as pending but log the update
            console.log('Donation remains pending via webhook:', {
                reference,
                donationId: donation._id
            });
        }
    } catch (error) {
        console.error('Error handling charge.pending:', error);
        throw error;
    }
};

/**
 * Handle payment callback from Paystack (for bank payments)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleCallback = async (req, res) => {
    try {
        const { reference, trxref, status } = req.query;
        const paymentReference = reference || trxref;

        console.log('Payment callback received:', {
            reference: paymentReference,
            status: status,
            fullQuery: req.query,
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent']
        });

        // Validate that we have a reference
        if (!paymentReference) {
            console.error('No payment reference provided in callback');
            return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=error&error=missing_reference`);
        }

        // Check if donation exists
        const donation = await Donation.findOne({ reference: paymentReference });
        if (!donation) {
            console.error('Donation not found for reference:', paymentReference);
            return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=error&reference=${paymentReference}&error=donation_not_found`);
        }

        // Always verify payment with Paystack regardless of callback status
        const verificationResult = await paystackService.verifyPayment(paymentReference);
        
        if (verificationResult.status) {
            const paymentStatus = verificationResult.data?.status;
            const amount = verificationResult.data?.amount;
            
            console.log('Payment verification result:', {
                reference: paymentReference,
                paymentStatus,
                amount,
                verificationTimestamp: new Date().toISOString()
            });

            // Update donation based on verification result
            if (paymentStatus === 'success') {
                // Only update if not already completed
                if (donation.status !== 'completed') {
                    donation.status = 'completed';
                    await donation.save();
                    
                    console.log('Donation completed via callback verification:', {
                        reference: paymentReference,
                        donationId: donation._id,
                        amount: amount ? amount / 100 : 'unknown'
                    });
                }
                
                // Redirect to frontend with success
                return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=success&reference=${paymentReference}`);
                
            } else if (paymentStatus === 'failed') {
                donation.status = 'failed';
                await donation.save();
                
                console.log('Donation failed via callback verification:', {
                    reference: paymentReference,
                    donationId: donation._id
                });
                
                return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=failed&reference=${paymentReference}`);
                
            } else {
                // Payment still pending or other status
                console.log('Payment verification returned non-final status:', {
                    reference: paymentReference,
                    status: paymentStatus
                });
                
                return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=pending&reference=${paymentReference}`);
            }
        } else {
            // Verification failed
            console.error('Payment verification failed:', {
                reference: paymentReference,
                verificationError: verificationResult.message || 'Unknown error'
            });
            
            return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=verification_failed&reference=${paymentReference}`);
        }

    } catch (error) {
        console.error('Payment callback error:', {
            error: error.message,
            stack: error.stack,
            reference: req.query?.reference || req.query?.trxref
        });
        
        const reference = req.query?.reference || req.query?.trxref || 'unknown';
        res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=error&reference=${reference}&error=callback_exception`);
    }
};

/**
 * Handle mobile money payment callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleMobileMoneyCallback = async (req, res) => {
    try {
        const { reference, trxref, status, provider } = req.query;
        const paymentReference = reference || trxref;

        console.log('Mobile money callback received:', {
            reference: paymentReference,
            status: status,
            provider: provider,
            fullQuery: req.query,
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent']
        });

        // Validate that we have a reference
        if (!paymentReference) {
            console.error('No payment reference provided in mobile money callback');
            return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=error&error=missing_reference&provider=${provider || 'unknown'}`);
        }

        // Check if donation exists
        const donation = await Donation.findOne({ reference: paymentReference });
        if (!donation) {
            console.error('Donation not found for reference:', paymentReference);
            return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=error&reference=${paymentReference}&error=donation_not_found&provider=${provider || 'unknown'}`);
        }

        // Always verify payment with Paystack regardless of callback status
        const verificationResult = await paystackService.verifyPayment(paymentReference);
        
        if (verificationResult.status) {
            const paymentStatus = verificationResult.data?.status;
            const amount = verificationResult.data?.amount;
            
            console.log('Mobile money payment verification result:', {
                reference: paymentReference,
                paymentStatus,
                amount,
                provider: provider,
                verificationTimestamp: new Date().toISOString()
            });

            // Update donation based on verification result
            if (paymentStatus === 'success') {
                // Only update if not already completed
                if (donation.status !== 'completed') {
                    donation.status = 'completed';
                    await donation.save();
                    
                    console.log('Mobile money donation completed via callback verification:', {
                        reference: paymentReference,
                        donationId: donation._id,
                        provider: provider,
                        amount: amount ? amount / 100 : 'unknown'
                    });
                }
                
                // Redirect to frontend confirmation page with donation data
                const redirectUrl = new URL(`${process.env.FRONTEND_URL}/confirmation`);
                redirectUrl.searchParams.set('success', 'true');
                redirectUrl.searchParams.set('reference', paymentReference);
                redirectUrl.searchParams.set('provider', provider || donation.paymentMethod);
                redirectUrl.searchParams.set('amount', amount ? (amount / 100).toString() : donation.amount.toString());
                redirectUrl.searchParams.set('donor', donation.donor);
                redirectUrl.searchParams.set('callback_type', 'mobile_money');
                
                return res.redirect(redirectUrl.toString());
                
            } else if (paymentStatus === 'failed') {
                donation.status = 'failed';
                await donation.save();
                
                console.log('Mobile money donation failed via callback verification:', {
                    reference: paymentReference,
                    donationId: donation._id,
                    provider: provider
                });
                
                return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=failed&reference=${paymentReference}&provider=${provider || 'unknown'}`);
                
            } else {
                // Payment still pending or other status
                console.log('Mobile money payment verification returned non-final status:', {
                    reference: paymentReference,
                    status: paymentStatus,
                    provider: provider
                });
                
                return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=pending&reference=${paymentReference}&provider=${provider || 'unknown'}`);
            }
        } else {
            // Verification failed
            console.error('Mobile money payment verification failed:', {
                reference: paymentReference,
                provider: provider,
                verificationError: verificationResult.message || 'Unknown error'
            });
            
            return res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=verification_failed&reference=${paymentReference}&provider=${provider || 'unknown'}`);
        }

    } catch (error) {
        console.error('Mobile money payment callback error:', {
            error: error.message,
            stack: error.stack,
            reference: req.query?.reference || req.query?.trxref,
            provider: req.query?.provider
        });
        
        const reference = req.query?.reference || req.query?.trxref || 'unknown';
        const provider = req.query?.provider || 'unknown';
        res.redirect(`${process.env.FRONTEND_URL}/donation?payment_status=error&reference=${reference}&provider=${provider}&error=callback_exception`);
    }
};

module.exports = {
    initializeBankPayment,
    initializeMobileMoneyPayment,
    submitMobileMoneyOtp,
    verifyPayment,
    handleWebhook,
    handleCallback,
    handleMobileMoneyCallback
};
