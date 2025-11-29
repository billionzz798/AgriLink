const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// Initialize payment
router.post('/initialize', auth, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required')
], paymentController.initializePayment);

// Verify payment (callback from Paystack)
router.get('/verify/:reference', paymentController.verifyPayment);

// Get payment status
router.get('/status/:orderId', auth, paymentController.getPaymentStatus);

module.exports = router;
