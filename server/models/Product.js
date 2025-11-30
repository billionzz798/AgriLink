/**
 * Product Model
 * 
 * Defines the Product database model representing agricultural products
 * listed by farmers on the AgriLink platform.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Category = require('./Category');

/**
 * Product Model Definition
 * Represents a product listing in the marketplace
 */
const Product = sequelize.define('Product', {
  // Primary Key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Product name
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // Product description
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  // Reference to category
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  
  // Reference to farmer (seller)
  farmerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Product images array
  images: {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    defaultValue: []
    // Each image: {url: String, alt: String, isPrimary: Boolean}
  },
  
  // Dual marketplace pricing structure
  pricing: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      b2b: { 
        price: 0,        // B2B price per unit
        minQuantity: 0, // Minimum quantity for B2B orders
        unit: 'kg'      // Unit of measurement
      },
      b2c: { 
        price: 0,       // B2C price per unit
        unit: 'kg'      // Unit of measurement
      }
    }
  },
  
  // Inventory management
  inventory: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalQuantity: 0,      // Total quantity in stock
      availableQuantity: 0,  // Available for purchase
      reservedQuantity: 0    // Reserved for pending orders
    }
  },
  
  // Product specifications (weight, size, etc.)
  specifications: {
    type: DataTypes.JSONB,
    defaultValue: {}
    // Flexible structure for product-specific attributes
  },
  
  // Marketplace availability
  marketplace: {
    type: DataTypes.ENUM('b2b', 'b2c', 'both'),
    defaultValue: 'both'
    // Determines which marketplace(s) the product is available in
  },
  
  // Product status
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'out_of_stock'),
    defaultValue: 'active'
  },
  
  // Rating and review summary
  rating: {
    type: DataTypes.JSONB,
    defaultValue: { 
      average: 0,  // Average rating (0-5)
      count: 0     // Number of reviews
    }
  },
  
  // Product tags for search and filtering
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
    // Example: ['organic', 'fresh', 'local']
  }
}, {
  tableName: 'products',
  timestamps: true // Adds createdAt and updatedAt fields
});

// ============================================================================
// Model Associations
// ============================================================================

/**
 * Product belongs to User (farmer)
 * Allows accessing farmer information through product.farmer
 */
Product.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

/**
 * Product belongs to Category
 * Allows accessing category information through product.category
 */
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = Product;
