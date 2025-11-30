/**
 * User Model
 * 
 * Defines the User database model with Sequelize ORM.
 * Handles user authentication, password hashing, and role management.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * User Model Definition
 * Represents users in the AgriLink platform (farmers, consumers, institutional buyers, admins)
 */
const User = sequelize.define('User', {
  // Primary Key - UUID for better security and distribution
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // User's full name
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  
  // Email address (unique identifier for login)
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  
  // Password (will be hashed before saving)
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100] // Minimum 6 characters
    }
  },
  
  // User role: determines access permissions and marketplace type
  role: {
    type: DataTypes.ENUM('farmer', 'institutional_buyer', 'consumer', 'admin'),
    allowNull: false
  },
  
  // Contact phone number
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // Delivery/billing address (stored as JSON)
  address: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Farm details (only for farmers)
  farmDetails: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  
  // Business details (only for institutional buyers)
  businessDetails: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  
  // Account status (active/inactive)
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  timestamps: true, // Automatically adds createdAt and updatedAt fields
  
  // Model hooks for password hashing
  hooks: {
    /**
     * Before creating a new user, hash the password
     */
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    
    /**
     * Before updating user, hash password if it's being changed
     */
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

/**
 * Instance Method: Compare Password
 * Compares provided password with stored hashed password
 * 
 * @param {String} candidatePassword - Password to compare
 * @returns {Promise<Boolean>} True if passwords match
 */
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
