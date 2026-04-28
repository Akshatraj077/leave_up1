const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: [
      'LEAVE_APPLIED', 'LEAVE_APPROVED', 'LEAVE_REJECTED',
      'LEAVE_CANCELLED', 'CANCELLATION_REQUESTED',
      'BALANCE_LOW', 'REGULARIZATION_APPROVED',
      'REGULARIZATION_REJECTED', 'ANNOUNCEMENT', 'POLICY_UPDATED',
      'CANCELLATION_REJECTED'
    ], 
    required: true 
  },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  action_url: { type: String }, // optional deep link e.g. '/leave-history'
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ user_id: 1, is_read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
