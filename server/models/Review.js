/**
 * Review Model
 * 
 * Defines the Review database model for product reviews and ratings
 * submitted by buyers after purchasing products.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');

/**
 * Review Model Definition
 * Represents a product review/rating by a user
 */
const Review = sequelize.define('Review', {
  // Primary Key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Reference to reviewed product
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  
  // Reference to user who wrote the review
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Optional reference to order (for verified purchase reviews)
  orderId: {
    type: DataTypes.UUID,
    defaultValue: null
    // Links review to specific order to verify purchase
  },
  
  // Rating (1-5 stars)
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1, // Minimum 1 star
      max: 5  // Maximum 5 stars
    }
  },
  
  // Review comment/feedback
  comment: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  
  // Review images (photos submitted by reviewer)
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
    // Array of image URLs
  },
  
  // Verified purchase flag
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
    // true = reviewer actually purchased the product
  },
  
  // Helpful votes tracking
  helpful: {
    type: DataTypes.JSONB,
    defaultValue: { 
      count: 0,   // Number of helpful votes
      users: []   // Array of user IDs who marked as helpful
    }
  }
}, {
  tableName: 'reviews',
  timestamps: true // Adds createdAt and updatedAt fields
});

// ============================================================================
// Model Associations
// ============================================================================

/**
 * Review belongs to User (reviewer)
 * Allows accessing reviewer information through review.user
 */
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

/**
 * Review belongs to Product
 * Allows accessing product information through review.product
 */
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

module.exports = Review;
