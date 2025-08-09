const express = require('express');

/**
 * Middleware for webhook signature verification
 * Preserves the raw body for HMAC verification while allowing JSON parsing for other routes
 */

const webhookMiddleware = (req, res, next) => {
    // Only apply raw body parsing for webhook endpoint
    if (req.path === '/api/payments/webhook') {
        // Store the raw body for signature verification
        let rawBody = '';
        
        req.setEncoding('utf8');
        req.on('data', function(chunk) {
            rawBody += chunk;
        });
        
        req.on('end', function() {
            try {
                // Store raw body for signature verification
                req.rawBody = rawBody;
                // Parse JSON body for processing
                req.body = JSON.parse(rawBody);
                next();
            } catch (error) {
                console.error('Error parsing webhook JSON:', error);
                return res.status(400).json({
                    status: false,
                    message: 'Invalid JSON payload'
                });
            }
        });
    } else {
        // For non-webhook routes, use normal JSON parsing
        express.json()(req, res, next);
    }
};

module.exports = webhookMiddleware;
