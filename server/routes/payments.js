/**
 * Payment Routes
 * 
 * Defines all payment-related API endpoints for Paystack integration.
 * Handles payment initialization, verification, and status checks.
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

/**
 * Initialize Payment
 * Creates a payment transaction with Paystack and returns authorization URL
 * 
 * POST /api/payments/initialize
 * Requires: Authentication
 * 
 * Request Body Validation:
 * - orderId: Order ID (required)
 * - email: Buyer's email address (required, valid email)
 * - amount: Payment amount (required, minimum 0.01)
 */
router.post('/initialize', auth, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required')
], paymentController.initializePayment);

/**
 * Verify Payment
 * Verifies payment status after user returns from Paystack
 * 
 * GET /api/payments/verify/:reference
 * Public endpoint (called by Paystack callback)
 * 
 * URL Parameters:
 * - reference: Payment reference from Paystack
 * 
 * Query Parameters (optional):
 * - redirect: URL to redirect to after verification
 */
router.get('/verify/:reference', paymentController.verifyPayment);

/**
 * Get Payment Status
 * Retrieves current payment status for an order
 * 
 * GET /api/payments/status/:orderId
 * Requires: Authentication
 * Authorization: Order owner or admin
 */
router.get('/status/:orderId', auth, paymentController.getPaymentStatus);

module.exports = router;
