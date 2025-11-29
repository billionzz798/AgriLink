const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Initialize Paystack payment
exports.initializePayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, email, amount, currency = 'GHS' } = req.body;

    if (!orderId || !email || !amount) {
      return res.status(400).json({ 
        message: 'Order ID, email, and amount are required' 
      });
    }

    // Verify order exists and belongs to user
    const order = await Order.findByPk(orderId, {
      include: [
        { model: require('../models/User'), as: 'buyer' }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to pay for this order' });
    }

    // Check if order is already paid
    if (order.payment?.status === 'success') {
      return res.status(400).json({ message: 'Order has already been paid' });
    }

    // Convert amount to pesewas (Paystack uses smallest currency unit)
    // For GHS, 1 GHS = 100 pesewas
    const amountInPesewas = Math.round(parseFloat(amount) * 100);

    // Create payment reference
    const reference = `AGR-${order.orderNumber}-${Date.now()}`;

    // Get callback URL (for redirect after payment)
    const callbackUrl = `${req.protocol}://${req.get('host')}/customer?payment=verify&reference=${reference}`;

    // Initialize Paystack payment
    const paystackResponse = await paystack.transaction.initialize({
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

    if (!paystackResponse.status) {
      return res.status(400).json({ 
        message: 'Failed to initialize payment',
        error: paystackResponse.message 
      });
    }

    // Update order with payment reference
    await order.update({
      payment: {
        method: 'paystack',
        status: 'pending',
        reference: reference,
        amount: amount,
        currency: currency,
        paidAt: null
      },
      status: 'payment_pending'
    });

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
      message: 'Failed to initialize payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Verify Paystack payment
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ message: 'Payment reference is required' });
    }

    // Verify payment with Paystack
    const paystackResponse = await paystack.transaction.verify(reference);

    if (!paystackResponse.status) {
      return res.status(400).json({ 
        message: 'Payment verification failed',
        error: paystackResponse.message 
      });
    }

    const transaction = paystackResponse.data;

    // Find order by payment reference
    const order = await Order.findOne({
      where: {
        'payment.reference': reference
      },
      include: [
        { model: require('../models/User'), as: 'buyer' },
        { model: require('../models/User'), as: 'farmer' }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found for this payment' });
    }

    // Check if payment is successful
    if (transaction.status === 'success') {
      // Deduct inventory now that payment is confirmed
      for (const item of order.items) {
        const product = await Product.findByPk(item.product);
        if (product) {
          product.inventory.reservedQuantity += item.quantity;
          product.inventory.availableQuantity -= item.quantity;
          await product.save();
        }
      }

      // Update order payment status
      await order.update({
        payment: {
          method: 'paystack',
          status: 'success',
          reference: reference,
          amount: (transaction.amount / 100).toFixed(2), // Convert from pesewas to GHS
          currency: transaction.currency,
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

      // Redirect to success page or return JSON
      if (req.query.redirect) {
        return res.redirect(`${req.query.redirect}?reference=${reference}&status=success&orderId=${order.id}`);
      }

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
      // Payment failed
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
      message: 'Failed to verify payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get payment status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.buyerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      payment: order.payment,
      status: order.status
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ 
      message: 'Failed to get payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
