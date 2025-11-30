/**
 * Brand Model
 * 
 * Defines the Brand database model for product branding and organization.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Generate URL-friendly slug from brand name
 * Converts name to lowercase and replaces spaces/special chars with hyphens
 * 
 * @param {String} name - Brand name
 * @returns {String} URL-friendly slug
 */
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/(^-|-$)/g, '');      // Remove leading/trailing hyphens
}

/**
 * Brand Model Definition
 * Represents product brands in the marketplace
 */
const Brand = sequelize.define('Brand', {
  // Primary Key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Brand name (e.g., "FarmFresh", "Green Valley")
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  
  // URL-friendly identifier (e.g., "farmfresh", "green-valley")
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  
  // Brand description
  description: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  
  // Brand logo URL
  logo: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  
  // Brand website URL
  website: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  
  // Brand status (active/inactive)
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'brands',
  timestamps: true, // Adds createdAt and updatedAt fields
  
  // Model hooks for automatic slug generation
  hooks: {
    /**
     * Before creating brand, generate slug if not provided
     */
    beforeCreate: (brand) => {
      if (!brand.slug && brand.name) {
        brand.slug = generateSlug(brand.name);
      }
    },
    
    /**
     * Before updating brand, regenerate slug if name changed
     */
    beforeUpdate: (brand) => {
      if (brand.changed('name') && !brand.changed('slug')) {
        brand.slug = generateSlug(brand.name);
      }
    }
  }
});

module.exports = Brand;
