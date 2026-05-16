const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
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
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
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
      res.status(500).json({ message: 'Server Error during API Key verification' });
    }
  } else {
    // If no API key, fall back to protect (JWT) logic or just fail
    // For routes that allow both, we can use a wrapper.
    res.status(401).json({ message: 'Not authorized, no API key provided' });
  }
};

// Allows either JWT or API Key
const authorize = async (req, res, next) => {
  if (req.headers['x-api-key']) {
    return apiKeyAuth(req, res, next);
  }
  return protect(req, res, next);
};

module.exports = { protect, adminOnly, apiKeyAuth, authorize };
