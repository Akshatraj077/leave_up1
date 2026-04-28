const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  duration: { type: String, enum: ['FULL', 'HALF'], required: true },
  leave_type: { type: String, enum: ['CL', 'LOP', 'COMP_OFF'], default: 'CL' },
  status: { type: String, enum: ['APPLIED', 'APPROVED', 'REJECTED', 'CANCELLED', 'CANCELLATION_REQUESTED'], default: 'APPLIED' },
  reason: { type: String, required: true, maxlength: 200 },
  rejection_reason: { type: String },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewed_at: { type: Date },
  cancelled_at: { type: Date },
  cancellation_reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  cancellation_reviewed_at: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  audit_trail: [{
    action: String,
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actor_name: String,
    actor_role: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }],
  createdAt: { type: Date, default: Date.now }
});

leaveSchema.index({ user_id: 1, date: -1 });
leaveSchema.index({ status: 1, date: -1 });

module.exports = mongoose.model('Leave', leaveSchema);
