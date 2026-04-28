const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total_leaves: { type: Number, default: 14 },
  used_leaves: { type: Number, default: 0 },
  remaining_leaves: { type: Number, default: 14 },
  comp_off_balance: { type: Number, default: 0 },
  lop_days: { type: Number, default: 0 },
  year: { type: Number, required: true }
});

leaveBalanceSchema.index({ user_id: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
