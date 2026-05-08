const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  division: String,
  majorSection: String,
  section: String,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Location', locationSchema);
