/**
 * Order Routes
 * 
 * Defines all order-related API endpoints with validation
 * and authentication middleware.
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

/**
 * Create New Order
 * 
 * POST /api/orders
 * Requires: Authentication
 * 
 * Request Body Validation:
 * - items: Array with at least 1 item
 * - items.*.product: Product ID (required)
 * - items.*.quantity: Positive integer (required)
 */
router.post('/', auth, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required')
], orderController.createOrder);

/**
 * Get User Orders
 * 
 * GET /api/orders
 * Requires: Authentication
 * 
 * Query Parameters:
 * - page: Page number (optional)
 * - limit: Items per page (optional)
 * - status: Filter by order status (optional)
 * 
 * Returns orders filtered by user role (farmer sees their orders, buyer sees their purchases)
 */
router.get('/', auth, orderController.getOrders);

/**
 * Get Single Order
 * 
 * GET /api/orders/:id
 * Requires: Authentication
 * Authorization: Order must belong to user or user must be admin
 */
router.get('/:id', auth, orderController.getOrder);

/**
 * Update Order Status
 * 
 * PUT /api/orders/:id/status
 * Requires: Authentication
 * Authorization: Only farmer (for their orders) or admin
 * 
 * Request Body:
 * - status: New order status
 */
router.put('/:id/status', auth, orderController.updateOrderStatus);

module.exports = router;
