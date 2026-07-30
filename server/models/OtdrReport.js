const mongoose = require('mongoose');

const fibreReadingSchema = new mongoose.Schema({
  fibreNo: {
    type: String,
    required: true,
  },
  circuit: {
    type: String,
    default: '',
  },
  lossDb: {
    type: String,
    default: '',
  },
  dbKm: {
    type: String,
    default: '',
  },
  otdrEvents: {
    type: Map,
    of: String,
    default: {},
  },
  remark: {
    type: String,
    default: '',
  },
});

const otdrReportSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  testDate: {
    type: String,
    required: true,
  },
  agencyName: {
    type: String,
    required: false,
    default: '',
  },
  division: {
    type: String,
    default: '',
  },
  divisionId: String,
  divisionName: String,
  majorSectionId: String,
  majorSectionName: String,
  sectionId: String,
  sectionName: String,
  fromStation: {
    type: String,
    required: false,
  },
  toStation: {
    type: String,
    required: false,
  },
  fibreLength: {
    type: String,
    required: true,
  },
  wavelength: {
    type: String,
    enum: ['1310 nm', '1550 nm'],
    required: true,
  },
  eventHeaders: {
    type: [String],
    default: ['Event 1', 'Event 2', 'Event 3', 'Event 4'],
  },
  fibreReadings: [fibreReadingSchema],
  userName: String,
  technicianName: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  attachment: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

otdrReportSchema.index({ createdAt: -1 });
otdrReportSchema.index({ userId: 1, createdAt: -1 });
otdrReportSchema.index({ testDate: 1 });
otdrReportSchema.index({ agencyName: 1 });

otdrReportSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    if (ret.createdAt) {
      ret.createdAtIST = new Date(ret.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    }
    return ret;
  }
});

module.exports = mongoose.model('OtdrReport', otdrReportSchema);
