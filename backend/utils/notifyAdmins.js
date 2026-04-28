const User = require('../models/User');
const { createNotification } = require('./leaveUtils');

const notifyAllAdmins = async (type, message) => {
  const admins = await User.find({ role: 'ADMIN', isDeleted: { $ne: true } }).select('_id');
  await Promise.all(admins.map(admin => createNotification(admin._id, type, message)));
};

module.exports = { notifyAllAdmins };
