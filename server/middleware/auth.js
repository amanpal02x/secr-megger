const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(403).json({ message: 'User not authorized' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'User account is inactive' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'global_admin' || req.user.role === 'sub_admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  console.log('[API KEY AUTH] Headers received:', Object.keys(req.headers));
  console.log('[API KEY AUTH] x-api-key header present:', !!apiKey);
  
  if (apiKey) {
    console.log('[API KEY AUTH] x-api-key value (masked):', apiKey.substring(0, 8) + '...');
    try {
      const user = await User.findOne({ apiKey }).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Invalid API Key' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'User account is inactive' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('[API KEY AUTH] Verification Error:', error);
      res.status(500).json({ 
        message: 'Server Error during API Key verification'
      });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no API key provided' });
  }
};

const authorize = async (req, res, next) => {
  if (req.headers['x-api-key']) {
    return apiKeyAuth(req, res, next);
  }
  // Support ChatGPT sending API keys via Authorization: Bearer secr_...
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer secr_')) {
    req.headers['x-api-key'] = req.headers.authorization.split(' ')[1];
    return apiKeyAuth(req, res, next);
  }
  return protect(req, res, next);
};

module.exports = { protect, adminOnly, apiKeyAuth, authorize };
