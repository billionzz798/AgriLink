/**
 * Brand Routes
 * 
 * Defines all brand-related API endpoints for managing product brands.
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const brandController = require('../controllers/brandController');
const { auth, authorize } = require('../middleware/auth');

/**
 * Create Brand
 * 
 * POST /api/brands
 * Requires: Authentication (admin role only)
 * 
 * Request Body Validation:
 * - name: Brand name (required)
 * - description: Brand description (optional)
 * - website: Brand website URL (optional)
 * - logo: Brand logo URL (optional)
 * - isActive: Active status (optional, default: true)
 */
router.post('/', auth, authorize('admin'), [
  body('name').notEmpty().withMessage('Brand name is required')
], brandController.createBrand);

/**
 * Get All Brands
 * 
 * GET /api/brands
 * Public endpoint (no authentication required)
 * 
 * Query Parameters:
 * - isActive: Filter by active status (true/false, optional)
 */
router.get('/', brandController.getBrands);

/**
 * Get Single Brand
 * 
 * GET /api/brands/:id
 * Public endpoint (no authentication required)
 */
router.get('/:id', brandController.getBrand);

/**
 * Update Brand
 * 
 * PUT /api/brands/:id
 * Requires: Authentication (admin role only)
 */
router.put('/:id', auth, authorize('admin'), brandController.updateBrand);

/**
 * Delete Brand
 * 
 * DELETE /api/brands/:id
 * Requires: Authentication (admin role only)
 */
router.delete('/:id', auth, authorize('admin'), brandController.deleteBrand);

module.exports = router;
