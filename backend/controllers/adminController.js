const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Leave = require('../models/Leave');
const LeaveBalance = require('../models/LeaveBalance');
const Holiday = require('../models/Holiday');
const Attendance = require('../models/Attendance');
const LeavePolicy = require('../models/LeavePolicy');
const Notification = require('../models/Notification');
const RegularizationRequest = require('../models/RegularizationRequest');
const Announcement = require('../models/Announcement');
const { getCurrentFinancialYear, calculateLeaveDeduction, getPolicy, clearPolicyCache, createNotification } = require('../utils/leaveUtils');
const { getPaginationParams, buildPaginatedResponse } = require('../utils/paginationUtils');

const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
const { runYearEndCarryForward } = require('../utils/yearEndUtils');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'ADMIN' });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

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
    const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE', isDeleted: false });
    const pendingLeaves = await Leave.countDocuments({ status: 'APPLIED', isDeleted: false});
    const activeEmployees = await User.countDocuments({ role: 'EMPLOYEE', employment_status: 'ACTIVE', isDeleted: false});
    
    const now = new Date();
    const todayString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const today = new Date(`${todayString}T00:00:00.000Z`);
    
    const absentCount = await Attendance.countDocuments({ date: today, status: 'ABSENT' });

    const policy = await getPolicy();
    const holiday = await Holiday.findOne({ date: today });
    const dayOfWeek = today.getDay();

    const recentLeaves = await Leave.find({ status: 'APPLIED' }).sort({ createdAt: -1 }).limit(10).populate('user_id', 'name email company_id');
    const upcomingHolidays = await Holiday.find({ date: { $gte: today } }).sort({ date: 1 }).limit(5);

    const todayAttendance = {
      isHoliday: !!holiday,
      holiday: holiday ? { name: holiday.name } : null,
      absentCount,
      totalEmployees,
      todayFormatted: today.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric',
        month: 'long', day: 'numeric'
      }),
      isWorkingDay: !holiday && (policy?.working_days).includes(dayOfWeek)
    };

    res.json({
      success: true,
      data: {
        totalEmployees,
        pendingLeaves,
        absentCount,
        activeEmployees,
        recentLeaves: recentLeaves || [],
        upcomingHolidays: upcomingHolidays || [],
        todayAttendance
      }
    });
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
    const holiday = holidays.find(h => {
      const hDate = new Date(h.date);
      hDate.setHours(0, 0, 0, 0);
      return hDate.getTime() === today.getTime();
    });

    const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE', isDeleted: false});
    const absentCount = await Attendance.countDocuments({ date: today, status: 'ABSENT' });

    res.json({
      success: true,
      data: {
        isHoliday: !!holiday,
        holiday,
        absentCount,
        totalEmployees,
        todayFormatted: today.toLocaleDateString('en-IN', {
          weekday: 'long', year: 'numeric',
          month: 'long', day: 'numeric'
        }),
        isWorkingDay: !holiday && policy.working_days.includes(dayOfWeek)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, employment_status, department } = req.query;
    
    let query = { role: 'EMPLOYEE', isDeleted: false };
    if (employment_status && employment_status !== 'ALL' && employment_status !== 'All') {
      query.employment_status = employment_status;
    }
    if (department) query.department = new RegExp(escapeRegex(department), 'i');
    
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company_id: searchRegex }
      ];
    }

    const total = await User.countDocuments(query);
    const employees = await User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    
    res.json({ success: true, ...buildPaginatedResponse(employees, total, page, limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

// exports.addEmployee = async (req, res) => {
//   try {
//     const {
//       name, email, company_id, password, joining_date, date_of_birth,
//       employment_status, department, pan_number, bank_account_number,
//       bank_name, ifsc_code, account_holder_name
//     } = req.body;

//     const exist = await User.findOne({
//       $or: [{ email }, { company_id }],
//       isDeleted: false
//     });
//     if (exist) return res.status(400).json({ success: false, message: 'Email or Company ID already exists' });

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = new User({
//       name,
//       email,
//       company_id,
//       password: hashedPassword,
//       role: 'EMPLOYEE',
//       joining_date,
//       date_of_birth,
//       employment_status,
//       department: department || null,
//       pan_number: pan_number || null,
//       bank_account_number: bank_account_number || null,
//       bank_name: bank_name || null,
//       ifsc_code: ifsc_code || null,
//       account_holder_name: account_holder_name || null,
//       admin_password_reset_required: true
//     });
//     await user.save();

//     const policy = await getPolicy();
//     const currentFY = getCurrentFinancialYear(policy);
//     const totalLeaves = employment_status === 'PROBATION' ? policy.probation_leave_quota : policy.default_cl_per_year;

//     await LeaveBalance.findOneAndUpdate(
//       { user_id: user._id, year: currentFY },
//       {
//         $setOnInsert: {
//           total_leaves: totalLeaves,
//           used_leaves: 0,
//           remaining_leaves: totalLeaves,
//           comp_off_balance: 0,
//           lop_days: 0
//         }
//       },
//       { upsert: true, returnDocument: 'after' }
//     );

//     const userObj = user.toObject();
//     delete userObj.password;
//     res.json({ success: true, data: userObj, message: 'Employee added successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'An internal server error occurred' });
//   }
// };

exports.addEmployee = async (req, res) => {
  try {
    const {
      name, email, company_id, password, joining_date, date_of_birth,
      employment_status, department, pan_number, bank_account_number,
      bank_name, ifsc_code, account_holder_name, location
    } = req.body;

    // 🔍 Check ANY existing user (including deleted)
    const exist = await User.findOne({
      $or: [{ email }, { company_id }]
    });

    // ❌ If user exists and is ACTIVE → block
    if (exist && exist.isDeleted === false) {
      return res.status(400).json({
        success: false,
        message: 'Email or Company ID already exists'
      });
    }

    // 🔄 If user exists but is DELETED → restore
    if (exist && exist.isDeleted === true) {
      const hashedPassword = await bcrypt.hash(password, 10);

      exist.name = name;
      exist.password = hashedPassword;
      exist.company_id = company_id;
      exist.joining_date = joining_date;
      exist.date_of_birth = date_of_birth;
      exist.employment_status = employment_status;
      exist.department = department || null;
      exist.pan_number = pan_number || null;
      exist.bank_account_number = bank_account_number || null;
      exist.bank_name = bank_name || null;
      exist.ifsc_code = ifsc_code || null;
      exist.account_holder_name = account_holder_name || null;
      exist.location = location || null;

      exist.isDeleted = false;
      exist.deletedAt = null;
      exist.admin_password_reset_required = true;

      await exist.save();

      const userObj = exist.toObject();
      delete userObj.password;

      return res.json({
        success: true,
        data: userObj,
        message: 'Employee restored successfully'
      });
    }

    // ✅ Create NEW user (only if no record exists at all)
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      company_id,
      password: hashedPassword,
      role: 'EMPLOYEE',
      joining_date,
      date_of_birth,
      employment_status,
      department: department || null,
      location: location || null,
      pan_number: pan_number || null,
      bank_account_number: bank_account_number || null,
      bank_name: bank_name || null,
      ifsc_code: ifsc_code || null,
      account_holder_name: account_holder_name || null,
      admin_password_reset_required: true,
      isDeleted: false // explicit (good practice)
    });

    await user.save();

    // 📊 Leave balance setup
    const policy = await getPolicy();
    const currentFY = getCurrentFinancialYear(policy);
    const totalLeaves =
      employment_status === 'PROBATION'
        ? policy.probation_leave_quota
        : policy.default_cl_per_year;

    await LeaveBalance.findOneAndUpdate(
      { user_id: user._id, year: currentFY },
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

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      data: userObj,
      message: 'Employee added successfully'
    });

  } catch (error) {
    console.error(error);

    // 🔴 Handle duplicate key properly (fallback safety)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or Company ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'An internal server error occurred'
    });
  }
};

