const mongoose = require('mongoose');

const connectDB = async () => {
  try {

    mongoose.set('bufferCommands', false);

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
          const domainParts = firstHost.split('.');
          if (domainParts.length >= 3) {
            const baseDomain = domainParts.slice(-3).join('.');
            const srvUri = `mongodb+srv://${username}:${password}@${baseDomain}/${dbAndParams}`;
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
