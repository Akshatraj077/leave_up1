# LeaveUp — Backend API

> Node.js + Express 5 REST API with MongoDB (Mongoose 9), JWT authentication, cron-based automation, and comprehensive leave/attendance management.

---

## Entry Point — `server.js`

On startup, the server:
1. Connects to MongoDB Atlas via `MONGO_URI`
2. **Seeds an admin user** if none exists (using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`)
3. **Seeds a default LeavePolicy** (singleton document) if none exists
4. Registers two cron jobs:
   - `00:05 daily` — resolves all PENDING attendance to ABSENT, backfills missing working days
   - `00:01 April 1st` — runs fiscal year-end leave carry-forward
5. Starts Express on `PORT` (default 5000)

**Middleware stack:** `helmet` → CORS (origin whitelist) → `express.json()` → route handlers

---

## 📊 Database Schemas (9 Models)

### User
```
name*          String        (required, trimmed)
email*         String        (required, unique, lowercase)
company_id     String        (unique, sparse, 6-12 chars — admin may not have one)
password*      String        (bcrypt hashed)
role           Enum          EMPLOYEE | ADMIN (default: EMPLOYEE)
employment_status  Enum      ACTIVE | NOTICE_PERIOD | PROBATION (default: ACTIVE)
joining_date   Date
date_of_birth  Date
pan_number     String
bank_account_number  String
bank_name      String
ifsc_code      String
account_holder_name  String
department     String        (trimmed, default: null)
admin_password_reset_required  Boolean  (default: false)
isDeleted      Boolean       (default: false — soft delete flag)
deletedAt      Date
createdAt      Date
```

### Leave
```
user_id*       ObjectId → User
date*          Date
duration*      Enum          FULL | HALF
leave_type     Enum          CL | LOP | COMP_OFF (default: CL)
status         Enum          APPLIED | APPROVED | REJECTED | CANCELLED | CANCELLATION_REQUESTED
reason*        String        (max 200 chars)
rejection_reason  String
reviewed_by    ObjectId → User
reviewed_at    Date
cancelled_at   Date
cancellation_reviewed_by  ObjectId → User
cancellation_reviewed_at  Date
isDeleted      Boolean
audit_trail    [{ action, actor_id, actor_name, actor_role, timestamp, note }]
createdAt      Date

Indexes: (user_id, date DESC), (status, date DESC)
```

### Attendance
```
user_id*       ObjectId → User
date*          Date
status         Enum          PENDING | PRESENT | ABSENT (default: PENDING)
isDeleted      Boolean

Indexes: (user_id, date) UNIQUE, (user_id, date DESC)
```

### LeaveBalance
```
user_id*       ObjectId → User
total_leaves   Number        (default: 14)
used_leaves    Number        (default: 0)
remaining_leaves  Number     (default: 14)
comp_off_balance  Number     (default: 0)
lop_days       Number        (default: 0)
year*          Number        (financial year)

Index: (user_id, year) UNIQUE
```

### LeavePolicy *(Singleton — only one document)*
```
default_cl_per_year           Number     (default: 14)
allow_half_day                Boolean    (default: true)
allow_comp_off                Boolean    (default: true)
financial_year_start_month    Number     (default: 4 = April)
working_days                  [Number]   (default: [1,2,3,4,5,6] = Mon-Sat)
max_consecutive_leave_days    Number     (default: 5)
low_balance_threshold         Number     (default: 3)
probation_leave_quota         Number     (default: 7)
max_carry_forward_days        Number     (default: 0)
updatedAt                     Date
```

### Notification
```
user_id*       ObjectId → User  (indexed)
type*          Enum          LEAVE_APPLIED | LEAVE_APPROVED | LEAVE_REJECTED | LEAVE_CANCELLED |
                             CANCELLATION_REQUESTED | BALANCE_LOW | REGULARIZATION_APPROVED |
                             REGULARIZATION_REJECTED | ANNOUNCEMENT | POLICY_UPDATED |
                             CANCELLATION_REJECTED
message*       String
is_read        Boolean       (default: false)
action_url     String        (optional deep link)
createdAt      Date

Indexes: (user_id, is_read, createdAt DESC)
TTL Index: createdAt — auto-deletes after 30 days
```

### RegularizationRequest
```
user_id*       ObjectId → User
date*          Date
reason*        String        (max 300 chars)
status         Enum          PENDING | APPROVED | REJECTED
reviewed_by    ObjectId → User
reviewed_at    Date
rejection_reason  String
createdAt      Date

Index: (user_id, date) UNIQUE — one request per employee per date
```

### Announcement
```
title*         String        (trimmed)
message*       String
priority       Enum          NORMAL | HIGH (default: NORMAL)
created_by*    ObjectId → User
expires_at     Date          (optional)
is_active      Boolean       (default: true)
createdAt      Date

TTL Index: createdAt — auto-deletes after 90 days
```

### Holiday
```
name*          String        (trimmed)
date*          Date          (unique)
type           Enum          NATIONAL | REGIONAL | OPTIONAL (default: NATIONAL)
```

---

## 🔧 Utility Modules

### `leaveUtils.js`
- `getCurrentFinancialYear(policy)` — returns FY start year based on policy config
- `isHoliday(date, holidays)` — checks if date matches any holiday
- `isWorkingDay(date, holidays, workingDays)` — checks day-of-week + not a holiday
- `calculateLeaveDeduction(duration, policy)` — returns 0.5 for HALF, 1 for FULL
- `getPolicy()` — cached LeavePolicy fetch with 60s TTL
- `clearPolicyCache()` — called after policy update
- `createNotification(user_id, type, message)` — creates notification with silent fail

### `attendanceUtils.js`
- `resolveAttendanceForEmployee(userId, month, year)` — backfills ABSENT for missing working days, flips PENDING → ABSENT
- `resolveAllPendingAttendance()` — runs above for ALL active employees (used by cron)

### `yearEndUtils.js`
- `runYearEndCarryForward()` — for each employee: reads previous FY balance → calculates carry-forward (capped by `max_carry_forward_days`) → creates new FY balance with `$setOnInsert`

### `notifyAdmins.js`
- `notifyAllAdmins(type, message)` — finds all non-deleted admins and creates notifications for each

### `paginationUtils.js`
- `getPaginationParams(query)` — extracts `page`, `limit` (capped 1-100), `skip`
- `buildPaginatedResponse(data, total, page, limit)` — standard response shape with `totalPages`, `hasNextPage`, `hasPrevPage`

### `rateLimiter.js`
- `loginLimiter` — 10 requests per 15 minutes per IP (⚠️ currently not applied to any route)

---

## 🔒 Validation Layer (`validators/`)

**Admin validators:**
- `addEmployeeValidator` — name, email, company_id (6-12 chars), password (complexity regex), employment_status
- `rejectLeaveValidator` — rejection_reason (min 5 chars)
- `updatePolicyValidator` — CL per year (1-365), working_days (array of 0-6), FY month (1-12)
- `addHolidayValidator` — name, ISO date, optional type
- `creditCompOffValidator` — days (min 0.5)
- `bulkApproveValidator` / `bulkRejectValidator` — array of MongoIDs

**Employee validators:**
- `applyLeaveValidator` — ISO date, duration (FULL/HALF), reason (3-200 chars), optional leave_type
- `changePasswordValidator` — currentPassword required, newPassword with complexity regex
- `regularizationValidator` — ISO date, reason (3-300 chars)
- `updateProfileValidator` — optional name, PAN regex, bank account regex, IFSC regex

**Error handler:** `handleValidationErrors` — returns `400` with array of `{ field, message }` objects.

---

## ⚡ Key Business Logic Details

### Leave Application (`employeeController.applyLeave`)
1. Validates reason length (3-200 chars)
2. Blocks employees in NOTICE_PERIOD
3. Normalizes date to UTC midnight
4. Rejects past dates
5. Checks working day (policy + holidays)
6. Checks half-day policy permission
7. Checks for duplicate leave on same date (excluding REJECTED)
8. **Consecutive leave check** — scans ±(max+7) day window, builds working-day streak, blocks if exceeds `max_consecutive_leave_days`
9. Determines leave type: COMP_OFF (if requested + sufficient balance) → CL (if balance available) → LOP (fallback)
10. Creates leave with audit trail entry
11. Sends notification to employee + all admins

### Leave Approval Balance Logic (`adminController.approveLeave`)
- **CL**: `used_leaves += deduction`, `remaining_leaves = max(0, total - used)`, triggers low-balance notification if below threshold
- **LOP**: `lop_days += deduction` (no CL deduction)
- **COMP_OFF**: `comp_off_balance -= deduction`

### Soft Delete Cascade (`adminController.deleteEmployee`)
Sets `isDeleted: true` on User, then bulk-updates all Leave, Attendance, and RegularizationRequest records for that user.

### Employee Restore (`adminController.addEmployee`)
If adding an employee with an email/company_id that matches a soft-deleted user, the existing record is **restored** (updated in place) rather than creating a duplicate.

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | 5.2.1 | HTTP framework |
| mongoose | 9.4.1 | MongoDB ODM |
| jsonwebtoken | 9.0.3 | JWT auth |
| bcryptjs | 3.0.3 | Password hashing |
| cors | 2.8.6 | Cross-origin requests |
| helmet | 8.1.0 | Security headers |
| express-rate-limit | 8.3.2 | Rate limiting (defined, unused) |
| express-validator | 7.3.2 | Input validation |
| node-cron | 4.2.1 | Scheduled tasks |
| dotenv | 17.4.2 | Environment variables |
| nodemon | 3.0.0 | Dev auto-reload (devDep) |
