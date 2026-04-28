const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  company_id: { type: String, unique: true, minlength: 6, maxlength: 12, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['EMPLOYEE', 'ADMIN'], default: 'EMPLOYEE' },
  employment_status: {
    type: String,
    enum: ['ACTIVE', 'NOTICE_PERIOD', 'PROBATION'],
    default: 'ACTIVE'
  },
  joining_date: { type: Date },
  date_of_birth: { type: Date },
  pan_number: { type: String },
  bank_account_number: { type: String },
  bank_name: { type: String },
  ifsc_code: { type: String },
  account_holder_name: { type: String },
  department: { type: String, trim: true, default: null },
  admin_password_reset_required: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Since the admin may not have a company_id, we use sparse: true in the unique index for company_id.
// Required validations are somewhat looser structurally, handled by the controller when creating EMPLOYEEs.

module.exports = mongoose.model('User', userSchema);
