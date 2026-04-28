const mongoose = require('mongoose');

// Only ONE document should ever exist. Seed on server startup if none exists.
const leavePolicySchema = new mongoose.Schema({
  default_cl_per_year: { type: Number, default: 14 },
  allow_half_day: { type: Boolean, default: true },
  allow_comp_off: { type: Boolean, default: true },
  financial_year_start_month: { type: Number, default: 4 }, // April
  working_days: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // 0=Sun,1=Mon,...,6=Sat
  max_consecutive_leave_days: { type: Number, default: 5 },
  low_balance_threshold: { type: Number, default: 3 },
  probation_leave_quota: { type: Number, default: 7 },
  max_carry_forward_days: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
