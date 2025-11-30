/**
 * Brand Controller
 * 
 * Handles all brand-related operations including creation, retrieval,
 * updating, and deletion. Brand management is restricted to admins.
 */

const Brand = require('../models/Brand');
const { validationResult } = require('express-validator');

/**
 * Create New Brand
 * 
 * POST /api/brands
 * Requires: Authentication (admin role only)
 */
exports.createBrand = async (req, res) => {
  try {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Create brand (slug will be auto-generated from name)
    const brand = await Brand.create(req.body);
    
    res.status(201).json({ 
      message: 'Brand created successfully', 
      brand 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get All Brands
 * 
 * GET /api/brands
 * Public endpoint (no authentication required)
 * 
 * Query Parameters:
 * - isActive: Filter by active status (true/false, optional)
 * 
 * Returns brands ordered alphabetically by name
 */
exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.findAll({
      where: req.query.isActive !== undefined 
        ? { isActive: req.query.isActive === 'true' } 
        : {},
      order: [['name', 'ASC']]
    });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Single Brand
 * 
 * GET /api/brands/:id
 * Public endpoint (no authentication required)
 */
exports.getBrand = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }
    res.json(brand);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update Brand
 * 
 * PUT /api/brands/:id
 * Requires: Authentication (admin role only)
 */
exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Update brand (slug will be auto-updated if name changes)
    await brand.update(req.body);
    
    res.json({ 
      message: 'Brand updated successfully', 
      brand 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete Brand
 * 
 * DELETE /api/brands/:id
 * Requires: Authentication (admin role only)
 */
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Delete brand
    await brand.destroy();
    
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
