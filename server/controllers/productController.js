/**
 * Product Controller
 * 
 * Handles all product-related operations including creation, retrieval,
 * updating, and deletion. Manages product listings for farmers.
 */

const Product = require('../models/Product');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

/**
 * Create New Product
 * Allows farmers to list new products on the platform
 * 
 * POST /api/products
 * Requires: Authentication (farmer role)
 */
exports.createProduct = async (req, res) => {
  try {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only farmers can create products
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can create products' });
    }

    // Create product with farmer ID from authenticated user
    const product = await Product.create({
      ...req.body,
      farmerId: req.user.id
    });

    // Fetch product with related data (category and farmer info)
    const productWithRelations = await Product.findByPk(product.id, {
      include: [
        { model: require('../models/Category'), as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    res.status(201).json({ 
      message: 'Product created successfully', 
      product: productWithRelations 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Products
 * Retrieves products with filtering, searching, and pagination
 * 
 * GET /api/products
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - category: Filter by category ID
 * - marketplace: Filter by marketplace (b2b, b2c, both)
 * - search: Search in name and description
 * - farmer: Filter by farmer ID
 * - sort: Sort field (default: -createdAt for newest first)
 */
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      marketplace,
      search,
      farmer,
      sort = '-createdAt'
    } = req.query;

    // Base query - only show active products
    const query = { status: 'active' };
    
    // Include related data
    const includeOptions = [
      { model: require('../models/Category'), as: 'category', attributes: ['id', 'name', 'slug'] },
      { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone', 'address', 'farmDetails'] }
    ];

    // Apply filters
    if (category) query.categoryId = category;
    if (farmer) query.farmerId = farmer;
    
    // Marketplace filter (show products available in specified marketplace)
    if (marketplace) {
      query[Op.or] = [
        { marketplace: marketplace },
        { marketplace: 'both' }
      ];
    }
    
    // Search filter (case-insensitive search in name and description)
    if (search) {
      query[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Parse sort parameter
    // Format: "-field" for descending, "field" for ascending
    const order = sort.startsWith('-') 
      ? [[sort.substring(1), 'DESC']]
      : [[sort, 'ASC']];

    // Fetch products with pagination
    const products = await Product.findAndCountAll({
      where: query,
      include: includeOptions,
      order: order,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      products: products.rows,
      totalPages: Math.ceil(products.count / limit),
      currentPage: parseInt(page),
      total: products.count
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Single Product
 * Retrieves detailed information about a specific product
 * 
 * GET /api/products/:id
 */
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: require('../models/Category'), as: 'category' },
        { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone', 'address', 'farmDetails'] }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update Product
 * Updates product information (only by product owner or admin)
 * 
 * PUT /api/products/:id
 * Requires: Authentication
 * Authorization: Product owner (farmer) or admin
 */
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Authorization check: only farmer who owns product or admin can update
    if (product.farmerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    // Update product fields
    await product.update(req.body);

    // Fetch updated product with relations
    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        { model: require('../models/Category'), as: 'category' },
        { model: require('../models/User'), as: 'farmer' }
      ]
    });

    res.json({ 
      message: 'Product updated successfully', 
      product: updatedProduct 
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete Product
 * Soft delete or hard delete a product
 * 
 * DELETE /api/products/:id
 * Requires: Authentication
 * Authorization: Product owner (farmer) or admin
 */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Authorization check
    if (product.farmerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    // Delete product
    await product.destroy();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: error.message });
  }
};
