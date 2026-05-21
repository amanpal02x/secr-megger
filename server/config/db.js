const mongoose = require('mongoose');

const connectDB = async () => {
  // If already connected (1) or connecting (2), do nothing to prevent duplicate connection loops
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  try {

    mongoose.set('bufferCommands', true);

    let dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secr-megger';

    if (dbUri && dbUri.startsWith('mongodb://') && dbUri.includes('.mongodb.net')) {
      try {
        const urlPattern = /^mongodb:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)$/;
        const match = dbUri.match(urlPattern);
        if (match) {
          const username = match[1];
          const password = match[2];
          const hosts = match[3].split(',');
          const dbAndParams = match[4];
          
          const firstHost = hosts[0].split(':')[0];
          if (firstHost.includes('-shard-')) {
            const clusterPrefix = firstHost.split('-shard-')[0];
            const firstDotIndex = firstHost.indexOf('.');
            const suffix = firstHost.substring(firstDotIndex + 1);
            const srvHost = `${clusterPrefix}.${suffix}`;
            
            // Clean up legacy ssl parameters if present, since SRV implicitly uses SSL/TLS
            const cleanParams = dbAndParams.replace('ssl=true&', '').replace('&ssl=true', '');
            const srvUri = `mongodb+srv://${username}:${password}@${srvHost}/${cleanParams}`;
            
            console.log('⚡ Auto-optimized legacy replica-set MONGO_URI to serverless SRV format.');
            dbUri = srvUri;
          }
        }
      } catch (err) {
        console.warn('⚠️ Failed to auto-optimize MONGO_URI, connecting with original:', err.message);
      }
    }



    const conn = await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ SUCCESS: MongoDB Connected to: ${conn.connection.host}`);
    
    // Clear last error upon successful connection
    mongoose.connection.lastError = null;

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
    
    console.log('🔄 Scheduling MongoDB connection retry in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
