const mongoose = require('mongoose');
const connectDB = require('../config/db');

const ensureDbConnected = async (req, res, next) => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  console.log(`⏳ [DB Check] Database state is ${mongoose.connection.readyState}. Awaiting connection...`);
  
  if (mongoose.connection.readyState === 0) {
    // Attempt reconnect in background
    connectDB();
  }

  // Wait for connection with a fast timeout (2.0 seconds) to return 503 instead of timing out ChatGPT's action
  const connected = await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('⚠️ [DB Check] Database connection wait timed out.');
      resolve(false);
    }, 2000);

    const checkState = () => {
      if (mongoose.connection.readyState === 1) {
        clearTimeout(timeout);
        resolve(true);
      }
    };

    // Check immediately in case it connected concurrently
    checkState();

    mongoose.connection.once('connected', () => {
      clearTimeout(timeout);
      resolve(true);
    });

    mongoose.connection.once('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });

  if (connected || mongoose.connection.readyState === 1) {
    return next();
  }

  res.status(503).json({ 
    error: 'Database connection is currently warming up. Please retry in 5 seconds.' 
  });
};

module.exports = { ensureDbConnected };
