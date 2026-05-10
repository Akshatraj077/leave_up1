const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Leave = require('../models/Leave');
const LeaveBalance = require('../models/LeaveBalance');
const Holiday = require('../models/Holiday');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const RegularizationRequest = require('../models/RegularizationRequest');
const Announcement = require('../models/Announcement');
const { getCurrentFinancialYear, isHoliday, isWorkingDay, getPolicy, createNotification, calculateLeaveDeduction } = require('../utils/leaveUtils');
const { getPaginationParams, buildPaginatedResponse } = require('../utils/paginationUtils');
const { notifyAllAdmins } = require('../utils/notifyAdmins');
const { resolveAttendanceForEmployee } = require('../utils/attendanceUtils');

exports.login = async (req, res) => {
  try {
    const { emailOrCompanyId, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrCompanyId }, { company_id: emailOrCompanyId }],
      role: 'EMPLOYEE'
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'No user found with this email or company ID' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userObj = user.toObject();
    delete userObj.password;

    res.json({ success: true, data: { token, user: userObj }, message: 'Logged in successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const policy = await getPolicy();
    const year = getCurrentFinancialYear(policy);
    
    const totalLeaves = user.employment_status === 'PROBATION'
      ? policy.probation_leave_quota
      : policy.default_cl_per_year;

    let balance = await LeaveBalance.findOneAndUpdate(
      { user_id: userId, year },
      {
        $setOnInsert: {
          total_leaves: totalLeaves,
          used_leaves: 0,
          remaining_leaves: totalLeaves,
          comp_off_balance: 0,
          lop_days: 0
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const today = new Date();
    today.setHours(0,0,0,0);

    const upcomingHolidays = await Holiday.find({ date: { $gte: today } }).sort({ date: 1 }).limit(5);

    const profileFields = [
      'name', 'pan_number', 'bank_account_number',
      'bank_name', 'ifsc_code', 'account_holder_name'
    ];
    const filledFields = profileFields.filter(field => {
      const val = user[field];
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
    const profileCompletion = Math.round((filledFields.length / profileFields.length) * 100);

    res.json({
      success: true,
      data: {
        leaveBalance: balance,
        employmentStatus: user.employment_status,
        upcomingHolidays,
        profileCompletion,
        low_balance_threshold: policy.low_balance_threshold
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.applyLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, duration, reason, leave_type: requestedType } = req.body;
    
    if (!reason || reason.length < 3 || reason.length > 200) {
      return res.status(400).json({ success: false, message: 'Reason must be between 3 and 200 characters' });
    }
    
    const user = await User.findById(userId);
    if (user.employment_status === 'NOTICE_PERIOD') {
      return res.status(400).json({ success: false, message: 'Cannot apply for leave during notice period' });
    }

    const dateStr = date.split('T')[0];
    const leaveDate = new Date(`${dateStr}T00:00:00.000Z`);

    // B-7: Reject past dates
    const now = new Date();
    const todayString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayCheck = new Date(`${todayString}T00:00:00.000Z`);
    
    if (leaveDate < todayCheck) {
      return res.status(400).json({ success: false, message: 'Cannot apply leave for a past date' });
    }

    const policy = await getPolicy();
    const holidays = await Holiday.find({});

    if (!isWorkingDay(leaveDate, holidays, policy.working_days)) {
      const onHoliday = isHoliday(leaveDate, holidays);
      return res.status(400).json({
        success: false,
        message: onHoliday
          ? 'Cannot apply leave on a public holiday'
          : 'Cannot apply leave on a non-working day'
      });
    }

    // B-8: Half-day policy check
    if (duration === 'HALF' && policy.allow_half_day === false) {
      return res.status(400).json({
        success: false,
        message: 'Half-day leaves are not permitted by the current company policy'
      });
    }

    const existingLeave = await Leave.findOne({ user_id: userId, date: leaveDate, status: { $ne: 'REJECTED' }, isDeleted: { $ne: true } });
    if (existingLeave) {
      return res.status(400).json({ success: false, message: 'Leave already applied for this date' });
    }

    const year = getCurrentFinancialYear(policy);
    const balance = await LeaveBalance.findOne({ user_id: userId, year });

    // Count consecutive working-day leave streak including this new date
    const maxConsecutive = policy.max_consecutive_leave_days;
    const windowStart = new Date(leaveDate);
    windowStart.setDate(windowStart.getDate() - maxConsecutive - 7);
    const windowEnd = new Date(leaveDate);
    windowEnd.setDate(windowEnd.getDate() + maxConsecutive + 7);

    const surroundingLeaves = await Leave.find({
      user_id: userId,
      status: { $in: ['APPLIED', 'APPROVED'] },
      date: { $gte: windowStart, $lte: windowEnd },
      isDeleted: { $ne: true }
    }).sort({ date: 1 });

    const leaveDaySet = new Set(
      surroundingLeaves.map(l =>
        new Date(l.date).toISOString().split('T')[0]
      )
    );
    // Add the new leave date being applied
    leaveDaySet.add(leaveDate.toISOString().split('T')[0]);

    // Build sorted array of leave dates that are actual working days
    const sortedDates = [...leaveDaySet].sort();

    // Count max consecutive working-day run
    let maxStreak = 1, currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      // Check if every day between prev and curr is a non-working day
      let allNonWorking = true;
      const step = new Date(prev);
      step.setDate(step.getDate() + 1);
      while (step < curr) {
        if (isWorkingDay(step, holidays, policy.working_days)) {
          allNonWorking = false;
          break;
        }
        step.setDate(step.getDate() + 1);
      }
      if (allNonWorking) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    if (maxStreak > maxConsecutive) {
      return res.status(400).json({
        success: false,
        message: `Cannot apply more than ${maxConsecutive} consecutive working-day leave(s) as per company policy`
      });
    }
    
    const deduction = duration === 'FULL' ? 1 : 0.5;
    let leave_type = 'CL';
    
    if (requestedType === 'COMP_OFF' && policy.allow_comp_off) {
      if (balance && balance.comp_off_balance >= deduction) {
        leave_type = 'COMP_OFF';
      } else {
        return res.status(400).json({ success: false, message: 'Insufficient Comp Off balance' });
      }
    } else {
      leave_type = (balance && balance.remaining_leaves >= deduction) ? 'CL' : 'LOP';
    }

    const leave = new Leave({
      user_id: userId,
      date: leaveDate,
      duration,
      reason,
      leave_type,
      status: 'APPLIED',
      audit_trail: [{
        action: 'APPLIED',
        actor_id: user._id,
        actor_name: user.name,
        actor_role: user.role,
        note: reason
      }]
    });

    await leave.save();
    
    // Standard CL is deducted on approval

    const formattedDate = leaveDate.toLocaleDateString();
    await createNotification(userId, 'LEAVE_APPLIED', `Your leave request for ${formattedDate} has been submitted.`);
    await notifyAllAdmins('LEAVE_APPLIED', `${user.name} has applied for leave on ${formattedDate}.`);

    res.json({ success: true, data: leave, message: 'Leave applied successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getLeaveHistory = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { status, leave_type } = req.query;
    let query = { user_id: req.user.id, isDeleted: { $ne: true } };
    
    if (status && status !== 'ALL' && status !== 'All') query.status = status;
    if (leave_type && leave_type !== 'ALL' && leave_type !== 'All') query.leave_type = leave_type;

    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .sort({ date: sortOrder })
      .skip(skip)
      .limit(limit);

    res.json({ success: true, ...buildPaginatedResponse(leaves, total, page, limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getLeaveStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const policy = await getPolicy();
    const currentFY = getCurrentFinancialYear(policy);
    const startMonth = policy.financial_year_start_month - 1;

    const fyStart = new Date(Date.UTC(currentFY, startMonth, 1));
    const fyEnd = new Date(Date.UTC(currentFY + 1, startMonth, 1));

    const dateRange = { $gte: fyStart, $lt: fyEnd };

    const [applied, approved, rejected, cancelled] = await Promise.all([
      Leave.countDocuments({ user_id: userId, status: 'APPLIED', date: dateRange, isDeleted: { $ne: true } }),
      Leave.countDocuments({ user_id: userId, status: { $in: ['APPROVED', 'CANCELLATION_REQUESTED'] }, date: dateRange, isDeleted: { $ne: true } }),
      Leave.countDocuments({ user_id: userId, status: 'REJECTED', date: dateRange, isDeleted: { $ne: true } }),
      Leave.countDocuments({ user_id: userId, status: 'CANCELLED', date: dateRange, isDeleted: { $ne: true } }),
    ]);

    res.json({ success: true, data: { applied, approved, rejected, cancelled } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.user_id.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(req.user.id);
    const formattedDate = new Date(leave.date).toLocaleDateString();

    if (leave.status === 'APPLIED') {
      leave.status = 'CANCELLED';
      leave.cancelled_at = Date.now();
      leave.audit_trail.push({
        action: 'CANCELLED',
        actor_id: user._id,
        actor_name: user.name,
        actor_role: user.role
      });
      

      await leave.save();
      return res.json({ success: true, data: leave, message: 'Leave cancelled immediately' });
    } else if (leave.status === 'APPROVED') {
      leave.status = 'CANCELLATION_REQUESTED';
      leave.audit_trail.push({
        action: 'CANCELLATION_REQUESTED',
        actor_id: user._id,
        actor_name: user.name,
        actor_role: user.role
      });
      await leave.save();

      await notifyAllAdmins('CANCELLATION_REQUESTED', `${user.name} has requested cancellation of their approved leave on ${formattedDate}.`);
      return res.json({ success: true, data: leave, message: 'Cancellation requested' });
    } else {
      return res.status(400).json({ success: false, message: 'Cannot cancel leave in current status' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.withdrawCancellation = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.user_id.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (leave.status !== 'CANCELLATION_REQUESTED') return res.status(400).json({ success: false, message: 'Cannot withdraw in current status' });

    const user = await User.findById(req.user.id);
    leave.status = 'APPROVED';
    
    leave.audit_trail.push({
      action: 'CANCELLATION_WITHDRAWN',
      actor_id: user._id,
      actor_name: user.name,
      actor_role: user.role,
      note: 'Cancellation withdrawn'
    });

    await leave.save();
    res.json({ success: true, data: leave, message: 'Cancellation request withdrawn' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getLeaveTrail = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.user_id.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    res.json({ success: true, data: leave });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getCalendar = async (req, res) => {
  try {
    const { month, year } = req.query; // 1-12
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const holidays = await Holiday.find({ date: { $gte: startDate, $lte: endDate } });
    const leaves = await Leave.find({
      user_id: req.user.id,
      date: { $gte: startDate, $lte: endDate },
      isDeleted: { $ne: true }
    });
    const attendances = await Attendance.find({
      user_id: req.user.id,
      date: { $gte: startDate, $lte: endDate },
      isDeleted: { $ne: true }
    });

    res.json({
      success: true,
      data: { holidays, leaves, attendances }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.markPresent = async (req, res) => {
  try {
    const now = new Date();
    const todayString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const today = new Date(`${todayString}T00:00:00.000Z`);

    const policy = await getPolicy();
    const holidays = await Holiday.find({});
    
    if (!isWorkingDay(today, holidays, policy.working_days)) {
      return res.status(400).json({ success: false, message: 'Today is a non-working day or Holiday' });
    }

    let attendance = await Attendance.findOne({ user_id: req.user.id, date: today });
    if (!attendance) {
      attendance = new Attendance({ user_id: req.user.id, date: today, status: 'PRESENT' });
    } else {
      if (attendance.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: `Already marked as ${attendance.status}` });
      }
      attendance.status = 'PRESENT';
    }

    await attendance.save();
    res.json({ success: true, data: attendance, message: 'Marked present successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.resolvePendingAttendance = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year are required' });
    await resolveAttendanceForEmployee(req.user.id, parseInt(month), parseInt(year));
    res.json({ success: true, message: 'Resolved pending attendances' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect current password' });

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.'
      });
    }

    user.admin_password_reset_required = false;
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'pan_number', 'bank_account_number', 'bank_name', 'ifsc_code', 'account_holder_name'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { returnDocument: 'after' }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const query = { user_id: req.user.id };
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({ user_id: req.user.id, is_read: false });

    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user_id: req.user.id, is_read: false }, { is_read: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.markOneRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Not found' });
    if (notification.user_id.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    notification.is_read = true;
    await notification.save();
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.applyRegularization = async (req, res) => {
  try {
    const { date, reason } = req.body;
    const dateStr = date.split('T')[0];
    const regularizationDate = new Date(`${dateStr}T00:00:00.000Z`);
    
    const now = new Date();
    const todayString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const today = new Date(`${todayString}T00:00:00.000Z`);

    if (regularizationDate >= today) return res.status(400).json({ success: false, message: 'Regularization date must be in the past' });

    const policy = await getPolicy();
    const holidays = await Holiday.find({});
    
    if (!isWorkingDay(regularizationDate, holidays, policy.working_days)) {
      return res.status(400).json({ success: false, message: 'Date is not a working day' });
    }

    const attendance = await Attendance.findOne({ user_id: req.user.id, date: regularizationDate });
    if (!attendance || attendance.status !== 'ABSENT') {
      return res.status(400).json({ success: false, message: 'Regularization only allowed for Absent days' });
    }

    const existingReq = await RegularizationRequest.findOne({ user_id: req.user.id, date: regularizationDate });
    if (existingReq && existingReq.status !== 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Request already exists for this date' });
    }

    const regRequest = new RegularizationRequest({
      user_id: req.user.id,
      date: regularizationDate,
      reason
    });
    
    await regRequest.save();

    const user = await User.findById(req.user.id);
    await notifyAllAdmins('LEAVE_APPLIED', `${user.name} has raised a regularization request for ${regularizationDate.toLocaleDateString()}.`);

    res.json({ success: true, data: regRequest, message: 'Regularization request submitted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getMyRegularizations = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const query = { user_id: req.user.id };

    const total = await RegularizationRequest.countDocuments(query);
    const requests = await RegularizationRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ success: true, ...buildPaginatedResponse(requests, total, page, limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getAttendanceToday = async (req, res) => {
  try {
    const now = new Date();
    const todayString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const today = new Date(`${todayString}T00:00:00.000Z`);

    const policy = await getPolicy();
    const holidays = await Holiday.find({});

    const dayOfWeek = today.getDay();
    const isTodayWorkingDay = isWorkingDay(today, holidays, policy.working_days);
    const holiday = holidays.find(h => {
      return new Date(h.date).toISOString().split('T')[0] === todayString;
    });

    const attendance = await Attendance.findOne({
      user_id: req.user.id,
      date: today
    });

    const approvedLeave = await Leave.findOne({
      user_id: req.user.id,
      date: today,
      status: 'APPROVED'
    });

    res.json({
      success: true,
      data: {
        attendance,
        leave: approvedLeave,
        isHoliday: !!holiday,
        holiday,
        workingDays: policy?.working_days || [1, 2, 3, 4, 5, 6],
        isWorkingDay: isTodayWorkingDay,
        todayFormatted: today.toLocaleDateString('en-IN', {
          weekday: 'long', year: 'numeric',
          month: 'long', day: 'numeric'
        })
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      is_active: true,
      $or: [
        { expires_at: { $gt: now } },
        { expires_at: null },
        { expires_at: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};
