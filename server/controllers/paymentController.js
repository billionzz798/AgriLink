/**
 * Payment Controller
 * 
 * Handles Paystack payment gateway integration for processing
 * payments for orders in the AgriLink platform.
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

/**
 * Initialize Paystack SDK
 * Handles missing API key gracefully to prevent server crashes
 */
let paystack;
try {
  if (process.env.PAYSTACK_SECRET_KEY) {
    paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
    console.log('✅ Paystack initialized with secret key');
  } else {
    console.warn('⚠️ PAYSTACK_SECRET_KEY not found - payment features disabled');
  }
} catch (error) {
  console.error('❌ Error initializing Paystack:', error.message);
}

/**
 * Initialize Paystack Payment
 * Creates a payment transaction with Paystack and returns authorization URL
 * 
 * POST /api/payments/initialize
 * Requires: Authentication
 * 
 * Request Body:
 * - orderId: UUID of the order to pay for
 * - email: Buyer's email address
 * - amount: Payment amount in GHS
 * - currency: Currency code (default: GHS)
 */
exports.initializePayment = async (req, res) => {
  try {
    // Check if Paystack is configured
    if (!process.env.PAYSTACK_SECRET_KEY || !paystack) {
      console.error('Paystack secret key not configured');
      return res.status(500).json({ 
        success: false,
        message: 'Payment gateway not configured. Please contact support.',
        error: 'PAYSTACK_SECRET_KEY missing',
        hint: 'Please set PAYSTACK_SECRET_KEY environment variable'
      });
    }

    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { orderId, email, amount, currency = 'GHS' } = req.body;

    // Validate required fields
    if (!orderId || !email || !amount) {
      return res.status(400).json({ 
        success: false,
        message: 'Order ID, email, and amount are required' 
      });
    }

    // Validate amount is a positive number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid amount' 
      });
    }

    // Verify order exists and belongs to user
    const order = await Order.findByPk(orderId, {
      include: [
        { model: require('../models/User'), as: 'buyer' }
      ]
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Authorization check
    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to pay for this order' 
      });
    }

    // Check if order is already paid
    if (order.payment?.status === 'success') {
      return res.status(400).json({ 
        success: false,
        message: 'Order has already been paid' 
      });
    }

    // Convert amount to pesewas (Paystack uses smallest currency unit)
    // For GHS: 1 GHS = 100 pesewas
    const amountInPesewas = Math.round(numericAmount * 100);

    // Validate minimum amount (₵1.00 = 100 pesewas)
    if (amountInPesewas < 100) {
      return res.status(400).json({ 
        success: false,
        message: 'Minimum payment amount is ₵1.00' 
      });
    }

    // Generate unique payment reference
    const reference = `AGR-${order.orderNumber}-${Date.now()}`;

    /**
     * Get callback URL for payment redirect
     * Priority:
     * 1. PAYSTACK_CALLBACK_URL environment variable (for production)
     * 2. Construct from request headers (for dynamic environments)
     */
    let callbackUrl;
    if (process.env.PAYSTACK_CALLBACK_URL) {
      callbackUrl = `${process.env.PAYSTACK_CALLBACK_URL}/customer?payment=verify&reference=${reference}`;
    } else {
      // Determine protocol and host from request
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
      callbackUrl = `${protocol}://${host}/customer?payment=verify&reference=${reference}`;
    }

    console.log('Initializing Paystack payment:', {
      orderId,
      email,
      amount: numericAmount,
      amountInPesewas,
      reference
    });

    /**
     * Initialize payment with Paystack
     * This creates a payment transaction and returns an authorization URL
     */
    let paystackResponse;
    try {
      paystackResponse = await paystack.transaction.initialize({
        email: email,
        amount: amountInPesewas,
        currency: currency,
        reference: reference,
        callback_url: callbackUrl,
        metadata: {
          orderId: orderId,
          orderNumber: order.orderNumber,
          buyerId: req.user.id,
          buyerName: req.user.name
        }
      });
    } catch (paystackError) {
      console.error('Paystack API error:', paystackError);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to connect to payment gateway',
        error: process.env.NODE_ENV === 'development' ? paystackError.message : 'Payment gateway error'
      });
    }

    // Validate Paystack response
    if (!paystackResponse || !paystackResponse.status) {
      const errorMessage = paystackResponse?.message || 'Unknown Paystack error';
      console.error('Paystack initialization failed:', errorMessage);
      
      return res.status(400).json({ 
        success: false,
        message: 'Failed to initialize payment',
        error: errorMessage
      });
    }

    // Verify response contains authorization URL
    if (!paystackResponse.data || !paystackResponse.data.authorization_url) {
      console.error('Paystack response missing authorization URL');
      return res.status(500).json({ 
        success: false,
        message: 'Invalid response from payment gateway',
        error: 'Missing authorization URL'
      });
    }

    /**
     * Update order with payment reference
     * Status remains 'payment_pending' until payment is verified
     */
    try {
      await order.update({
        payment: {
          method: 'paystack',
          status: 'pending',
          reference: reference,
          amount: numericAmount.toFixed(2),
          currency: currency,
          paidAt: null
        },
        status: 'payment_pending'
      });
    } catch (updateError) {
      console.error('Error updating order payment info:', updateError);
    }

    console.log('✅ Payment initialized successfully:', {
      reference,
      authorizationUrl: paystackResponse.data.authorization_url
    });

    // Return authorization URL for redirect
    res.json({
      success: true,
      message: 'Payment initialized successfully',
      authorization_url: paystackResponse.data.authorization_url,
      access_code: paystackResponse.data.access_code,
      reference: reference
    });
  } catch (error) {
    console.error('Paystack initialization error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to initialize payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Verify Paystack Payment
 * Verifies payment status after user returns from Paystack
 * Deducts inventory only after successful payment verification
 * 
 * GET /api/payments/verify/:reference
 * 
 * @param {String} reference - Payment reference from Paystack
 */
exports.verifyPayment = async (req, res) => {
  try {
    // Check Paystack configuration
    if (!process.env.PAYSTACK_SECRET_KEY || !paystack) {
      return res.status(500).json({ 
        success: false,
        message: 'Payment gateway not configured' 
      });
    }

    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ 
        success: false,
        message: 'Payment reference is required' 
      });
    }

    /**
     * Verify payment with Paystack API
     * This checks the actual payment status on Paystack's servers
     */
    let paystackResponse;
    try {
      paystackResponse = await paystack.transaction.verify(reference);
    } catch (paystackError) {
      console.error('Paystack verification API error:', paystackError);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to verify payment with gateway',
        error: process.env.NODE_ENV === 'development' ? paystackError.message : 'Gateway error'
      });
    }

    // Validate Paystack response
    if (!paystackResponse || !paystackResponse.status) {
      const errorMessage = paystackResponse?.message || 'Verification failed';
      console.error('Paystack verification failed:', errorMessage);
      
      return res.status(400).json({ 
        success: false,
        message: 'Payment verification failed',
        error: errorMessage 
      });
    }

    const transaction = paystackResponse.data;

    /**
     * Find order by payment reference
     * Uses JSONB query with fallback for compatibility
     */
    let order;
    try {
      order = await Order.findOne({
        where: {
          'payment.reference': reference
        },
        include: [
          { model: require('../models/User'), as: 'buyer' },
          { model: require('../models/User'), as: 'farmer' }
        ]
      });
    } catch (queryError) {
      // Fallback: query all orders and filter in memory
      // (Some PostgreSQL versions may not support JSONB queries)
      console.warn('JSONB query failed, using fallback:', queryError.message);
      const allOrders = await Order.findAll({
        include: [
          { model: require('../models/User'), as: 'buyer' },
          { model: require('../models/User'), as: 'farmer' }
        ]
      });
      order = allOrders.find(o => o.payment?.reference === reference);
    }

    if (!order) {
      console.error('Order not found for payment reference:', reference);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found for this payment' 
      });
    }

    /**
     * Process successful payment
     * - Deduct inventory from products
     * - Update order payment status
     * - Change order status to 'confirmed'
     */
    if (transaction.status === 'success') {
      // Deduct inventory now that payment is confirmed
      for (const item of order.items) {
        try {
          const product = await Product.findByPk(item.product);
          if (product) {
            // Move quantity from available to reserved
            product.inventory.reservedQuantity = (product.inventory.reservedQuantity || 0) + item.quantity;
            product.inventory.availableQuantity = (product.inventory.availableQuantity || 0) - item.quantity;
            await product.save();
          }
        } catch (inventoryError) {
          console.error('Error updating inventory for product:', item.product, inventoryError);
        }
      }

      // Update order with payment success information
      await order.update({
        payment: {
          method: 'paystack',
          status: 'success',
          reference: reference,
          amount: (transaction.amount / 100).toFixed(2), // Convert from pesewas to GHS
          currency: transaction.currency || 'GHS',
          paidAt: transaction.paid_at || new Date(),
          transactionId: transaction.id,
          paystackData: {
            customer: transaction.customer,
            authorization: transaction.authorization,
            channel: transaction.channel,
            gateway_response: transaction.gateway_response
          }
        },
        status: 'confirmed'
      });

      // Handle redirect if requested
      if (req.query.redirect) {
        return res.redirect(`${req.query.redirect}?reference=${reference}&status=success&orderId=${order.id}`);
      }

      // Return JSON response
      return res.json({
        success: true,
        message: 'Payment verified successfully',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          status: order.status
        },
        transaction: {
          reference: reference,
          amount: transaction.amount / 100,
          status: transaction.status,
          paidAt: transaction.paid_at
        }
      });
    } else {
      /**
       * Payment failed
       * Update order with failure status
       */
      await order.update({
        payment: {
          ...order.payment,
          status: 'failed',
          failureReason: transaction.gateway_response || 'Payment failed'
        },
        status: 'payment_failed'
      });

      if (req.query.redirect) {
        return res.redirect(`${req.query.redirect}?reference=${reference}&status=failed`);
      }

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        status: transaction.status,
        gateway_response: transaction.gateway_response
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to verify payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get Payment Status
 * Retrieves current payment status for an order
 * 
 * GET /api/payments/status/:orderId
 * Requires: Authentication
 * Authorization: Order owner or admin
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Authorization check
    if (order.buyerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      payment: order.payment,
      status: order.status
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
