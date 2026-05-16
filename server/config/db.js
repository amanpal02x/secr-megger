const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Disable Mongoose command buffering globally to prevent queries from hanging forever during database offline/DNS lookup lags
    mongoose.set('bufferCommands', false);

    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secr-megger', {
      serverSelectionTimeoutMS: 5000, // Fail fast (5 seconds) instead of waiting for default 30 seconds
      socketTimeoutMS: 45000,
    });
    console.log(`✅ SUCCESS: MongoDB Connected to: ${conn.connection.host}`);
    
    // Auto-migrate legacy admins
    try {
      const User = require('../models/User');
      const res = await User.updateMany({ role: 'admin' }, { $set: { role: 'global_admin' } });
      if (res.modifiedCount > 0) console.log(`Migrated ${res.modifiedCount} admin users to global_admin.`);
    } catch (migErr) {
      console.error('Migration error:', migErr.message);
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('Server is running, but database features will be unavailable until connected.');
  }
};

module.exports = connectDB;
