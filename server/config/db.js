const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Disable Mongoose command buffering globally to prevent queries from hanging forever during database offline/DNS lookup lags
    mongoose.set('bufferCommands', false);

    let dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secr-megger';

    // Auto-optimize legacy replica-set URIs to modern serverless-friendly mongodb+srv:// URIs
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

    // Perform raw TLS diagnostics on boot to pinpoint root cause of connection closures
    try {
      const tls = require('tls');
      const dns = require('dns');
      const diagHost = 'ac-s4x4fjx-shard-00-01.eivnsxz.mongodb.net';
      const diagPort = 27017;
      console.log(`🔍 [BOOT DIAGNOSTICS] Testing raw TLS connection to ${diagHost}...`);
      
      dns.lookup(diagHost, (dnsErr, address) => {
        if (dnsErr) {
          console.error('❌ [BOOT DIAGNOSTICS] DNS Lookup failed:', dnsErr.message);
          return;
        }
        console.log(`✅ [BOOT DIAGNOSTICS] DNS Resolved to: ${address}`);
        
        const socket = tls.connect({
          host: diagHost,
          port: diagPort,
          servername: diagHost,
          rejectUnauthorized: true
        }, () => {
          console.log(`✅ [BOOT DIAGNOSTICS] Raw TLS Connection to ${diagHost} succeeded!`);
          socket.destroy();
        });
        
        socket.on('error', (tlsErr) => {
          console.error(`❌ [BOOT DIAGNOSTICS] Raw TLS Connection failed: ${tlsErr.message} (Code: ${tlsErr.code})`);
        });
      });
    } catch (diagErr) {
      console.error('⚠️ [BOOT DIAGNOSTICS] Setup failed:', diagErr.message);
    }

    const conn = await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 30000, // Allow up to 30 seconds for cross-region serverless cold-starts
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
