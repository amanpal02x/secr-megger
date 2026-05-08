const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const resetPassword = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');

    const email = 'admin@secr.gov.in';
    const newPassword = 'Admin@12345'; // Your new portal password

    const user = await User.findOne({ email });

    if (!user) {
      console.log('Admin user not found. Creating a new one...');
      await User.create({
        email,
        password: newPassword,
        role: 'admin',
        isActive: true
      });
      console.log('Admin created successfully!');
    } else {
      user.password = newPassword;
      await user.save();
      console.log('Password updated successfully with hashing!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetPassword();
