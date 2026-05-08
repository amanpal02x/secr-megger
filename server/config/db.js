const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secr-megger');
    console.log('-----------------------------------------');
    console.log(`✅ SUCCESS: MongoDB Connected to: ${conn.connection.host}`);
    console.log('-----------------------------------------');
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('Server is running, but database features will be unavailable until connected.');
  }
};

module.exports = connectDB;
