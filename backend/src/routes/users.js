// backend/routes/users.js
const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Add debugging middleware
router.use((req, res, next) => {
  console.log(`📡 Users route: ${req.method} ${req.path}`);
  console.log(`   Query:`, req.query);
  console.log(`   Headers:`, req.headers.authorization ? 'Auth present' : 'No auth');
  next();
});

// Search users by username or email
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    console.log('🔍 User search query:', q);
    console.log('🔍 Current user:', req.user._id);
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Search query must be at least 2 characters' 
      });
    }

    // Search for users (excluding current user)
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        },
        { _id: { $ne: req.user._id } }
      ]
    })
    .select('username email _id createdAt')
    .limit(10);

    console.log(`✅ Found ${users.length} users for query: "${q}"`);
    
    res.json(users);
  } catch (error) {
    console.error('❌ User search error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username email _id createdAt');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;