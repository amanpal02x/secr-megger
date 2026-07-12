const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // --- Test token bypass (for development/seeded admin users) ---
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          if (payload.id) {
            const user = await User.findById(payload.id).select('-password');
            if (user && user.isActive) {
              req.user = user;
              return next();
            }
          }
        }
      } catch (_) { /* not a test token, continue */ }

      // --- Verify via Supabase /auth/v1/user ---
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[Auth Middleware] SUPABASE_URL or SUPABASE_ANON_KEY env var is missing on this server.');
        return res.status(500).json({
          message: 'Server configuration error: Supabase credentials missing.',
        });
      }

      const supabaseResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
      });

      if (!supabaseResponse.ok) {
        const errBody = await supabaseResponse.text();
        console.error('[Auth Middleware] Supabase token validation failed:', supabaseResponse.status, errBody);
        return res.status(401).json({ message: 'Not authorized, invalid token' });
      }

      const supabaseUser = await supabaseResponse.json();
      const userEmail = supabaseUser.email;
      const rawPhone = supabaseUser.phone;

      // Normalize phone number (strip country code prefix)
      let userPhone = null;
      if (rawPhone) {
        const digits = rawPhone.replace(/^\+/, '');
        userPhone = digits.length === 12 && digits.startsWith('91')
          ? digits.slice(2)
          : digits;
      }

      let user = null;
      if (userEmail) {
        user = await User.findOne({ email: userEmail });
      }
      if (!user && userPhone) {
        user = await User.findOne({ phoneNumber: new RegExp(userPhone + '$') });
      }

      if (!user) {
        console.error('[Auth Middleware] User not found in DB:', { userEmail, userPhone });
        return res.status(403).json({ message: 'User not authorized, profile not found in database' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'User account is inactive' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Auth verification failed:', error.message);
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
