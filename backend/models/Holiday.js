const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  type: {
    type: String,
    enum: ['NATIONAL', 'REGIONAL', 'OPTIONAL'],
    default: 'NATIONAL'
  },
  isGlobal: {
    type: Boolean,
    default: true
  },
  applicableStates: {
    type: [String],
    default: []
  }
});

module.exports = mongoose.model('Holiday', holidaySchema);
