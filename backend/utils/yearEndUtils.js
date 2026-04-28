const User = require('../models/User');
const LeaveBalance = require('../models/LeaveBalance');
const { getPolicy, getCurrentFinancialYear } = require('./leaveUtils');

const runYearEndCarryForward = async () => {
  const policy = await getPolicy();
  const currentFY = getCurrentFinancialYear(policy);
  const previousFY = currentFY - 1;

  const employees = await User.find({ role: 'EMPLOYEE', isDeleted: { $ne: true } }).select('_id employment_status');

  for (const emp of employees) {
    const prevBalance = await LeaveBalance.findOne({ user_id: emp._id, year: previousFY });
    if (!prevBalance) continue;

    const carryForward = Math.min(
      prevBalance.remaining_leaves,
      policy.max_carry_forward_days
    );

    const totalLeaves = (emp.employment_status === 'PROBATION'
      ? policy.probation_leave_quota
      : policy.default_cl_per_year) + carryForward;

    await LeaveBalance.findOneAndUpdate(
      { user_id: emp._id, year: currentFY },
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
  }

  console.log(`[YEAR-END] Carry-forward complete for FY ${previousFY} → ${currentFY}`);
};

module.exports = { runYearEndCarryForward };
