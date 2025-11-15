const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');
const { body } = require('express-validator');

router.post('/', auth, [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  try {
    const review = await Review.create({
      ...req.body,
      userId: req.user.id
    });

    const reviewWithUser = await Review.findByPk(review.id, {
      include: [{ model: require('../models/User'), as: 'user', attributes: ['id', 'name'] }]
    });

    res.status(201).json({ message: 'Review created successfully', review: reviewWithUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { productId: req.params.productId },
      include: [{ model: require('../models/User'), as: 'user', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
