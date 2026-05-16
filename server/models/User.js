const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  role: {
    type: String,
    enum: ['global_admin', 'sub_admin', 'user', 'admin'], // keep 'admin' temporarily to avoid validation errors during migration
    default: 'user',
  },
  division: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
