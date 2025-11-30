/**
 * Authentication Middleware
 * 
 * Provides JWT-based authentication and role-based authorization
 * middleware for protecting routes in the AgriLink application.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Verifies JWT token from request header and attaches user to request object
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const auth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Format: "Bearer <token>"
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find user by ID from token
    const user = await User.findByPk(decoded.userId);
    
    // Check if user exists and is active
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Attach user to request object for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    // Invalid or expired token
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Authorization Middleware Factory
 * Creates middleware to check if user has required role(s)
 * 
 * @param {...String} roles - One or more allowed roles
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Only allow admin and farmer
 * router.get('/products', auth, authorize('admin', 'farmer'), controller.getProducts);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user's role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { auth, authorize };
