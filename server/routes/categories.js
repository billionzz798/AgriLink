const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { auth, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: req.query.isActive !== undefined ? { isActive: req.query.isActive === 'true' } : {},
      include: [{ model: Category, as: 'parent', attributes: ['id', 'name', 'slug'] }],
      order: [['name', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [{ model: Category, as: 'parent' }]
    });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, authorize('admin'), [
  body('name').notEmpty().withMessage('Category name is required')
], async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    await category.update(req.body);
    res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
