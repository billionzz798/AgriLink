const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Category = require('./Category');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
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
  images: {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    defaultValue: []
  },
  pricing: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      b2b: { price: 0, minQuantity: 0, unit: 'kg' },
      b2c: { price: 0, unit: 'kg' }
    }
  },
  inventory: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalQuantity: 0,
      availableQuantity: 0,
      reservedQuantity: 0
    }
  },
  specifications: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  marketplace: {
    type: DataTypes.ENUM('b2b', 'b2c', 'both'),
    defaultValue: 'both'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'out_of_stock'),
    defaultValue: 'active'
  },
  rating: {
    type: DataTypes.JSONB,
    defaultValue: { average: 0, count: 0 }
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  }
}, {
  tableName: 'products',
  timestamps: true
});

Product.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = Product;
