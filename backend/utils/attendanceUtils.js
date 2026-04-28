const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const User = require('../models/User');
const { getPolicy, isWorkingDay } = require('./leaveUtils');

const resolveAttendanceForEmployee = async (userId, targetMonth, targetYear) => {
  const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
  const now = new Date();
  const todayString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const today = new Date(`${todayString}T00:00:00.000Z`);
  const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));
  const actualEnd = new Date(Math.min(endOfMonth.getTime(), today.getTime() - 86400000));

  if (startDate > actualEnd) return;

  const policy = await getPolicy();
  const holidays = await Holiday.find({ date: { $gte: startDate, $lte: actualEnd } });
  const workingDays = policy.working_days;

  const existingAttendances = await Attendance.find({ 
    user_id: userId, 
    date: { $gte: startDate, $lte: actualEnd },
    isDeleted: { $ne: true } 
  });
  const existingMap = new Map();
  existingAttendances.forEach(a => {
    existingMap.set(a.date.toISOString().split('T')[0], a);
  });

  const operations = [];

  for (let d = new Date(startDate); d <= actualEnd; d.setDate(d.getDate() + 1)) {
    if (!isWorkingDay(d, holidays, workingDays)) continue;

    const dateObj = new Date(d);
    const dateStr = dateObj.toISOString().split('T')[0];
    const existing = existingMap.get(dateStr);

    if (!existing) {
      operations.push({
        insertOne: {
          document: { user_id: userId, date: dateObj, status: 'ABSENT' }
        }
      });
    } else if (existing.status === 'PENDING') {
      operations.push({
        updateOne: {
          filter: { _id: existing._id },
          update: { $set: { status: 'ABSENT' } }
        }
      });
    }
  }

  if (operations.length > 0) {
    await Attendance.bulkWrite(operations);
  }
};

const resolveAllPendingAttendance = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const employees = await User.find({ role: 'EMPLOYEE', isDeleted: { $ne: true } }).select('_id');
  for (const emp of employees) {
    await resolveAttendanceForEmployee(emp._id, month, year);
  }
};

module.exports = { resolveAttendanceForEmployee, resolveAllPendingAttendance };
