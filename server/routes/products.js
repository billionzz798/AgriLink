/**
 * Product Routes
 * 
 * Defines all product-related API endpoints with validation
 * and authentication middleware.
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const { auth, authorize } = require('../middleware/auth');

/**
 * Create New Product
 * 
 * POST /api/products
 * Requires: Authentication (farmer role)
 * 
 * Request Body Validation:
 * - name: Product name (required)
 * - description: Product description (required)
 * - categoryId: Category ID (required)
 * - pricing.b2b.price: B2B price (optional, numeric)
 * - pricing.b2c.price: B2C price (optional, numeric)
 */
router.post('/', auth, [
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('pricing.b2b.price').optional().isNumeric(),
  body('pricing.b2c.price').optional().isNumeric()
], productController.createProduct);

/**
 * Get Products
 * 
 * GET /api/products
 * Public endpoint (no authentication required)
 * 
 * Query Parameters:
 * - page: Page number (optional)
 * - limit: Items per page (optional)
 * - category: Filter by category ID (optional)
 * - marketplace: Filter by marketplace (b2b, b2c) (optional)
 * - search: Search term (optional)
 * - farmer: Filter by farmer ID (optional)
 * - sort: Sort field (optional, default: -createdAt)
 */
router.get('/', productController.getProducts);

/**
 * Get Single Product
 * 
 * GET /api/products/:id
 * Public endpoint (no authentication required)
 */
router.get('/:id', productController.getProduct);

/**
 * Update Product
 * 
 * PUT /api/products/:id
 * Requires: Authentication
 * Authorization: Product owner (farmer) or admin
 */
router.put('/:id', auth, productController.updateProduct);

/**
 * Delete Product
 * 
 * DELETE /api/products/:id
 * Requires: Authentication
 * Authorization: Product owner (farmer) or admin
 */
router.delete('/:id', auth, productController.deleteProduct);

module.exports = router;
