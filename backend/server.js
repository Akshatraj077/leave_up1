require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...', err);
  process.exit(1);
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const helmet = require('helmet');

const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const employeeRoutes = require('./routes/employeeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const User = require('./models/User');
const LeavePolicy = require('./models/LeavePolicy');
const { resolveAllPendingAttendance } = require('./utils/attendanceUtils');
const { runYearEndCarryForward } = require('./utils/yearEndUtils');

const app = express();

app.use(helmet());
// , 'http://localhost:5173', 'http://localhost:5174'
const whitelist = [process.env.FRONTEND_URL, process.env.ADMIN_URL];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 200,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { success: false, message: 'Too many requests, please try again later.' }
// });
// app.use('/api/', apiLimiter);


app.use('/api/employee', employeeRoutes);
app.use('/api/admin', adminRoutes);

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const existingAdmin = await User.findOne({ email: adminEmail, role: 'ADMIN' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const newAdmin = new User({
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        joining_date: new Date(),
        date_of_birth: new Date('1990-01-01') // arbitrary setup DOB
      });
      await newAdmin.save();
      console.log('Admin user seeded.');
    } else {
      console.log('Admin user already exists.');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};

const seedPolicy = async () => {
  try {
    const policy = await LeavePolicy.findOne();
    if (!policy) {
      const newPolicy = new LeavePolicy({});
      await newPolicy.save();
      console.log('LeavePolicy seeded with defaults.');
    } else {
      console.log('LeavePolicy already exists.');
    }
  } catch (error) {
    console.error('Error seeding LeavePolicy:', error);
  }
};



mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    seedAdmin();
    seedPolicy();

    // IL-1: Midnight attendance resolution cron (runs 00:05 every day)
    cron.schedule('5 0 * * *', async () => {
      console.log('[CRON] Running midnight attendance resolution...');
      try {
        await resolveAllPendingAttendance();
        console.log('[CRON] Attendance resolution complete.');
      } catch (err) {
        console.error('[CRON] Attendance resolution error:', err);
      }
    });

    // IL-3: Year-end carry-forward cron (runs 00:01 on April 1st every year)
    cron.schedule('1 0 1 4 *', async () => {
      console.log('[CRON] Running year-end carry-forward...');
      try {
        await runYearEndCarryForward();
        console.log('[CRON] Year-end carry-forward complete.');
      } catch (err) {
        console.error('[CRON] Year-end carry-forward error:', err);
      }
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
