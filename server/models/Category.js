/**
 * Category Model
 * 
 * Defines the Category database model for organizing products
 * in a hierarchical structure (supports parent-child relationships).
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Generate URL-friendly slug from category name
 * Converts name to lowercase and replaces spaces/special chars with hyphens
 * 
 * @param {String} name - Category name
 * @returns {String} URL-friendly slug
 */
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/(^-|-$)/g, '');      // Remove leading/trailing hyphens
}

/**
 * Category Model Definition
 * Represents product categories in the marketplace
 */
const Category = sequelize.define('Category', {
  // Primary Key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Category name (e.g., "Vegetables", "Fruits")
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  
  // URL-friendly identifier (e.g., "vegetables", "fresh-fruits")
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  
  // Category description
  description: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  
  // Category image URL
  image: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  
  // Parent category ID (for hierarchical structure)
  // null = top-level category
  parentId: {
    type: DataTypes.UUID,
    defaultValue: null,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  
  // Category status (active/inactive)
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'categories',
  timestamps: true, // Adds createdAt and updatedAt fields
  
  // Model hooks for automatic slug generation
  hooks: {
    /**
     * Before creating category, generate slug if not provided
     */
    beforeCreate: (category) => {
      if (!category.slug && category.name) {
        category.slug = generateSlug(category.name);
      }
    },
    
    /**
     * Before updating category, regenerate slug if name changed
     */
    beforeUpdate: (category) => {
      if (category.changed('name') && !category.changed('slug')) {
        category.slug = generateSlug(category.name);
      }
    }
  }
});

// ============================================================================
// Model Associations (Self-Referencing)
// ============================================================================

/**
 * Category belongs to Category (parent)
 * Allows accessing parent category through category.parent
 */
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });

/**
 * Category has many Categories (children)
 * Allows accessing child categories through category.children
 */
Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });

module.exports = Category;
