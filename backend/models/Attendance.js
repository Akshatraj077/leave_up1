const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['PENDING', 'PRESENT', 'ABSENT'], default: 'PENDING' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Compound unique index on user_id and date
attendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });
// Sorting index
attendanceSchema.index({ user_id: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