exports.editEmployee = async (req, res) => {
  try {
    const allowedFields = [
      'name', 'email', 'department', 'employment_status',
      'joining_date', 'date_of_birth', 'pan_number',
      'bank_account_number', 'bank_name', 'ifsc_code', 'account_holder_name',
      'location'
    ];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body.password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(req.body.password)) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number and 1 special character.' });
      }
      updates.password = await bcrypt.hash(req.body.password, 10);
      updates.admin_password_reset_required = true;
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false},
      updates,
      { returnDocument: 'after' }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Edge 2: NOTICE_PERIOD APPLIED leaves cancel
    if (updates.employment_status === 'NOTICE_PERIOD') {
      const pendingLeaves = await Leave.find({ user_id: user._id, status: 'APPLIED' });
      for (const leave of pendingLeaves) {
        leave.status = 'REJECTED';
        leave.rejection_reason = 'System: Employee moved to notice period';
        leave.audit_trail.push({
          action: 'REJECTED',
          actor_id: req.user.id,
          actor_name: 'Admin',
          actor_role: 'ADMIN',
          note: 'Auto-rejected due to Notice Period status'
        });
        await leave.save();
        await createNotification(user._id, 'LEAVE_REJECTED', `Leave on ${new Date(leave.date).toLocaleDateString()} auto-rejected (Notice Period).`);
      }
    }

    const { leaveQuota } = req.body;
    if (leaveQuota !== undefined) {
      const policy = await getPolicy();
      const year = getCurrentFinancialYear(policy);
      let balance = await LeaveBalance.findOne({ user_id: user._id, year });
      if (balance) {
        balance.total_leaves = leaveQuota;
        balance.remaining_leaves = Math.max(0, leaveQuota - balance.used_leaves);
        await balance.save();
      }
    }

    res.json({ success: true, data: user, message: 'Employee updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.creditCompOff = async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days <= 0) return res.status(400).json({ success: false, message: 'Valid days required' });

    const policy = await getPolicy();
    const year = getCurrentFinancialYear(policy);
    
    let balance = await LeaveBalance.findOne({ user_id: req.params.id, year });
    if (!balance) return res.status(404).json({ success: false, message: 'Leave balance record not found for this user' });

    balance.comp_off_balance += days;
    await balance.save();

    await createNotification(req.params.id, 'ANNOUNCEMENT', `You have been credited ${days} day(s) of Comp Off.`);

    res.json({ success: true, data: balance, message: 'Comp Off credited' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};


exports.deleteEmployee = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });

    const now = new Date();
    user.isDeleted = true;
    user.deletedAt = now;
    await user.save();

    await Leave.updateMany({ user_id: userId }, { isDeleted: true, deletedAt: now });
    await Attendance.updateMany({ user_id: userId }, { isDeleted: true, deletedAt: now });
    await RegularizationRequest.updateMany({ user_id: userId }, { isDeleted: true, deletedAt: now });

    res.json({ success: true, message: 'Employee deactivated successfully. Records are preserved.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getLeaveRequests = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status, leave_type } = req.query;

    let query = { isDeleted: { $ne: true } };
    if (status && status !== 'ALL' && status !== 'All') query.status = status;
    if (leave_type && leave_type !== 'ALL' && leave_type !== 'All') query.leave_type = leave_type;

    if (search) {
      const users = await User.find({ name: new RegExp(escapeRegex(search), 'i'), isDeleted: { $ne: true } }).select('_id');
      const userIds = users.map(u => u._id);
      query.user_id = { $in: userIds };
    }

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('user_id', 'name email company_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ success: true, ...buildPaginatedResponse(leaves, total, page, limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id).populate('user_id', 'name');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'APPLIED') return res.status(400).json({ success: false, message: 'Leave already processed' });

    const admin = await User.findById(req.user.id);
    const policy = await getPolicy();

    leave.status = 'APPROVED';
    leave.rejection_reason = undefined;
    leave.reviewed_by = admin._id;
    leave.reviewed_at = Date.now();
    
    leave.audit_trail.push({
      action: 'APPROVED',
      actor_id: admin._id,
      actor_name: admin.name,
      actor_role: admin.role
    });

    const formattedDate = new Date(leave.date).toLocaleDateString();

    if (leave.leave_type === 'CL') {
      const deduction = calculateLeaveDeduction(leave.duration, policy);
      const year = getCurrentFinancialYear(policy);
      const balance = await LeaveBalance.findOne({ user_id: leave.user_id._id, year });
      if (balance) {
        balance.used_leaves += deduction;
        balance.remaining_leaves = Math.max(0, balance.total_leaves - balance.used_leaves);
        await balance.save();

        if (balance.remaining_leaves <= policy.low_balance_threshold) {
          await createNotification(leave.user_id._id, 'BALANCE_LOW', 'Your leave balance is running low.');
        }
      }
    } else if (leave.leave_type === 'LOP') {
      const deductionLOP = calculateLeaveDeduction(leave.duration, policy);
      const yearLOP = getCurrentFinancialYear(policy);
      const balanceLOP = await LeaveBalance.findOne({ user_id: leave.user_id._id, year: yearLOP });
      if (balanceLOP) {
        balanceLOP.lop_days = (balanceLOP.lop_days || 0) + deductionLOP;
        await balanceLOP.save();
      }
    } else if (leave.leave_type === 'COMP_OFF') {
      const deduction = calculateLeaveDeduction(leave.duration, policy);
      const year = getCurrentFinancialYear(policy);
      const balance = await LeaveBalance.findOne({ user_id: leave.user_id._id, year });
      if (balance) {
        balance.comp_off_balance = Math.max(0, balance.comp_off_balance - deduction);
        await balance.save();
      }
    }

    await leave.save();
    
    await createNotification(leave.user_id._id, 'LEAVE_APPROVED', `Your leave request for ${formattedDate} has been approved.`);

    res.json({ success: true, message: 'Leave approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const { rejection_reason } = req.body;
    if (!rejection_reason || rejection_reason.length < 5) {
      return res.status(400).json({ success: false, message: 'Rejection reason of min 5 chars is required' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    
    const admin = await User.findById(req.user.id);

    leave.status = 'REJECTED';
    leave.rejection_reason = rejection_reason;
    leave.reviewed_by = admin._id;
    leave.reviewed_at = Date.now();

    leave.audit_trail.push({
      action: 'REJECTED',
      actor_id: admin._id,
      actor_name: admin.name,
      actor_role: admin.role,
      note: rejection_reason
    });
    


    await leave.save();

    const formattedDate = new Date(leave.date).toLocaleDateString();
    await createNotification(
      leave.user_id, 
      'LEAVE_REJECTED', 
      `Your leave request for ${formattedDate} was rejected. Reason: ${rejection_reason}`
    );

    res.json({ success: true, message: 'Leave rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.approveCancellation = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'CANCELLATION_REQUESTED') return res.status(400).json({ success: false, message: 'No cancellation requested' });

    const policy = await getPolicy();
    const deduction = calculateLeaveDeduction(leave.duration, policy);
    const year = getCurrentFinancialYear(policy);
    
    const balance = await LeaveBalance.findOne({ user_id: leave.user_id, year });
    if (balance) {
      if (leave.leave_type === 'CL') {
        balance.used_leaves = Math.max(0, balance.used_leaves - deduction);
        balance.remaining_leaves = Math.min(balance.total_leaves, balance.remaining_leaves + deduction);
      } else if (leave.leave_type === 'COMP_OFF') {
        balance.comp_off_balance += deduction;
      } else if (leave.leave_type === 'LOP') {
        balance.lop_days = Math.max(0, (balance.lop_days || 0) - deduction);
      }
      await balance.save();
    }

    leave.status = 'CANCELLED';
    leave.cancellation_reviewed_by = req.user.id;
    leave.cancellation_reviewed_at = new Date();
    leave.cancelled_at = Date.now();
    
    const admin = await User.findById(req.user.id);
    leave.audit_trail.push({
      action: 'CANCELLATION_APPROVED',
      actor_id: admin._id,
      actor_name: admin.name,
      actor_role: admin.role
    });

    await leave.save();
    
    await createNotification(leave.user_id, 'LEAVE_CANCELLED', 'Your leave cancellation request was approved.');

    res.json({ success: true, data: leave, message: 'Cancellation approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.rejectCancellation = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'CANCELLATION_REQUESTED') return res.status(400).json({ success: false, message: 'No cancellation requested' });

    leave.status = 'APPROVED';
    leave.cancellation_reviewed_by = req.user.id;
    leave.cancellation_reviewed_at = new Date();

    const admin = await User.findById(req.user.id);
    leave.audit_trail.push({
      action: 'CANCELLATION_REJECTED',
      actor_id: admin._id,
      actor_name: admin.name,
      actor_role: admin.role
    });

    await leave.save();

    await createNotification(leave.user_id, 'CANCELLATION_REJECTED', 'Your cancellation request was denied. Leave remains approved.');

    res.json({ success: true, data: leave, message: 'Cancellation rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getLeaveTrail = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, data: leave });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    
    // Refund balance if approved
    if (leave.status === 'APPROVED') {
      const policy = await getPolicy();
      const deduction = calculateLeaveDeduction(leave.duration, policy);
      const year = getCurrentFinancialYear(policy);
      const balance = await LeaveBalance.findOne({ user_id: leave.user_id, year });
      if (balance) {
        if (leave.leave_type === 'CL') {
          balance.used_leaves = Math.max(0, balance.used_leaves - deduction);
          balance.remaining_leaves = Math.min(balance.total_leaves, balance.remaining_leaves + deduction);
        } else if (leave.leave_type === 'COMP_OFF') {
          balance.comp_off_balance += deduction;
        } else if (leave.leave_type === 'LOP') {
          balance.lop_days = Math.max(0, (balance.lop_days || 0) - deduction);
        }
        await balance.save();
      }
    }

    await Leave.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Leave deleted and balance refunded if applicable' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json({ success: true, data: holidays });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.addHoliday = async (req, res) => {
  try {
    const { name, date, type, isGlobal, applicableStates } = req.body;

    const dateStr = date.split('T')[0];
    const d = new Date(`${dateStr}T00:00:00.000Z`);

    // Determine scope
    const isGlobalValue = isGlobal === false || isGlobal === 'false' ? false : true;
    const states = !isGlobalValue && Array.isArray(applicableStates)
      ? applicableStates
      : [];

    // A state-specific holiday must have at least one state
    if (!isGlobalValue && states.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A state-specific holiday must have at least one state selected'
      });
    }

    const holiday = new Holiday({
      name,
      date: d,
      type: type || 'NATIONAL',
      isGlobal: isGlobalValue,
      applicableStates: states
    });

    await holiday.save();
    res.json({ success: true, data: holiday, message: 'Holiday added' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A holiday on this date already exists. Please choose a different date or delete the existing one first.'
      });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.editHoliday = async (req, res) => {
  try {
    const { name, date, type, isGlobal, applicableStates } = req.body;

    const dateStr = date.split('T')[0];
    const d = new Date(`${dateStr}T00:00:00.000Z`);

    const isGlobalValue = isGlobal === false || isGlobal === 'false' ? false : true;
    const states = !isGlobalValue && Array.isArray(applicableStates)
      ? applicableStates
      : [];

    if (!isGlobalValue && states.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A state-specific holiday must have at least one state selected'
      });
    }

    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      {
        name,
        date: d,
        type: type || 'NATIONAL',
        isGlobal: isGlobalValue,
        applicableStates: states
      },
      { returnDocument: 'after' }
    );

    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    res.json({ success: true, data: holiday, message: 'Holiday updated' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Another holiday on this date already exists. Please choose a different date.'
      });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Holiday deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getAdminCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const holidays = await Holiday.find({ date: { $gte: startDate, $lte: endDate } });
    const approvedLeaves = await Leave.find({ status: 'APPROVED', date: { $gte: startDate, $lte: endDate }, isDeleted: { $ne: true } });
    
    // summarize leaves
    // e.g. [{ date: '2023-10-01', leaveCount: 2 }]
    const leaveSummary = {};
    approvedLeaves.forEach(lv => {
      const dStr = new Date(lv.date).toISOString().split('T')[0];
      leaveSummary[dStr] = (leaveSummary[dStr] || 0) + 1;
    });

    // pending leaves for badges
    const pendingLeaves = await Leave.find({ status: 'APPLIED', date: { $gte: startDate, $lte: endDate }, isDeleted: { $ne: true } });
    const pendingSummary = {};
    pendingLeaves.forEach(lv => {
      const dStr = new Date(lv.date).toISOString().split('T')[0];
      pendingSummary[dStr] = true;
    });

    res.json({
      success: true,
      data: { holidays, leaveSummary, pendingSummary }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getPolicy = async (req, res) => {
  try {
    const policy = await getPolicy();
    res.json({ success: true, data: policy });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const { default_cl_per_year, allow_half_day, allow_comp_off, financial_year_start_month, working_days, max_consecutive_leave_days, low_balance_threshold, probation_leave_quota, max_carry_forward_days } = req.body;
    
    if (default_cl_per_year < 1 || default_cl_per_year > 365) return res.status(400).json({ success: false, message: 'Invalid default_cl_per_year' });
    if (!Array.isArray(working_days) || working_days.length === 0 || !working_days.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) return res.status(400).json({ success: false, message: 'Invalid working_days' });
    if (financial_year_start_month < 1 || financial_year_start_month > 12) return res.status(400).json({ success: false, message: 'Invalid financial_year_start_month' });

    let policy = await LeavePolicy.findOne();
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not defined' });

    const oldDefaultCL = policy.default_cl_per_year;
    const oldProbationCL = policy.probation_leave_quota;

    if (default_cl_per_year !== undefined) policy.default_cl_per_year = default_cl_per_year;
    if (allow_half_day !== undefined) policy.allow_half_day = allow_half_day;
    if (allow_comp_off !== undefined) policy.allow_comp_off = allow_comp_off;
    if (financial_year_start_month !== undefined) policy.financial_year_start_month = financial_year_start_month;
    if (working_days !== undefined) policy.working_days = working_days;
    if (max_consecutive_leave_days !== undefined) policy.max_consecutive_leave_days = max_consecutive_leave_days;
    if (low_balance_threshold !== undefined) policy.low_balance_threshold = low_balance_threshold;
    if (probation_leave_quota !== undefined) policy.probation_leave_quota = probation_leave_quota;
    if (max_carry_forward_days !== undefined) policy.max_carry_forward_days = max_carry_forward_days;
    
    policy.updatedAt = Date.now();
    await policy.save();
    clearPolicyCache();

    const employees = await User.find({ role: 'EMPLOYEE' });
    const currentFY = getCurrentFinancialYear(policy);

    // Sync quotas if they changed (overriding custom quotas per user instruction)
    if ((default_cl_per_year !== undefined && default_cl_per_year !== oldDefaultCL) ||
        (probation_leave_quota !== undefined && probation_leave_quota !== oldProbationCL)) {
      for (const emp of employees) {
        const balance = await LeaveBalance.findOne({ user_id: emp._id, year: currentFY });
        if (balance) {
          const newTotal = emp.employment_status === 'PROBATION' ? policy.probation_leave_quota : policy.default_cl_per_year;
          balance.total_leaves = newTotal;
          balance.remaining_leaves = Math.max(0, newTotal - balance.used_leaves);
          await balance.save();
        }
      }
    }

    for (const emp of employees) {
      await createNotification(emp._id, 'POLICY_UPDATED', 'Company leave policy has been updated. Please review your dashboard.');
    }

    res.json({ success: true, data: policy, message: 'Policy updated successfully' });
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

exports.changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Admin not found' });
    
    // bcrypt.compare
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect current password' });
    
    // Validate newPassword
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number and 1 special character.' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getRegularizationRequests = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status } = req.query;

    let query = {};
    if (status && status !== 'All') query.status = status;

    if (search) {
      const users = await User.find({ name: new RegExp(escapeRegex(search), 'i') }).select('_id');
      query.user_id = { $in: users.map(u => u._id) };
    }

    const total = await RegularizationRequest.countDocuments(query);
    const requests = await RegularizationRequest.find(query)
      .populate('user_id', 'name email company_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ success: true, ...buildPaginatedResponse(requests, total, page, limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.approveRegularization = async (req, res) => {
  try {
    const regReq = await RegularizationRequest.findById(req.params.id);
    if (!regReq) return res.status(404).json({ success: false, message: 'Not found' });
    if (regReq.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Already processed' });

    let attendance = await Attendance.findOne({ user_id: regReq.user_id, date: regReq.date });
    if (!attendance) {
      attendance = new Attendance({ user_id: regReq.user_id, date: regReq.date, status: 'PRESENT' });
    } else {
      attendance.status = 'PRESENT';
    }
    await attendance.save();

    regReq.status = 'APPROVED';
    regReq.reviewed_by = req.user.id;
    regReq.reviewed_at = Date.now();
    await regReq.save();

    const formattedDate = new Date(regReq.date).toLocaleDateString();
    await createNotification(regReq.user_id, 'REGULARIZATION_APPROVED', `Your regularization request for ${formattedDate} has been approved.`);

    res.json({ success: true, data: regReq, message: 'Regularization approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.rejectRegularization = async (req, res) => {
  try {
    const { rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const regReq = await RegularizationRequest.findById(req.params.id);
    if (!regReq) return res.status(404).json({ success: false, message: 'Not found' });
    if (regReq.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Already processed' });

    regReq.status = 'REJECTED';
    regReq.rejection_reason = rejection_reason;
    regReq.reviewed_by = req.user.id;
    regReq.reviewed_at = Date.now();
    await regReq.save();

    const formattedDate = new Date(regReq.date).toLocaleDateString();
    await createNotification(regReq.user_id, 'REGULARIZATION_REJECTED', `Your regularization request for ${formattedDate} was rejected: ${rejection_reason}`);

    res.json({ success: true, data: regReq, message: 'Regularization rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, priority, expires_at } = req.body;
    const ann = new Announcement({
      title,
      message,
      priority,
      expires_at: expires_at ? new Date(expires_at) : undefined,
      created_by: req.user.id
    });
    await ann.save();

    const employees = await User.find({ role: 'EMPLOYEE', isDeleted: { $ne: true } }).select('_id');
    const notifications = employees.map(emp => ({
      user_id: emp._id,
      type: 'ANNOUNCEMENT',
      message: `New announcement: ${title}`
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ success: true, data: ann, message: 'Announcement created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('created_by', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getLeavesByTypeStats = async (req, res) => {
  try {
    const policy = await getPolicy();
    const startYear = getCurrentFinancialYear(policy);
    const startMonth = (policy && policy.financial_year_start_month) ? policy.financial_year_start_month - 1 : 3;
    const fyStart = new Date(Date.UTC(startYear, startMonth, 1));
    const fyEnd = new Date(Date.UTC(startYear + 1, startMonth, 0, 23, 59, 59, 999));

    const stats = await Leave.aggregate([
      { $match: { status: 'APPROVED', date: { $gte: fyStart, $lte: fyEnd } } },
      { $group: { _id: '$leave_type', count: { $sum: 1 }, total_duration: { $sum: { $cond: [{ $eq: ['$duration', 'HALF'] }, 0.5, 1] } } } }
    ]);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getLeavesByDepartmentStats = async (req, res) => {
  try {
    const policy = await getPolicy();
    const startYear = getCurrentFinancialYear(policy);
    const startMonth = (policy && policy.financial_year_start_month) ? policy.financial_year_start_month - 1 : 3;
    const fyStart = new Date(Date.UTC(startYear, startMonth, 1));
    const fyEnd = new Date(Date.UTC(startYear + 1, startMonth, 0, 23, 59, 59, 999));

    const stats = await Leave.aggregate([
      { $match: { status: 'APPROVED', date: { $gte: fyStart, $lte: fyEnd } } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $group: { _id: { $ifNull: ['$user.department', 'Unassigned'] }, count: { $sum: 1 } } }
    ]);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.getAttendanceTrends = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    const stats = await Attendance.aggregate([
      { $match: { date: { $gte: startOfMonth } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.exportEmployeesCSV = async (req, res) => {
  try {
    const employees = await User.find({ role: 'EMPLOYEE' }).lean();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
    
    // Add BOM for Excel
    res.write('\uFEFF');
    
    const headers = ['NAME', 'EMAIL', 'COMPANY_ID', 'JOIN_DATE', 'STATUS'];
    res.write(headers.join(',') + '\n');

    employees.forEach(emp => {
      const row = [
        `"${(emp.name || '').replace(/"/g, '""')}"`,
        `"${(emp.email || '').replace(/"/g, '""')}"`,
        `"${(emp.company_id || '').replace(/"/g, '""')}"`,
        `"${emp.joining_date ? new Date(emp.joining_date).toISOString().split('T')[0] : ''}"`,
        `"${(emp.employment_status || '').replace(/"/g, '""')}"`
      ];
      res.write(row.join(',') + '\n');
    });

    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};


// Phase 4 Step 2: Update Announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const { title, message, priority, expires_at } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    const updates = { title, message, priority: priority || 'NORMAL' };
    const unset = {};
    if (expires_at) {
      updates.expires_at = new Date(expires_at);
    } else {
      unset.expires_at = 1;
    }

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { $set: updates, ...(Object.keys(unset).length && { $unset: unset }) },
      { returnDocument: 'after' }
    );
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
    res.json({ success: true, data: announcement, message: 'Announcement updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

// Phase 4 Step 3: Leave Balance Overview
exports.getEmployeeLeaveBalances = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, department } = req.query;
    
    let query = { role: 'EMPLOYEE', isDeleted: { $ne: true } };
    if (department) query.department = new RegExp(escapeRegex(department), 'i');
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company_id: searchRegex }
      ];
    }
    
    const policy = await getPolicy();
    const currentFY = getCurrentFinancialYear(policy);

    const total = await User.countDocuments(query);
    const employees = await User.find(query)
      .select('name email company_id department employment_status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const employeeIds = employees.map(e => e._id);
    const balances = await LeaveBalance.find({ user_id: { $in: employeeIds }, year: currentFY }).lean();
    const balanceMap = {};
    balances.forEach(b => {
      balanceMap[b.user_id.toString()] = b;
    });

    const overview = employees.map(emp => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      company_id: emp.company_id,
      department: emp.department || 'Unassigned',
      employment_status: emp.employment_status,
      total_leaves: balanceMap[emp._id.toString()]?.total_leaves || 0,
      used_leaves: balanceMap[emp._id.toString()]?.used_leaves || 0,
      remaining_leaves: balanceMap[emp._id.toString()]?.remaining_leaves || 0,
      comp_off_balance: balanceMap[emp._id.toString()]?.comp_off_balance || 0,
      lop_days: balanceMap[emp._id.toString()]?.lop_days || 0,
    }));

    res.json({ success: true, ...buildPaginatedResponse(overview, total, page, limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

// Phase 4 Step 4: Leave Export CSV
exports.exportLeavesCSV = async (req, res) => {
  try {
    const { status, from, to } = req.query;
    let query = {};
    if (status && status !== 'ALL' && status !== 'All') query.status = status;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const leaves = await Leave.find(query)
      .populate('user_id', 'name email company_id department')
      .sort({ date: -1 })
      .lean();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leaves_export.csv"');
    
    // Add BOM for Excel
    res.write('\uFEFF');

    const headers = ['Employee Name', 'Company ID', 'Email', 'Department', 'Leave Date', 'Duration', 'Leave Type', 'Status', 'Reason'];
    res.write(headers.join(',') + '\n');

    leaves.forEach(l => {
      const row = [
        `"${(l.user_id?.name || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.user_id?.email || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.user_id?.company_id || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.user_id?.department || 'Unassigned').replace(/"/g, '""')}"`,
        `"${l.date ? new Date(l.date).toISOString().split('T')[0] : ''}"`,
        `"${(l.duration || '').replace(/"/g, '""')}"`,
        `"${(l.leave_type || '').replace(/"/g, '""')}"`,
        `"${(l.status || '').replace(/"/g, '""')}"`,
        `"${(l.reason || '').replace(/"/g, '""')}"`
      ];
      res.write(row.join(',') + '\n');
    });

    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.bulkApproveLeaves = async (req, res) => {
  try {
    const { leaveIds } = req.body;
    if (!Array.isArray(leaveIds) || leaveIds.length === 0) {
      return res.status(400).json({ success: false, message: 'leaveIds array required' });
    }

    const policy = await getPolicy();
    const year = getCurrentFinancialYear(policy);

    const leavesToApprove = await Leave.find({ _id: { $in: leaveIds }, status: 'APPLIED' }).populate('user_id');
    if (leavesToApprove.length === 0) return res.json({ success: true, message: '0 leave(s) approved' });

    const userIds = [...new Set(leavesToApprove.map(l => l.user_id._id.toString()))];
    const balances = await LeaveBalance.find({ user_id: { $in: userIds }, year });
    const balanceMap = new Map(balances.map(b => [b.user_id.toString(), b]));

    const leaveOperations = [];
    const balanceOperations = new Map(); // using map to keep track of latest balance state
    const notifications = [];

    for (const leave of leavesToApprove) {
      const deduction = leave.duration === 'HALF' ? 0.5 : 1;
      const balance = balanceMap.get(leave.user_id._id.toString());
      
      if (balance) {
        if (leave.leave_type === 'COMP_OFF') {
          balance.comp_off_balance = Math.max(0, balance.comp_off_balance - deduction);
        } else if (leave.leave_type === 'LOP') {
          balance.lop_days = (balance.lop_days || 0) + deduction;
        } else {
          balance.used_leaves += deduction;
          balance.remaining_leaves = Math.max(0, balance.total_leaves - balance.used_leaves);
        }
        balanceOperations.set(balance._id.toString(), balance);
      }

      leave.audit_trail.push({
        action: 'APPROVED',
        actor_id: req.user.id,
        actor_name: 'Admin',
        actor_role: 'ADMIN',
        note: 'Bulk approved'
      });

      leaveOperations.push({
        updateOne: {
          filter: { _id: leave._id },
          update: { 
            $set: { status: 'APPROVED', audit_trail: leave.audit_trail }
          }
        }
      });

      notifications.push({
        user_id: leave.user_id._id,
        type: 'LEAVE_APPROVED',
        message: `Leave on ${new Date(leave.date).toLocaleDateString()} approved.`
      });
    }

    if (balanceOperations.size > 0) {
      const bOps = Array.from(balanceOperations.values()).map(b => ({
        updateOne: {
          filter: { _id: b._id },
          update: { $set: { 
            comp_off_balance: b.comp_off_balance, 
            lop_days: b.lop_days, 
            used_leaves: b.used_leaves, 
            remaining_leaves: b.remaining_leaves 
          } }
        }
      }));
      await LeaveBalance.bulkWrite(bOps);
    }

    if (leaveOperations.length > 0) {
      await Leave.bulkWrite(leaveOperations);
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ success: true, message: `${leaveOperations.length} leave(s) approved` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

// Phase 5 Step 4: Bulk Reject
exports.bulkRejectLeaves = async (req, res) => {
  try {
    const { leaveIds, rejection_reason } = req.body;
    if (!Array.isArray(leaveIds) || leaveIds.length === 0) {
      return res.status(400).json({ success: false, message: 'leaveIds array required' });
    }

    const policy = await getPolicy();
    const year = getCurrentFinancialYear(policy);

    const leavesToReject = await Leave.find({ _id: { $in: leaveIds }, status: 'APPLIED' }).populate('user_id');
    if (leavesToReject.length === 0) return res.json({ success: true, message: '0 leave(s) rejected' });

    // Note: No balance refunds required for normal leaves since they were never deducted.
    // However, if we DID deduct COMP_OFF, we would refund it here. Based on Phase 1, we do not deduct APPLIED leaves.
    // I am keeping the logic intact just in case, but batching it.
    
    const userIds = [...new Set(leavesToReject.map(l => l.user_id._id.toString()))];
    const balances = await LeaveBalance.find({ user_id: { $in: userIds }, year });
    const balanceMap = new Map(balances.map(b => [b.user_id.toString(), b]));

    const leaveOperations = [];
    const balanceOperations = new Map();
    const notifications = [];

    for (const leave of leavesToReject) {
      leave.audit_trail.push({
        action: 'REJECTED',
        actor_id: req.user.id,
        actor_name: 'Admin',
        actor_role: 'ADMIN',
        note: rejection_reason || 'Bulk rejected'
      });

      if (leave.leave_type === 'COMP_OFF') {
        const balance = balanceMap.get(leave.user_id._id.toString());
        if (balance) {
          const deduction = leave.duration === 'HALF' ? 0.5 : 1;
          balance.comp_off_balance += deduction; // Refund
          balanceOperations.set(balance._id.toString(), balance);
        }
      }

      leaveOperations.push({
        updateOne: {
          filter: { _id: leave._id },
          update: { 
            $set: { 
              status: 'REJECTED', 
              rejection_reason: rejection_reason || 'Bulk rejected',
              audit_trail: leave.audit_trail 
            } 
          }
        }
      });

      notifications.push({
        user_id: leave.user_id._id,
        type: 'LEAVE_REJECTED',
        message: `Leave on ${new Date(leave.date).toLocaleDateString()} rejected.`
      });
    }

    if (balanceOperations.size > 0) {
      const bOps = Array.from(balanceOperations.values()).map(b => ({
        updateOne: {
          filter: { _id: b._id },
          update: { $set: { comp_off_balance: b.comp_off_balance } }
        }
      }));
      await LeaveBalance.bulkWrite(bOps);
    }

    if (leaveOperations.length > 0) {
      await Leave.bulkWrite(leaveOperations);
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ success: true, message: `${leaveOperations.length} leave(s) rejected` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};

exports.runYearEndCarryForward = async (req, res) => {
  try {
    await runYearEndCarryForward();
    res.json({ success: true, message: 'Year-end carry-forward completed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};
