const Brand = require('../models/Brand');
const { validationResult } = require('express-validator');

exports.createBrand = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const brand = await Brand.create(req.body);
    res.status(201).json({ message: 'Brand created successfully', brand });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.findAll({
      where: req.query.isActive !== undefined ? { isActive: req.query.isActive === 'true' } : {},
      order: [['name', 'ASC']]
    });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    await brand.update(req.body);
    res.json({ message: 'Brand updated successfully', brand });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    await brand.destroy();
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
