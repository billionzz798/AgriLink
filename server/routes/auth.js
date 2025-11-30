/**
 * Authentication Routes
 * 
 * Defines all authentication-related API endpoints with validation
 * and authentication middleware.
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

/**
 * User Registration Endpoint
 * 
 * POST /api/auth/register
 * 
 * Validation:
 * - name: Required, trimmed
 * - email: Valid email format, normalized
 * - password: Minimum 6 characters
 * - role: Must be one of: farmer, institutional_buyer, consumer
 * - phone: Required
 */
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['farmer', 'institutional_buyer', 'consumer']).withMessage('Valid role is required'),
  body('phone').notEmpty().withMessage('Phone number is required')
], authController.register);

/**
 * User Login Endpoint
 * 
 * POST /api/auth/login
 * 
 * Validation:
 * - email: Valid email format, normalized
 * - password: Required
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], authController.login);

/**
 * Get User Profile
 * 
 * GET /api/auth/profile
 * 
 * Requires: Authentication token
 * Returns: Current user's profile information
 */
router.get('/profile', auth, authController.getProfile);

/**
 * Update User Profile
 * 
 * PUT /api/auth/profile
 * 
 * Requires: Authentication token
 * Allows updating: name, phone, address
 */
router.put('/profile', auth, authController.updateProfile);

/**
 * Check Authentication Status
 * 
 * GET /api/auth/check-auth
 * 
 * Requires: Authentication token
 * Returns: Authentication status and user information
 * Used by frontend to verify if token is still valid
 */
router.get('/check-auth', auth, (req, res) => {
  res.json({ 
    authenticated: true, 
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
