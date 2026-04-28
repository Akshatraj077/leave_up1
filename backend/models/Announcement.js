const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  priority: { type: String, enum: ['NORMAL', 'HIGH'], default: 'NORMAL' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expires_at: { type: Date }, // made optional
  is_active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

announcementSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Announcement', announcementSchema);
