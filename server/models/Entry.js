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
  attachment: String, // Base64 encoded file or image
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Entry', entrySchema);
