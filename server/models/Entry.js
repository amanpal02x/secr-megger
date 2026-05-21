const mongoose = require('mongoose');

const quadReadingSchema = new mongoose.Schema({
  quadNo: String,
  loopResistance: String,
  insulationL1E: String,
  insulationL2E: String,
  insulationL1L2: String,
  dbLoss: String,
  coreSize: String,
  next: String,
  fext: String,
  noiseLevel: String,
  armerContinuity: String,
  remark: String,
});

const entrySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  divisionId: String,
  divisionName: String,
  majorSectionId: String,
  majorSectionName: String,
  sectionId: String,
  sectionName: String,
  quadReadings: [quadReadingSchema],
  technicianName: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  supervisorName: String,
  testDate: String,
  condition: String,
  attachment: String,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

entrySchema.virtual('submittedBy').get(function() {
  return this.userId && this.userId.name ? this.userId.name : undefined;
});

entrySchema.virtual('submittedByPhone').get(function() {
  return this.userId && this.userId.phoneNumber ? this.userId.phoneNumber : undefined;
});

entrySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    if (ret.createdAt) {
      ret.createdAtIST = new Date(ret.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    }
    return ret;
  }
});

entrySchema.set('toObject', {
  virtuals: true,
  transform: function (doc, ret) {
    if (ret.createdAt) {
      ret.createdAtIST = new Date(ret.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    }
    return ret;
  }
});

module.exports = mongoose.model('Entry', entrySchema);
