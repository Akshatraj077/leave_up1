const jwt = require('jsonwebtoken');
const User = require('../models/User');

const employeeAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.isDeleted) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated' });
    }

    // IL-5: Force password reset check — allow /change-password through
    const isChangePasswordRoute = req.originalUrl.endsWith('/change-password');
    if (user.admin_password_reset_required && !isChangePasswordRoute) {
      return res.status(403).json({
        success: false,
        message: 'Password reset required before continuing',
        forcePasswordReset: true
      });
    }

    req.user = { id: user._id.toString(), email: user.email, role: user.role, name: user.name };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = employeeAuth;
