const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const employeeAuth = require('../middlewares/employeeAuth');
// const { loginLimiter } = require('../utils/rateLimiter');
const { handleValidationErrors } = require('../validators/index');
const { applyLeaveValidator, changePasswordValidator, regularizationValidator, updateProfileValidator } = require('../validators/employeeValidators');

router.post('/login', employeeController.login);

router.use(employeeAuth); // protect all routes below

router.get('/dashboard', employeeController.getDashboard);
router.post('/leave/apply', applyLeaveValidator, handleValidationErrors, employeeController.applyLeave);
router.get('/leave/stats', employeeController.getLeaveStats);
router.get('/leave/history', employeeController.getLeaveHistory);
router.put('/leave/:id/cancel', employeeController.cancelLeave);
router.put('/leave/:id/withdraw', employeeController.withdrawCancellation);
router.get('/leave/:id/trail', employeeController.getLeaveTrail);
router.get('/calendar', employeeController.getCalendar);
router.get('/attendance/today', employeeController.getAttendanceToday);
router.post('/attendance/mark-present', employeeController.markPresent);
router.post('/attendance/resolve-pending', employeeController.resolvePendingAttendance);

router.get('/notifications', employeeController.getNotifications);
router.put('/notifications/read-all', employeeController.markAllRead);
router.put('/notifications/:id/read', employeeController.markOneRead);

router.put('/change-password', changePasswordValidator, handleValidationErrors, employeeController.changePassword);
router.get('/profile', employeeController.getProfile);
router.put('/profile', updateProfileValidator, handleValidationErrors, employeeController.updateProfile);

router.post('/regularization', regularizationValidator, handleValidationErrors, employeeController.applyRegularization);
router.get('/regularization', employeeController.getMyRegularizations);

router.get('/announcements', employeeController.getAnnouncements);

module.exports = router;
