/**
 * Review Routes
 * 
 * Defines all review-related API endpoints for product reviews and ratings.
 */

const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');
const { body } = require('express-validator');

/**
 * Create Review
 * Allows authenticated users to submit product reviews
 * 
 * POST /api/reviews
 * Requires: Authentication
 * 
 * Request Body Validation:
 * - productId: Product ID being reviewed (required)
 * - rating: Rating value 1-5 (required)
 * - comment: Review text (optional)
 * - images: Array of image URLs (optional)
 * - orderId: Order ID for verified purchase (optional)
 */
router.post('/', auth, [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  try {
    // Create review with authenticated user ID
    const review = await Review.create({
      ...req.body,
      userId: req.user.id
    });

    // Fetch review with user information
    const reviewWithUser = await Review.findByPk(review.id, {
      include: [{ 
        model: require('../models/User'), 
        as: 'user', 
        attributes: ['id', 'name'] 
      }]
    });

    res.status(201).json({ 
      message: 'Review created successfully', 
      review: reviewWithUser 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get Product Reviews
 * Retrieves all reviews for a specific product
 * 
 * GET /api/reviews/product/:productId
 * Public endpoint (no authentication required)
 * 
 * Returns reviews ordered by creation date (newest first)
 * Includes reviewer information
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { productId: req.params.productId },
      include: [{ 
        model: require('../models/User'), 
        as: 'user', 
        attributes: ['id', 'name'] 
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
