const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middlewares/adminAuth');
// const { loginLimiter } = require('../utils/rateLimiter');
const { handleValidationErrors } = require('../validators/index');
const { addEmployeeValidator, rejectLeaveValidator, addHolidayValidator, creditCompOffValidator, updatePolicyValidator, bulkApproveValidator, bulkRejectValidator } = require('../validators/adminValidators');

router.post('/login', adminController.login);

router.use(adminAuth); // protect all routes below

router.get('/dashboard', adminController.getDashboard);
router.get('/attendance/today', adminController.getAttendanceToday);
router.get('/employees/export-csv', adminController.exportEmployeesCSV);
router.get('/employees', adminController.getAllEmployees);
router.post('/employees', addEmployeeValidator, handleValidationErrors, adminController.addEmployee);
router.put('/employees/:id/credit-comp-off', creditCompOffValidator, handleValidationErrors, adminController.creditCompOff);
router.put('/employees/:id', adminController.editEmployee);
router.delete('/employees/:id', adminController.deleteEmployee);

router.post('/leaves/bulk-approve', bulkApproveValidator, handleValidationErrors, adminController.bulkApproveLeaves);
router.post('/leaves/bulk-reject', bulkRejectValidator, handleValidationErrors, adminController.bulkRejectLeaves);
router.get('/leave-balances', adminController.getEmployeeLeaveBalances);
router.get('/leaves/export-csv', adminController.exportLeavesCSV);
router.get('/leaves', adminController.getLeaveRequests);
router.put('/leaves/:id/approve', adminController.approveLeave);
router.put('/leaves/:id/reject', rejectLeaveValidator, handleValidationErrors, adminController.rejectLeave);
router.put('/leaves/:id/approve-cancellation', adminController.approveCancellation);
router.put('/leaves/:id/reject-cancellation', adminController.rejectCancellation);
router.get('/leaves/:id/trail', adminController.getLeaveTrail);
router.delete('/leaves/:id', adminController.deleteLeave);

router.get('/holidays', adminController.getAllHolidays);
router.post('/holidays', addHolidayValidator, handleValidationErrors, adminController.addHoliday);
router.put('/holidays/:id', addHolidayValidator, handleValidationErrors, adminController.editHoliday);
router.delete('/holidays/:id', adminController.deleteHoliday);

router.get('/calendar', adminController.getAdminCalendar);

router.get('/policy', adminController.getPolicy);
router.put('/policy', updatePolicyValidator, handleValidationErrors, adminController.updatePolicy);

router.post('/system/year-end-carry-forward', adminController.runYearEndCarryForward);

router.get('/notifications', adminController.getNotifications);
router.put('/notifications/read-all', adminController.markAllRead);
router.put('/notifications/:id/read', adminController.markOneRead);

router.put('/change-password', adminController.changeAdminPassword);

router.get('/regularization', adminController.getRegularizationRequests);
router.put('/regularization/:id/approve', adminController.approveRegularization);
router.put('/regularization/:id/reject', adminController.rejectRegularization);

router.post('/announcements', adminController.createAnnouncement);
router.get('/announcements', adminController.getAnnouncements);
router.put('/announcements/:id', adminController.updateAnnouncement);
router.delete('/announcements/:id', adminController.deleteAnnouncement);

router.get('/analytics/leaves-by-type', adminController.getLeavesByTypeStats);
router.get('/analytics/leaves-by-department', adminController.getLeavesByDepartmentStats);
router.get('/analytics/attendance-trends', adminController.getAttendanceTrends);




module.exports = router;
