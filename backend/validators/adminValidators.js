const { body } = require('express-validator');

exports.addEmployeeValidator = [
  body('name').notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').isEmail().withMessage('Valid email is required'),
  body('company_id')
    .notEmpty().withMessage('Company ID is required')
    .isLength({ min: 6, max: 12 }).withMessage('Company ID must be 6-12 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number and 1 special character'),
  body('employment_status')
    .optional()
    .isIn(['ACTIVE', 'NOTICE_PERIOD', 'PROBATION']).withMessage('Invalid employment status'),
  body('location')
    .notEmpty().withMessage('Employee location (state) is required')
    .isIn([
      'AP','AR','AS','BR','CG','GA','GJ','HR','HP','JH',
      'KA','KL','MP','MH','MN','ML','MZ','NL','OD','PB',
      'RJ','SK','TN','TG','TR','UP','UT','WB',
      'AN','CH','DN','DL','JK','LA','LD','PY'
    ])
    .withMessage('Invalid Indian state code')
];

exports.rejectLeaveValidator = [
  body('rejection_reason')
    .notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 5 }).withMessage('Rejection reason must be at least 5 characters')
];

exports.updatePolicyValidator = [
  body('default_cl_per_year').isInt({ min: 1, max: 365 }).withMessage('Invalid leave quota'),
  body('working_days')
    .isArray({ min: 1 }).withMessage('Working days must be a non-empty array')
    .custom(arr => arr.every(d => Number.isInteger(d) && d >= 0 && d <= 6))
    .withMessage('Working days must be integers 0-6'),
  body('financial_year_start_month').isInt({ min: 1, max: 12 }).withMessage('Invalid month')
];

const VALID_STATE_CODES = [
  'AP','AR','AS','BR','CG','GA','GJ','HR','HP','JH',
  'KA','KL','MP','MH','MN','ML','MZ','NL','OD','PB',
  'RJ','SK','TN','TG','TR','UP','UT','WB',
  'AN','CH','DN','DL','JK','LA','LD','PY'
];

exports.addHolidayValidator = [
  body('name').notEmpty().withMessage('Holiday name is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('type')
    .optional()
    .isIn(['NATIONAL', 'REGIONAL', 'OPTIONAL'])
    .withMessage('Invalid holiday type'),
  body('isGlobal')
    .optional()
    .isBoolean()
    .withMessage('isGlobal must be a boolean'),
  body('applicableStates')
    .optional()
    .isArray()
    .withMessage('applicableStates must be an array'),
  body('applicableStates.*')
    .optional()
    .isIn(VALID_STATE_CODES)
    .withMessage('One or more invalid state codes in applicableStates')
];

exports.creditCompOffValidator = [
  body('days')
    .isFloat({ min: 0.5 }).withMessage('Days must be at least 0.5')
];

exports.bulkRejectValidator = [
  body('leaveIds').isArray({ min: 1 }).withMessage('leaveIds array must not be empty'),
  body('leaveIds.*').isMongoId().withMessage('Invalid leave ID format'),
  body('rejection_reason')
    .notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 5 }).withMessage('Rejection reason must be at least 5 characters')
    .escape()
];

exports.bulkApproveValidator = [
  body('leaveIds').isArray({ min: 1 }).withMessage('leaveIds array must not be empty'),
  body('leaveIds.*').isMongoId().withMessage('Invalid leave ID format')
];
