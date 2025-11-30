/**
 * Authentication Controller
 * 
 * Handles user registration, login, profile management, and authentication
 * verification for the AgriLink platform.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Generate JWT Token
 * Creates a JSON Web Token for authenticated user sessions
 * 
 * @param {String} userId - User's unique identifier
 * @returns {String} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d' // Token expires in 7 days
  });
};

/**
 * Register New User
 * Creates a new user account with validation and password hashing
 * 
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    // Check for validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract user data from request body
    const { name, email, password, role, phone, address, farmDetails, businessDetails } = req.body;

    // Check if user with email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user (password is automatically hashed by User model hook)
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      address: address || {},
      // Role-specific details
      farmDetails: role === 'farmer' ? farmDetails : null,
      businessDetails: role === 'institutional_buyer' ? businessDetails : null
    });

    // Generate JWT token for immediate authentication
    const token = generateToken(user.id);

    // Return success response with token and user info (excluding password)
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Login User
 * Authenticates user credentials and returns JWT token
 * 
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive. Please contact support.' });
    }

    // Verify password using bcrypt (handled by User model method)
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Return success response with token and user info
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get User Profile
 * Returns authenticated user's profile information
 * 
 * GET /api/auth/profile
 * Requires: Authentication (auth middleware)
 */
exports.getProfile = async (req, res) => {
  try {
    // User is attached to req by auth middleware
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] } // Exclude password from response
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update User Profile
 * Updates authenticated user's profile information
 * 
 * PUT /api/auth/profile
 * Requires: Authentication (auth middleware)
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update allowed fields (email and password require separate endpoints)
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
