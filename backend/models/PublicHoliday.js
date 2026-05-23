const mongoose = require('mongoose');

const publicHolidaySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  year: { type: Number, required: true, index: true },
  type: {
    type: String,
    enum: ['NATIONAL', 'REGIONAL', 'OPTIONAL'],
    default: 'NATIONAL'
  },
  regions: [String], // ISO codes e.g. ["IN-WB", "IN-TN"]
  isGlobal: { type: Boolean, default: true },
  applicableStates: [String], // state codes e.g. ["MH", "WB"]
  note: { type: String, default: '' },
  isCustom: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  source: {
    type: String,
    enum: ['API', 'MANUAL'],
    default: 'API'
  }
});

// Compound index for efficient querying by year + date
publicHolidaySchema.index({ year: 1, date: 1 });

// Compound unique index to prevent duplicate API entries
publicHolidaySchema.index({ name: 1, date: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('PublicHoliday', publicHolidaySchema);
