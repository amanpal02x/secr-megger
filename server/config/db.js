const mongoose = require('mongoose');

const connectDB = async () => {
  try {

    mongoose.set('bufferCommands', true);

    let dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secr-megger';



    const conn = await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ SUCCESS: MongoDB Connected to: ${conn.connection.host}`);
    

    // Run migration asynchronously in the background to prevent blocking startup
    (async () => {
      try {
        const User = require('../models/User');
        const res = await User.updateMany({ role: 'admin' }, { $set: { role: 'global_admin' } });
        if (res.modifiedCount > 0) console.log(`Migrated ${res.modifiedCount} admin users to global_admin.`);
      } catch (migErr) {
        console.error('Migration error:', migErr.message);
      }
    })();
  } catch (error) {
    mongoose.connection.lastError = {
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString()
    };
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('Server is running, but database features will be unavailable until connected.');
  }
};

module.exports = connectDB;
