const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

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

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const updates = req.body;
    delete updates.password;
    delete updates.role;
    delete updates.email;
    
    await user.update(updates);
    const updatedUser = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
