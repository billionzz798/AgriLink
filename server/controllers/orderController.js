/**
 * Order Controller
 * 
 * Handles all order-related operations including creation, retrieval,
 * and status updates. Manages the order lifecycle from creation to delivery.
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

/**
 * Generate Unique Order Number
 * Creates a unique order identifier using timestamp and random string
 * 
 * @returns {String} Order number in format: AGR-{timestamp}-{random}
 */
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `AGR-${timestamp}-${random}`;
}

/**
 * Create New Order
 * Creates an order with payment_pending status (inventory not deducted until payment)
 * 
 * POST /api/orders
 * Requires: Authentication
 * 
 * Request Body:
 * - items: Array of {product: UUID, quantity: Number}
 * - deliveryAddress: Object with address details
 * - notes: Optional order notes
 * - shipping: Optional shipping details
 */
exports.createOrder = async (req, res) => {
  try {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, deliveryAddress, notes } = req.body;

    // Validate items array
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    let subtotal = 0;
    const orderItems = [];
    let farmerId = null;

    /**
     * Process each item in the order:
     * - Validate product exists
     * - Check inventory availability
     * - Calculate pricing based on user role (B2B vs B2C)
     * - Ensure all items are from the same farmer
     */
    for (const item of items) {
      // Find product
      const product = await Product.findByPk(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }

      // Set farmer ID (all items must be from same farmer)
      if (!farmerId) farmerId = product.farmerId;

      // Determine marketplace based on user role
      const marketplace = req.user.role === 'institutional_buyer' ? 'b2b' : 'b2c';
      const pricing = product.pricing[marketplace];

      // Validate product is available for this marketplace
      if (!pricing) {
        return res.status(400).json({ 
          message: `Product not available for ${marketplace} marketplace` 
        });
      }

      // Validate B2B minimum quantity requirement
      if (marketplace === 'b2b' && item.quantity < pricing.minQuantity) {
        return res.status(400).json({ 
          message: `Minimum quantity for B2B is ${pricing.minQuantity} ${pricing.unit}` 
        });
      }

      // Check inventory availability
      if (item.quantity > product.inventory.availableQuantity) {
        return res.status(400).json({ 
          message: `Insufficient inventory. Available: ${product.inventory.availableQuantity}` 
        });
      }

      // Calculate item total and add to subtotal
      const itemTotal = item.quantity * pricing.price;
      subtotal += itemTotal;

      // Add item to order items array
      orderItems.push({
        product: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: pricing.price,
        marketplace
      });
    }

    // Calculate shipping and total
    const shipping = req.body.shipping || { cost: 0, method: 'standard' };
    const total = parseFloat(subtotal) + parseFloat(shipping.cost || 0);

    // Generate unique order number
    const orderNumber = generateOrderNumber();

    /**
     * Create order with payment_pending status
     * Inventory is NOT deducted here - it will be deducted after payment confirmation
     * This prevents inventory loss if payment fails
     */
    const order = await Order.create({
      orderNumber: orderNumber,
      buyerId: req.user.id,
      farmerId: farmerId,
      items: orderItems,
      subtotal: subtotal,
      shipping: shipping,
      total: total,
      deliveryAddress: deliveryAddress || req.user.address,
      notes: notes || null,
      status: 'payment_pending',
      payment: {
        method: null,
        status: 'pending',
        reference: null,
        amount: total,
        currency: 'GHS',
        paidAt: null
      }
    });

    // Fetch order with related data (buyer and farmer info)
    const orderWithRelations = await Order.findByPk(order.id, {
      include: [
        { model: require('../models/User'), as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    res.status(201).json({ 
      message: 'Order created successfully. Please proceed to payment.',
      order: orderWithRelations 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get User Orders
 * Retrieves orders for the authenticated user (filtered by role)
 * 
 * GET /api/orders
 * Requires: Authentication
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by order status
 */
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};

    /**
     * Filter orders based on user role:
     * - Farmers see orders for their products
     * - Buyers see their own orders
     * - Admins see all orders (handled separately if needed)
     */
    if (req.user.role === 'farmer') {
      query.farmerId = req.user.id;
    } else {
      query.buyerId = req.user.id;
    }

    // Filter by status if provided
    if (status) query.status = status;

    // Fetch orders with pagination
    const orders = await Order.findAndCountAll({
      where: query,
      include: [
        { model: require('../models/User'), as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']], // Newest first
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      orders: orders.rows,
      totalPages: Math.ceil(orders.count / limit),
      currentPage: parseInt(page),
      total: orders.count
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Single Order
 * Retrieves detailed information about a specific order
 * 
 * GET /api/orders/:id
 * Requires: Authentication
 * Authorization: Order must belong to user (buyer or farmer) or user must be admin
 */
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: require('../models/User'), as: 'buyer' },
        { model: require('../models/User'), as: 'farmer' }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    /**
     * Authorization check:
     * - Buyer can view their own orders
     * - Farmer can view orders for their products
     * - Admin can view all orders
     */
    const isAuthorized = 
      order.buyerId === req.user.id ||
      order.farmerId === req.user.id ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update Order Status
 * Updates the status of an order (e.g., pending -> confirmed -> shipped -> delivered)
 * 
 * PUT /api/orders/:id/status
 * Requires: Authentication
 * Authorization: Only farmer (for their orders) or admin can update status
 * 
 * Request Body:
 * - status: New order status (pending, confirmed, processing, shipped, delivered, cancelled)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    /**
     * Authorization check:
     * - Farmers can update status of orders for their products
     * - Admins can update any order status
     */
    const canUpdate = 
      (req.user.role === 'farmer' && order.farmerId === req.user.id) ||
      req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Update order status
    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message });
  }
};
