const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

// Helper function to generate order number
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `AGR-${timestamp}-${random}`;
}

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    defaultValue: () => generateOrderNumber()
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  farmerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  items: {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  shipping: {
    type: DataTypes.JSONB,
    defaultValue: { cost: 0, method: 'standard' }
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'payment_pending', 'payment_failed'),
    defaultValue: 'payment_pending'
  },
  deliveryAddress: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  payment: {
    type: DataTypes.JSONB,
    defaultValue: {
      method: null,
      status: 'pending',
      reference: null,
      amount: null,
      paidAt: null,
      currency: 'GHS'
    }
  }
}, {
  tableName: 'orders',
  timestamps: true,
  hooks: {
    beforeCreate: (order) => {
      if (!order.orderNumber) {
        order.orderNumber = generateOrderNumber();
      }
    },
    beforeValidate: (order) => {
      if (!order.orderNumber) {
        order.orderNumber = generateOrderNumber();
      }
    }
  }
});

Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Order.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

module.exports = Order;
