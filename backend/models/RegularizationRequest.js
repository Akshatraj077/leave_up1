const mongoose = require('mongoose');

const regularizationRequestSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true, maxlength: 300 },
  status: { 
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING' 
  },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewed_at: { type: Date },
  rejection_reason: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Compound unique index on { user_id: 1, date: 1 } —
// one regularization request per employee per date.
regularizationRequestSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('RegularizationRequest', regularizationRequestSchema);
