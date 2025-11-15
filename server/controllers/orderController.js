const Order = require('../models/Order');
const Product = require('../models/Product');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, deliveryAddress, notes } = req.body;

    let subtotal = 0;
    const orderItems = [];
    let farmerId = null;

    for (const item of items) {
      const product = await Product.findByPk(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }

      if (!farmerId) farmerId = product.farmerId;

      const marketplace = req.user.role === 'institutional_buyer' ? 'b2b' : 'b2c';
      const pricing = product.pricing[marketplace];

      if (!pricing) {
        return res.status(400).json({ message: `Product not available for ${marketplace} marketplace` });
      }

      if (marketplace === 'b2b' && item.quantity < pricing.minQuantity) {
        return res.status(400).json({ 
          message: `Minimum quantity for B2B is ${pricing.minQuantity} ${pricing.unit}` 
        });
      }

      if (item.quantity > product.inventory.availableQuantity) {
        return res.status(400).json({ 
          message: `Insufficient inventory. Available: ${product.inventory.availableQuantity}` 
        });
      }

      const itemTotal = item.quantity * pricing.price;
      subtotal += itemTotal;

      orderItems.push({
        product: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: pricing.price,
        marketplace
      });

      product.inventory.reservedQuantity += item.quantity;
      product.inventory.availableQuantity -= item.quantity;
      await product.save();
    }

    const shipping = req.body.shipping || { cost: 0, method: 'standard' };
    const total = parseFloat(subtotal) + parseFloat(shipping.cost || 0);

    const order = await Order.create({
      buyerId: req.user.id,
      farmerId: farmerId,
      items: orderItems,
      subtotal: subtotal,
      shipping: shipping,
      total: total,
      deliveryAddress: deliveryAddress || req.user.address,
      notes: notes
    });

    const orderWithRelations = await Order.findByPk(order.id, {
      include: [
        { model: require('../models/User'), as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    res.status(201).json({ message: 'Order created successfully', order: orderWithRelations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};

    if (req.user.role === 'farmer') {
      query.farmerId = req.user.id;
    } else {
      query.buyerId = req.user.id;
    }

    if (status) query.status = status;

    const orders = await Order.findAndCountAll({
      where: query,
      include: [
        { model: require('../models/User'), as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']],
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
    res.status(500).json({ message: error.message });
  }
};

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

    const isAuthorized = 
      order.buyerId === req.user.id ||
      order.farmerId === req.user.id ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const canUpdate = 
      (req.user.role === 'farmer' && order.farmerId === req.user.id) ||
      req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
