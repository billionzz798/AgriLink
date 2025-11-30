/**
 * User Routes
 * 
 * Defines all user-related API endpoints for user management.
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

/**
 * Get Farmers List
 * 
 * GET /api/users/farmers
 * Public endpoint (no authentication required)
 * 
 * Returns list of active, verified farmers (for buyer selection)
 * Limited to 20 results
 */
router.get('/farmers', async (req, res) => {
  try {
    const farmers = await User.findAll({
      where: { 
        role: 'farmer', 
        isActive: true, 
        isVerified: true 
      },
      attributes: ['id', 'name', 'email', 'phone', 'address', 'farmDetails', 'avatar'],
      limit: 20
    });
    res.json(farmers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get All Users
 * 
 * GET /api/users
 * Requires: Authentication (admin role only)
 * 
 * Returns all users in the system (excluding passwords)
 * Ordered by creation date (newest first)
 */
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }, // Never return passwords
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get Single User
 * 
 * GET /api/users/:id
 * Public endpoint (no authentication required)
 * 
 * Returns user information (excluding password)
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Update User
 * 
 * PUT /api/users/:id
 * Requires: Authentication (admin role only)
 * 
 * Protected Fields (cannot be updated via this endpoint):
 * - password: Use password reset endpoint
 * - role: Use admin-specific role management
 * - email: Email cannot be changed after registration
 * 
 * Allowed Updates:
 * - name, phone, address, isActive, farmDetails, businessDetails
 */
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent updating sensitive fields
    const updates = req.body;
    delete updates.password; // Password updates require separate endpoint
    delete updates.role;     // Role changes require admin action
    delete updates.email;    // Email cannot be changed
    
    await user.update(updates);
    
    // Return updated user without password
    const updatedUser = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.json({ 
      message: 'User updated successfully', 
      user: updatedUser 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
