const { body } = require('express-validator');

exports.applyLeaveValidator = [
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid ISO date'),
  body('duration')
    .isIn(['FULL', 'HALF']).withMessage('Duration must be FULL or HALF'),
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 3, max: 200 }).withMessage('Reason must be between 3 and 200 characters'),
  body('leave_type')
    .optional()
    .isIn(['STANDARD', 'COMP_OFF']).withMessage('Invalid leave type')
];

exports.changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character')
];

exports.regularizationValidator = [
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 3, max: 300 }).withMessage('Reason must be between 3 and 300 characters')
];

exports.updateProfileValidator = [
  body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('pan_number')
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN number format'),
  body('bank_account_number')
    .optional()
    .matches(/^[0-9]{9,18}$/).withMessage('Invalid bank account number'),
  body('ifsc_code')
    .optional()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code format'),
  body('location')
    .optional()
    .isIn([
      'AP','AR','AS','BR','CG','GA','GJ','HR','HP','JH',
      'KA','KL','MP','MH','MN','ML','MZ','NL','OD','PB',
      'RJ','SK','TN','TG','TR','UP','UT','WB',
      'AN','CH','DN','DL','JK','LA','LD','PY'
    ])
    .withMessage('Invalid Indian state code')
];
