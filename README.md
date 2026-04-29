# LeaveUp — Human Resource Management System

> A production-grade, full-stack HRMS built with the MERN stack featuring **separate Employee and Admin portals**, real-time notifications, configurable leave policies, attendance tracking, regularization workflows, and analytics dashboards.

| Layer | Live URL |
|-------|----------|
| **Employee Portal** | [leaveup1front.vercel.app](https://leaveup1front.vercel.app) |
| **Admin Portal** | [leaveup1admin.vercel.app](https://leaveup1admin.vercel.app) |
| **Backend API** | [leave-up1-back.onrender.com](https://leave-up1-back.onrender.com) |

---

## 1. Project Overview

LeaveUp is a **Leave & Attendance Management System** designed for small-to-mid-size organisations. It automates the entire lifecycle of employee leave requests, attendance tracking, and policy enforcement through two completely independent React SPAs communicating with a shared stateless REST API.

**Real-world use case:** An HR department uses the Admin portal to onboard employees, define leave policies, manage holidays, publish announcements, and review leave/regularization requests. Employees log into their own portal to mark attendance, apply for leave, track balances, and receive notifications — all in real time.

---

## 2. 🚀 Features

### 👤 Employee Features
| Feature | Details |
|---------|---------|
| **Login** | Via email **or** company ID + password |
| **Dashboard** | Leave balance, employment status, upcoming holidays, profile completion % |
| **Mark Present** | Daily attendance with working-day & holiday validation |
| **Apply Leave** | Full/Half day, CL/LOP/Comp-Off with consecutive-day & policy checks |
| **Cancel Leave** | Instant cancel (APPLIED) or cancellation-request workflow (APPROVED) |
| **Withdraw Cancellation** | Retract a pending cancellation request |
| **Leave History** | Paginated, filterable by status & type, sortable |
| **Leave Stats** | FY-scoped counts: applied, approved, rejected, cancelled |
| **Audit Trail** | Full action history on every leave record |
| **Calendar View** | Monthly view with holidays, leaves, and attendance overlaid |
| **Regularization** | Request attendance correction for past ABSENT days |
| **Profile Management** | Edit name, PAN, bank details; forced password reset flow |
| **Notifications** | Real-time bell with unread count, mark-read, auto-expiry (30 days TTL) |
| **Announcements** | View active company announcements |
| **Resolve Pending** | Trigger backfill of missing attendance for a given month |

### 🛠️ Admin Features
| Feature | Details |
|---------|---------|
| **Dashboard** | Total employees, pending leaves, absent count, recent requests, holidays |
| **Employee CRUD** | Add (with soft-delete restore), edit, deactivate (soft delete cascades) |
| **Password Reset** | Admin sets new password → employee forced to change on next login |
| **Leave Management** | Approve, reject (with reason), bulk approve/reject, delete with balance refund |
| **Cancellation Review** | Approve or reject employee cancellation requests with balance restoration |
| **Leave Balances** | Paginated overview of all employee balances with search/filter |
| **Holiday CRUD** | Add/edit/delete holidays (National, Regional, Optional) |
| **Calendar** | Organisation-wide view with leave counts and pending badges per day |
| **Leave Policy** | Configure CL quota, half-day, comp-off, working days, FY start, carry-forward, consecutive limits |
| **Comp-Off Credit** | Credit comp-off days to individual employees |
| **Regularization** | Approve/reject regularization requests; auto-flips attendance to PRESENT |
| **Announcements** | Create, edit, delete announcements with priority & optional expiry |
| **Analytics** | Leaves by type, leaves by department, daily attendance trends (Recharts) |
| **CSV Export** | Export employees list and leaves data as CSV (with BOM for Excel) |
| **Year-End Carry-Forward** | Manual trigger + automated cron for fiscal year rollover |
| **Admin Profile** | Change admin password |
| **Notifications** | Receive alerts for new leave applications, cancellation requests |

### ⚙️ System Features
- **Auto-seeding**: Admin user + default leave policy created on first startup
- **Cron Jobs**: Midnight attendance resolution (00:05 daily), year-end carry-forward (April 1st)
- **Soft Delete**: Employees, leaves, attendance — deactivation preserves historical data
- **Audit Trail**: Every leave action (apply, approve, reject, cancel, withdraw) is logged with actor info
- **Policy Caching**: LeavePolicy cached in-memory with 60s TTL, cleared on update
- **Pagination**: All list endpoints use standardised pagination with `page`, `limit`, `totalPages`, `hasNextPage`
- **Input Validation**: express-validator on all mutation endpoints (both admin and employee)
- **Notification TTL**: MongoDB TTL index auto-deletes notifications after 30 days
- **Announcement TTL**: Auto-deletes after 90 days via TTL index
- **CORS Whitelist**: Only configured frontend/admin origins allowed
- **Helmet**: Security headers via helmet middleware
- **Regex Escaping**: User search inputs are escaped to prevent ReDoS

---

## 3. 🧱 Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend (Employee)** | React 19, Vite 8, Tailwind CSS 4, Framer Motion, Lucide Icons, date-fns, react-hot-toast |
| **Frontend (Admin)** | React 19, Vite 8, Tailwind CSS 4, Framer Motion, Lucide Icons, Recharts, date-fns, react-hot-toast |
| **Backend** | Node.js, Express 5, Mongoose 9 (MongoDB ODM) |
| **Database** | MongoDB Atlas (cloud-hosted) |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Scheduling** | node-cron |
| **Validation** | express-validator |
| **Security** | helmet, express-rate-limit (defined but currently disabled), CORS whitelist |
| **Deployment** | Vercel (both frontends), Render (backend) |

---

## 4. 🏗️ Architecture Overview

```
┌──────────────────┐     HTTPS + Bearer JWT     ┌──────────────────┐
│  Employee Portal │ ──────────────────────────► │                  │
│  (Vercel SPA)    │   /api/employee/*           │   Express API    │
└──────────────────┘                             │   (Render)       │
                                                 │                  │
┌──────────────────┐     HTTPS + Bearer JWT     │   ┌───────────┐  │
│  Admin Portal    │ ──────────────────────────► │   │ MongoDB   │  │
│  (Vercel SPA)    │   /api/admin/*              │   │ Atlas     │  │
└──────────────────┘                             │   └───────────┘  │
                                                 └──────────────────┘
```

**Key architectural decisions:**
- **Zero shared code** between Employee and Admin SPAs — completely independent React apps
- **Stateless API** — all auth via JWT in `Authorization: Bearer` header (no cookies, no sessions)
- **Role-based route separation** — `/api/employee/*` and `/api/admin/*` with separate middleware
- **Each frontend** has its own `axiosInstance` with interceptors for token injection and 401/403 handling
- **localStorage** for token persistence — separate keys (`hrms_token` vs `hrms_admin_token`)

---

## 5. 📂 Folder Structure

```
leaveup/
├── backend/
│   ├── server.js              # Entry point, DB connect, CORS, cron jobs, seeding
│   ├── controllers/
│   │   ├── adminController.js   # 30+ admin endpoints (~1500 lines)
│   │   └── employeeController.js # 20+ employee endpoints (~690 lines)
│   ├── middlewares/
│   │   ├── adminAuth.js         # JWT verify + role === 'ADMIN' check
│   │   └── employeeAuth.js      # JWT verify + soft-delete + forced password reset check
│   ├── models/                  # 9 Mongoose schemas
│   ├── routes/
│   │   ├── adminRoutes.js       # All admin routes behind adminAuth middleware
│   │   └── employeeRoutes.js    # All employee routes behind employeeAuth middleware
│   ├── utils/                   # Shared business logic utilities
│   └── validators/              # express-validator chains
├── frontend/                    # Employee SPA (Vite + React + Tailwind)
│   └── src/
│       ├── api/axiosInstance.js  # Axios with /api/employee base + interceptors
│       ├── context/AuthContext.jsx
│       ├── components/          # Sidebar, Navbar, ProtectedRoute, shared/
│       └── pages/               # 7 pages: dashboard, apply-leave, leave-history, etc.
├── admin/                       # Admin SPA (Vite + React + Tailwind)
│   └── src/
│       ├── api/axiosInstance.js  # Axios with /api/admin base + interceptors
│       ├── context/AuthContext.jsx
│       ├── components/          # Sidebar, Navbar, ProtectedRoute, shared/
│       └── pages/               # 12 pages: dashboard, employee-management, analytics, etc.
└── README.md
```

---

## 6. 🔐 Authentication & Authorization — Deep Dive

### Login Flow

**Employee login** (`POST /api/employee/login`):
1. Accepts `emailOrCompanyId` + `password` — queries User with `$or` on email/company_id AND `role: 'EMPLOYEE'`
2. Compares password with bcrypt hash
3. Signs JWT with `{ id, role }` payload, **7-day expiry**
4. Returns token + user object (password stripped)
5. Frontend stores in `localStorage` as `hrms_token` + `hrms_user`

**Admin login** (`POST /api/admin/login`):
1. Accepts `email` + `password` — queries User with email AND `role: 'ADMIN'`
2. Same bcrypt + JWT flow, stored as `hrms_admin_token` + `hrms_admin_user`

### Token Handling

- Tokens are sent via `Authorization: Bearer <token>` header on every request
- Admin auth middleware also accepts `?token=` query parameter (for CSV export endpoints that open in new tabs)
- Axios interceptors automatically attach tokens from localStorage
- On 401 response → auto-logout (clear localStorage + redirect to `/login`)
- On 403 with `forcePasswordReset: true` → redirect to `/profile?forcePasswordReset=true`

### Role Enforcement

| Middleware | File | Checks |
|-----------|------|--------|
| `adminAuth` | `middlewares/adminAuth.js` | Verifies JWT → checks `decoded.role === 'ADMIN'` → sets `req.user = decoded` |
| `employeeAuth` | `middlewares/employeeAuth.js` | Verifies JWT → fetches full User from DB → checks `!isDeleted` → checks `admin_password_reset_required` flag → sets `req.user` |

**Critical difference**: Employee middleware does a **live DB lookup** on every request (checking deletion + password reset status). Admin middleware trusts the JWT payload only — it does NOT re-check the DB.

### Forced Password Reset

When an admin creates/edits an employee with a new password, `admin_password_reset_required` is set to `true`. The employee middleware blocks ALL routes (returning 403) except `/change-password` until the employee resets. The frontend interceptor detects this and redirects to the profile page.

### Frontend Route Protection

Both SPAs use a `ProtectedRoute` component that checks `AuthContext.user` (populated from localStorage). If null → redirect to `/login`. **This is client-side only** — the real security is the backend middleware.

### ⚠️ Security Analysis

| Finding | Severity | Detail |
|---------|----------|--------|
| **Hardcoded JWT secret** | 🔴 Critical | `JWT_SECRET=super_secret_jwt_key_placeholder` in `.env` — trivially guessable |
| **7-day token expiry** | 🟡 Medium | No refresh token mechanism; a stolen token is valid for a full week |
| **No token revocation** | 🟡 Medium | Logout only clears localStorage; the JWT itself remains valid until expiry |
| **Admin auth skips DB** | 🟡 Medium | Deleted/compromised admin accounts remain authorized until token expires |
| **Rate limiting disabled** | 🟡 Medium | `loginLimiter` and `apiLimiter` are defined but commented out in production |
| **Query param token** | 🟠 Low-Med | CSV export accepts token in URL query string — logged in server/proxy access logs |
| **No HTTPS enforcement** | 🟠 Low | Relies on deployment platform (Vercel/Render) for TLS |
| **localStorage tokens** | 🟠 Low | Vulnerable to XSS; httpOnly cookies would be more secure |
| **No password history** | 🟢 Low | Users can re-use the same password on reset |

---

## 7. 🔄 Core Workflows

### Leave Request Lifecycle
```
Employee applies → status: APPLIED → balance NOT deducted yet
    ├── Admin approves → APPROVED → CL/CompOff/LOP balance adjusted
    ├── Admin rejects (reason required) → REJECTED → no deduction
    └── Employee cancels:
          ├── If APPLIED → CANCELLED immediately
          └── If APPROVED → CANCELLATION_REQUESTED
                ├── Admin approves cancellation → CANCELLED → balance refunded
                ├── Admin rejects cancellation → stays APPROVED
                └── Employee withdraws → back to APPROVED
```

### Attendance Flow
```
Each working day:
  Employee visits dashboard → GET /attendance/today checks:
    - Is today a working day? (policy.working_days + holiday check)
    - Does attendance record exist?
  If no record or PENDING → show "Mark Present" button
  Employee clicks → POST /attendance/mark-present → status: PRESENT

Midnight cron (00:05 daily):
  For all active employees, for current month:
    - Missing attendance records on working days → insert as ABSENT
    - PENDING records → flip to ABSENT
```

### Regularization Flow
```
Employee sees ABSENT day in calendar
  → POST /regularization (past date, working day, must be ABSENT)
  → status: PENDING → Admin notified
  → Admin approves → Attendance flipped to PRESENT
  → Admin rejects (with reason) → remains ABSENT, employee notified
```

### Notification Flow
```
Triggers:
  - Employee applies leave → employee gets confirmation + all admins notified
  - Admin approves/rejects → employee notified
  - Cancellation requested → admins notified
  - Leave balance low → employee warned
  - Policy updated → ALL employees notified
  - Announcement created → ALL employees notified
  - Comp-off credited → target employee notified
  - Regularization approved/rejected → employee notified

Storage: MongoDB with TTL index (auto-delete after 30 days)
Delivery: Pull-based (frontend polls on page load, not WebSocket)
```

---

## 8. 🌐 API Endpoints

### Employee Routes (`/api/employee`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/login` | Login with email/companyId + password | Public |
| GET | `/dashboard` | Leave balance, holidays, profile % | Employee |
| POST | `/leave/apply` | Apply for leave | Employee |
| GET | `/leave/stats` | FY leave statistics | Employee |
| GET | `/leave/history` | Paginated leave history | Employee |
| PUT | `/leave/:id/cancel` | Cancel or request cancellation | Employee |
| PUT | `/leave/:id/withdraw` | Withdraw cancellation request | Employee |
| GET | `/leave/:id/trail` | Get leave audit trail | Employee |
| GET | `/calendar` | Monthly calendar data | Employee |
| GET | `/attendance/today` | Today's attendance status | Employee |
| POST | `/attendance/mark-present` | Mark today as present | Employee |
| POST | `/attendance/resolve-pending` | Backfill missing attendance | Employee |
| GET | `/notifications` | Paginated notifications | Employee |
| PUT | `/notifications/read-all` | Mark all as read | Employee |
| PUT | `/notifications/:id/read` | Mark one as read | Employee |
| PUT | `/change-password` | Change password | Employee |
| GET | `/profile` | Get profile | Employee |
| PUT | `/profile` | Update profile (whitelisted fields) | Employee |
| POST | `/regularization` | Submit regularization request | Employee |
| GET | `/regularization` | My regularization history | Employee |
| GET | `/announcements` | Active announcements | Employee |

### Admin Routes (`/api/admin`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/login` | Admin login | Public |
| GET | `/dashboard` | System overview stats | Admin |
| GET | `/attendance/today` | Today's attendance summary | Admin |
| GET | `/employees` | Paginated employee list | Admin |
| GET | `/employees/export-csv` | Export employees CSV | Admin |
| POST | `/employees` | Add employee (or restore deleted) | Admin |
| PUT | `/employees/:id` | Edit employee | Admin |
| PUT | `/employees/:id/credit-comp-off` | Credit comp-off days | Admin |
| DELETE | `/employees/:id` | Soft-delete employee | Admin |
| GET | `/leaves` | All leave requests (paginated) | Admin |
| GET | `/leaves/export-csv` | Export leaves CSV | Admin |
| PUT | `/leaves/:id/approve` | Approve leave | Admin |
| PUT | `/leaves/:id/reject` | Reject leave (reason required) | Admin |
| PUT | `/leaves/:id/approve-cancellation` | Approve cancellation | Admin |
| PUT | `/leaves/:id/reject-cancellation` | Reject cancellation | Admin |
| GET | `/leaves/:id/trail` | Leave audit trail | Admin |
| DELETE | `/leaves/:id` | Hard-delete leave (with refund) | Admin |
| POST | `/leaves/bulk-approve` | Bulk approve leaves | Admin |
| POST | `/leaves/bulk-reject` | Bulk reject leaves | Admin |
| GET | `/leave-balances` | All employee balances | Admin |
| GET | `/holidays` | All holidays | Admin |
| POST | `/holidays` | Add holiday | Admin |
| PUT | `/holidays/:id` | Edit holiday | Admin |
| DELETE | `/holidays/:id` | Delete holiday | Admin |
| GET | `/calendar` | Org-wide calendar | Admin |
| GET | `/policy` | Get leave policy | Admin |
| PUT | `/policy` | Update leave policy | Admin |
| POST | `/system/year-end-carry-forward` | Trigger year-end | Admin |
| GET | `/notifications` | Admin notifications | Admin |
| PUT | `/notifications/read-all` | Mark all read | Admin |
| PUT | `/notifications/:id/read` | Mark one read | Admin |
| PUT | `/change-password` | Change admin password | Admin |
| GET | `/regularization` | All regularization requests | Admin |
| PUT | `/regularization/:id/approve` | Approve regularization | Admin |
| PUT | `/regularization/:id/reject` | Reject regularization | Admin |
| POST | `/announcements` | Create announcement | Admin |
| GET | `/announcements` | List announcements | Admin |
| PUT | `/announcements/:id` | Update announcement | Admin |
| DELETE | `/announcements/:id` | Delete announcement | Admin |
| GET | `/analytics/leaves-by-type` | Leaves by type stats | Admin |
| GET | `/analytics/leaves-by-department` | Leaves by department | Admin |
| GET | `/analytics/attendance-trends` | Daily attendance trends | Admin |

---

## 9. ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/lms?retryWrites=true&w=majority
JWT_SECRET=<strong-random-secret>
PORT=5000
ADMIN_EMAIL=info@magicalabs.com
ADMIN_PASSWORD=admin123
FRONTEND_URL=https://leaveup1front.vercel.app
ADMIN_URL=https://leaveup1admin.vercel.app
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://leave-up1-back.onrender.com
```

### Admin (`admin/.env`)
```env
VITE_API_URL=https://leave-up1-back.onrender.com
```

> **Note:** For local development, change `VITE_API_URL` to `http://localhost:5000` and add `http://localhost:5173` / `http://localhost:5174` to the backend CORS whitelist.

---

## 10. 🧪 Running Locally

```bash
# 1. Clone the repository
git clone <repo-url> && cd leaveup

# 2. Backend
cd backend
npm install
# Edit .env: set MONGO_URI (local or Atlas), set a real JWT_SECRET
# Add localhost URLs to CORS whitelist in server.js
node server.js          # or: npm run dev (uses nodemon)
# → Server on http://localhost:5000
# → Auto-seeds admin user + leave policy on first run

# 3. Employee Frontend (new terminal)
cd frontend
npm install
# Edit .env: VITE_API_URL=http://localhost:5000
npm run dev
# → http://localhost:5173

# 4. Admin Frontend (new terminal)
cd admin
npm install
# Edit .env: VITE_API_URL=http://localhost:5000
npm run dev
# → http://localhost:5174
```

**First-time workflow:**
1. Go to `http://localhost:5174` → login with `info@magicalabs.com` / `admin123`
2. Navigate to Employees → Add a new employee (sets `admin_password_reset_required: true`)
3. Go to `http://localhost:5173` (incognito) → login as the employee
4. Employee is forced to change password on first login
5. After password reset, full portal access is granted

---

## 11. 🚀 Deployment

| Component | Platform | Config |
|-----------|----------|--------|
| **Backend** | Render (Web Service) | Start command: `node server.js` |
| **Employee Frontend** | Vercel | Build: `vite build`, Output: `dist/` |
| **Admin Frontend** | Vercel | Build: `vite build`, Output: `dist/` |

**Critical configs:**
- Both Vercel apps have `vercel.json` with SPA rewrite: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` — required for client-side routing
- Backend CORS whitelist must include exact Vercel deployment URLs (set via `FRONTEND_URL` and `ADMIN_URL` env vars)
- `credentials: true` is set in CORS but no cookies are used (only Bearer tokens)

---

## 12. ⚠️ Issues & Weaknesses

### 🔴 Critical
1. **Hardcoded JWT secret** — `super_secret_jwt_key_placeholder` is committed. Anyone can forge tokens.
2. **Admin credentials in `.env`** — default `admin123` password; `.env` files are in `.gitignore` but the seeded password is weak.
3. **Rate limiting disabled** — both `loginLimiter` and global `apiLimiter` are commented out, enabling brute-force attacks.

### 🟡 Significant
4. **Admin auth doesn't check DB** — `adminAuth` middleware only verifies the JWT, never checks if the admin still exists or is deleted. A deleted admin's token works until expiry.
5. **No refresh tokens** — 7-day JWTs with no rotation; token theft = week-long access.
6. **`deleteLeave` is a hard delete** — uses `findByIdAndDelete`, losing audit trail. Inconsistent with the soft-delete pattern used elsewhere.
7. **Balance race conditions** — Concurrent leave approvals for the same user can cause incorrect balance calculations (no atomic operations or optimistic locking).
8. **No transaction usage** — Multi-step operations (approve leave + adjust balance + create notification) are not wrapped in MongoDB transactions.
9. **RegularizationRequest uses wrong notification type** — `applyRegularization` sends type `'LEAVE_APPLIED'` instead of a regularization-specific type.
10. **Employee export includes deleted** — `exportEmployeesCSV` queries `role: 'EMPLOYEE'` without `isDeleted: false` filter.

### 🟠 Minor
11. **Commented-out dead code** — Old `addEmployee` function (lines 158-217) left in `adminController.js`.
12. **No input validation on `editEmployee`** — Unlike `addEmployee`, the edit route has no express-validator chain.
13. **Inconsistent error messages** — Login returns identical messages for "user not found" and "wrong password" (good for security, but error codes would help debugging).
14. **`ProtectedRoute` is shallow** — Only checks localStorage presence; doesn't verify token validity client-side.
15. **Policy notification spam** — Updating policy sends a notification to ALL employees individually in a loop, not batched.

---

## 13. 💡 Suggested Improvements

| Priority | Improvement |
|----------|-------------|
| 🔴 P0 | **Replace JWT secret** with a cryptographically random 256-bit key; use env-only, never commit |
| 🔴 P0 | **Enable rate limiting** on login endpoints immediately; uncomment and configure |
| 🔴 P0 | **Add DB lookup to `adminAuth`** middleware to check user existence and deletion status |
| 🟡 P1 | **Implement refresh tokens** — short-lived access tokens (15min) + httpOnly refresh cookie |
| 🟡 P1 | **Wrap multi-step ops in MongoDB transactions** (approve + balance + notification) |
| 🟡 P1 | **Add express-validator to `editEmployee`** route |
| 🟡 P1 | **Fix `exportEmployeesCSV`** to filter out deleted employees |
| 🟡 P1 | **Convert `deleteLeave` to soft-delete** for consistency |
| 🟡 P1 | **Use atomic `$inc` operators** for balance updates instead of read-modify-write |
| 🟡 P2 | **Add WebSocket/SSE** for real-time notifications instead of polling |
| 🟡 P2 | **Add test suite** — currently zero tests (`npm test` just echoes an error) |
| 🟠 P3 | **Remove dead commented code** from adminController |
| 🟠 P3 | **Add request logging** (morgan or similar) for debugging and audit |
| 🟠 P3 | **Centralise error handling** with an Express error middleware instead of try/catch in every controller |
| 🟠 P3 | **Add Swagger/OpenAPI** documentation for the REST API |

---

## 📚 Sub-Documentation

Each application has its own detailed README:

- [`backend/README.md`](./backend/README.md) — Database schemas, business logic, cron jobs
- [`frontend/README.md`](./frontend/README.md) — Employee portal pages, components, state management
- [`admin/README.md`](./admin/README.md) — Admin portal pages, components, analytics

---

*Built by [Akshat Raj](https://github.com/Akshatraj077) • Powered by MongoDB Atlas, Render, and Vercel*
