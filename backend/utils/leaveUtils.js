// backend/utils/leaveUtils.js
const Notification = require('../models/Notification');

const getCurrentFinancialYear = (policy) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0 = Jan, 11 = Dec
  const currentYear = currentDate.getFullYear();
  
  // policy.financial_year_start_month is 1-12. Subtract 1 to match JS 0-11
  const startMonth = (policy && policy.financial_year_start_month) ? policy.financial_year_start_month - 1 : 3; // Default April
  
  if (currentMonth >= startMonth) {
    return currentYear;
  } else {
    return currentYear - 1;
  }
};

// holidaysList is an array of Holiday documents
const isHoliday = (date, holidaysList) => {
  if (!holidaysList || holidaysList.length === 0) return false;
  const d = new Date(date);
  const dateString = d.toISOString().split('T')[0];
  
  return holidaysList.some(holiday => {
    const holidayDateStr = new Date(holiday.date).toISOString().split('T')[0];
    return holidayDateStr === dateString;
  });
};

const isWorkingDay = (date, holidaysList, workingDays = [1, 2, 3, 4, 5, 6]) => {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
  
  const isWithinWorkingDays = workingDays.includes(dayOfWeek);
  
  return isWithinWorkingDays && !isHoliday(date, holidaysList);
};

const calculateLeaveDeduction = (duration, policy) => {
  if (duration === 'HALF') {
    if (policy && policy.allow_half_day === false) {
      throw new Error('Half-day leave requests are not allowed by the company policy.');
    }
    return 0.5;
  }
  return 1;
};

const LeavePolicy = require('../models/LeavePolicy');

let cachedPolicy = null;
let policyCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

const getPolicy = async () => {
  const now = Date.now();
  if (cachedPolicy && (now - policyCacheTime < CACHE_TTL)) {
    return cachedPolicy;
  }
  
  const policy = await LeavePolicy.findOne();
  if (policy) {
    cachedPolicy = policy;
    policyCacheTime = now;
  }
  return policy;
};

const clearPolicyCache = () => {
  cachedPolicy = null;
  policyCacheTime = 0;
};

const createNotification = async (user_id, type, message, action_url = null) => {
  try {
    const notification = new Notification({
      user_id,
      type,
      message,
      action_url
    });
    const saved = await notification.save();
    return saved;
  } catch (err) {
    console.error(`Error saving notification (${type}) for user ${user_id}:`, err);
    // Silent fail per specifications
    return null;
  }
};

module.exports = {
  getCurrentFinancialYear,
  isHoliday,
  isWorkingDay,
  calculateLeaveDeduction,
  createNotification,
  getPolicy,
  clearPolicyCache
};
