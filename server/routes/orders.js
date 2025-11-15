const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

router.post('/', auth, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required')
], orderController.createOrder);

router.get('/', auth, orderController.getOrders);
router.get('/:id', auth, orderController.getOrder);
router.put('/:id/status', auth, orderController.updateOrderStatus);

module.exports = router;
