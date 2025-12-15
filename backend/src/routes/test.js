const express = require('express');
const router = express.Router();

// Public test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    endpoint: '/api/test'
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected', // You can add MongoDB check here
      api: 'running'
    }
  });
});

module.exports = router;