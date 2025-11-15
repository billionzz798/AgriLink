const Product = require('../models/Product');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

exports.createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can create products' });
    }

    const product = await Product.create({
      ...req.body,
      farmerId: req.user.id
    });

    const productWithRelations = await Product.findByPk(product.id, {
      include: [
        { model: require('../models/Category'), as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    res.status(201).json({ message: 'Product created successfully', product: productWithRelations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

    const query = { status: 'active' };
    const includeOptions = [
      { model: require('../models/Category'), as: 'category', attributes: ['id', 'name', 'slug'] },
      { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone', 'address', 'farmDetails'] }
    ];

    if (category) query.categoryId = category;
    if (farmer) query.farmerId = farmer;
    if (marketplace) {
      query[Op.or] = [
        { marketplace: marketplace },
        { marketplace: 'both' }
      ];
    }
    if (search) {
      query[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const order = sort.startsWith('-') 
      ? [[sort.substring(1), 'DESC']]
      : [[sort, 'ASC']];

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
    res.status(500).json({ message: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: require('../models/Category'), as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: require('../models/User'), as: 'farmer', attributes: ['id', 'name', 'email', 'phone', 'address', 'farmDetails'] }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.farmerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    await product.update(req.body);
    await product.reload();

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.farmerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
