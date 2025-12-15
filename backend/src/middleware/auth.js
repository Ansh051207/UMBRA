const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    console.log('🔍 BACKEND AUTH: =========== Auth Middleware Called ===========');
    console.log('🔍 BACKEND AUTH: Request URL:', req.originalUrl);
    console.log('🔍 BACKEND AUTH: Request Method:', req.method);
    
    // Log all headers for debugging
    const authHeader = req.header('Authorization');
    console.log('🔍 BACKEND AUTH: Authorization Header:', authHeader || 'Missing');
    
    const token = authHeader?.replace('Bearer ', '');
    
    console.log('🔍 BACKEND AUTH: Token after cleanup:', token ? `Present (${token.length} chars)` : 'Missing');
    
    if (!token) {
      console.log('🔍 BACKEND AUTH: ERROR: No token provided in Authorization header');
      throw new Error('No token provided');
    }

    // Verify token
    console.log('🔍 BACKEND AUTH: Verifying token with JWT_SECRET...');
    console.log('🔍 BACKEND AUTH: JWT_SECRET present:', !!process.env.JWT_SECRET);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔍 BACKEND AUTH: ✅ Token decoded successfully');
      console.log('🔍 BACKEND AUTH: Decoded payload:', decoded);
      
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        console.log('🔍 BACKEND AUTH: ❌ ERROR: User not found in database for ID:', decoded.userId);
        throw new Error('User not found');
      }

      console.log('🔍 BACKEND AUTH: ✅ User authenticated:', {
        id: user._id,
        email: user.email,
        username: user.username
      });
      
      req.user = user;
      req.token = token;
      next();
    } catch (jwtError) {
      console.error('🔍 BACKEND AUTH: ❌ JWT Verification Error:', {
        name: jwtError.name,
        message: jwtError.message,
        expiredAt: jwtError.expiredAt
      });
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired', 
          expiredAt: jwtError.expiredAt 
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Invalid token', 
          message: jwtError.message 
        });
      }
      
      throw jwtError;
    }
  } catch (error) {
    console.error('🔍 BACKEND AUTH: ❌ Auth Middleware Error:', error.message);
    
    // Check if it's a JWT secret issue
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_this_in_production') {
      console.error('🔍 BACKEND AUTH: ⚠️ WARNING: Using default JWT_SECRET. Change it in production!');
    }
    
    res.status(401).json({ 
      error: 'Authentication required',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};



module.exports = auth;