/**
 * Order Model
 * 
 * Defines the Order database model representing transactions between
 * buyers and farmers in the AgriLink platform.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

/**
 * Generate Unique Order Number
 * Creates a unique identifier for each order
 * Format: AGR-{timestamp}-{randomString}
 * 
 * @returns {String} Unique order number
 */
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `AGR-${timestamp}-${random}`;
}

/**
 * Order Model Definition
 * Represents an order/transaction in the system
 */
const Order = sequelize.define('Order', {
  // Primary Key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Unique order identifier for customer reference
  orderNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    defaultValue: () => generateOrderNumber()
  },
  
  // Reference to buyer (consumer or institutional buyer)
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
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
  
  // Array of order items (products with quantities and prices)
  items: {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    allowNull: false
    // Each item contains: {product: UUID, productName: String, quantity: Number, price: Decimal, unit: String}
  },
  
  // Subtotal before shipping
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  // Shipping information
  shipping: {
    type: DataTypes.JSONB,
    defaultValue: { cost: 0, method: 'standard' }
    // Contains: {cost: Decimal, method: String}
  },
  
  // Total amount including shipping
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  // Order status in the fulfillment lifecycle
  status: {
    type: DataTypes.ENUM(
      'pending',           // Order created, awaiting confirmation
      'confirmed',        // Payment confirmed, order being processed
      'processing',        // Order being prepared
      'shipped',          // Order shipped to buyer
      'delivered',        // Order delivered successfully
      'cancelled',        // Order cancelled
      'payment_pending',  // Awaiting payment
      'payment_failed'    // Payment failed
    ),
    defaultValue: 'payment_pending'
  },
  
  // Delivery address for the order
  deliveryAddress: {
    type: DataTypes.JSONB,
    allowNull: false
    // Contains: {street: String, city: String, region: String, postalCode: String}
  },
  
  // Optional notes from buyer
  notes: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  
  // Payment information
  payment: {
    type: DataTypes.JSONB,
    defaultValue: {
      method: null,        // Payment method (e.g., 'paystack')
      status: 'pending',   // Payment status (pending, success, failed)
      reference: null,     // Payment reference from gateway
      amount: null,        // Amount paid
      paidAt: null,       // Payment timestamp
      currency: 'GHS'      // Currency code
    }
  }
}, {
  tableName: 'orders',
  timestamps: true, // Adds createdAt and updatedAt fields
  
  // Model hooks
  hooks: {
    /**
     * Before creating order, ensure order number is generated
     */
    beforeCreate: (order) => {
      if (!order.orderNumber) {
        order.orderNumber = generateOrderNumber();
      }
    },
    
    /**
     * Before validating order, ensure order number exists
     */
    beforeValidate: (order) => {
      if (!order.orderNumber) {
        order.orderNumber = generateOrderNumber();
      }
    }
  }
});

// ============================================================================
// Model Associations
// ============================================================================

/**
 * Order belongs to User (buyer)
 * Allows accessing buyer information through order.buyer
 */
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });

/**
 * Order belongs to User (farmer)
 * Allows accessing farmer information through order.farmer
 */
Order.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

module.exports = Order;
