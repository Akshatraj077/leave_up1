# LeaveUp — Admin Portal

> React 19 SPA built with Vite 8 and Tailwind CSS 4 — the administrative interface for managing employees, leave requests, policies, holidays, announcements, and analytics.

**Live:** [leaveup1admin.vercel.app](https://leaveup1admin.vercel.app)

---

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19.2.4 | UI framework |
| Vite | 8.0.4 | Build tool & dev server |
| Tailwind CSS | 4.2.2 | Utility-first styling |
| React Router DOM | 7.14.1 | Client-side routing |
| Axios | 1.15.0 | HTTP client |
| Framer Motion | 12.38.0 | Animations & transitions |
| Lucide React | 1.8.0 | Icon library |
| **Recharts** | 3.8.1 | Analytics charts (unique to admin) |
| date-fns | 4.1.0 | Date formatting |
| react-hot-toast | 2.6.0 | Toast notifications |

> **Key difference from Employee Portal:** Admin includes **Recharts** for analytics dashboards and has **12 pages** vs 7.

---

## 🗂️ Structure

```
admin/src/
├── api/
│   └── axiosInstance.js        # Axios with baseURL=/api/admin, Bearer token interceptor
├── context/
│   └── AuthContext.jsx          # React Context (hrms_admin_token / hrms_admin_user keys)
├── components/
│   ├── Navbar.jsx               # Top navigation bar
│   ├── Sidebar.jsx              # Left sidebar with admin navigation (more links than employee)
│   ├── ProtectedRoute.jsx       # Redirects to /login if no user in context
│   ├── DashboardCard.jsx        # Reusable metric card component
│   └── shared/                  # Shared UI components
├── pages/
│   ├── login.jsx                # Admin email + password login
│   ├── dashboard.jsx            # System overview with stats and recent activity
│   ├── employee-management.jsx  # Full CRUD for employees (add, edit, delete, restore)
│   ├── leave-requests.jsx       # Review, approve, reject, bulk actions, cancel workflows
│   ├── leave-balances.jsx       # All employee balance overview with search
│   ├── leave-policy.jsx         # Configure system-wide leave policy
│   ├── holiday-management.jsx   # CRUD for holidays
│   ├── calendar.jsx             # Org-wide calendar with leave counts
│   ├── regularization.jsx       # Review regularization requests
│   ├── announcements.jsx        # Create, edit, delete announcements
│   ├── analytics.jsx            # Charts: leaves by type/dept, attendance trends
│   └── admin-profile.jsx        # Admin password change
├── utils/                       # Utility functions
├── assets/                      # Static assets
├── index.css                    # Global styles + Tailwind imports
└── main.jsx                     # React DOM render entry point
```

---

## 🔀 Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | Login | Admin login (email + password) |
| `/` | — | Redirects to `/dashboard` |
| `/dashboard` | Dashboard | System KPIs, recent leaves, upcoming holidays |
| `/employee-management` | EmployeeManagement | Employee CRUD with search, filters, comp-off credit |
| `/leave-requests` | LeaveRequests | All leave requests with approve/reject/bulk/cancel workflows |
| `/leave-balances` | LeaveBalances | Employee leave balance overview |
| `/leave-policy` | LeavePolicy | System-wide policy configuration |
| `/holiday-management` | HolidayManagement | Holiday CRUD |
| `/calendar` | Calendar | Org-wide monthly calendar |
| `/regularization` | Regularization | Review regularization requests |
| `/announcements` | Announcements | Announcement management |
| `/analytics` | Analytics | Visual analytics with Recharts |
| `/admin-profile` | AdminProfile | Admin password change |

All routes (except `/login`) are protected via `<ProtectedRoute>` → `<AppLayout>`.

---

## 🔐 Auth Flow

1. **Login** sends `POST /api/admin/login` with `{ email, password }`
2. On success, stores in `localStorage`:
   - `hrms_admin_token` — JWT (separate from employee token)
   - `hrms_admin_user` — user object
3. `axiosInstance` attaches `Authorization: Bearer <token>` on all requests
4. **401** → auto-logout + redirect to `/login`
5. Token is also passed as `?token=` query param for CSV export links (opens new tab)

> ⚠️ Admin and Employee use **different localStorage keys**, so both portals can be open simultaneously in the same browser.

---

## 📄 Page Details

### Dashboard (`dashboard.jsx`)
- **KPI cards**: Total employees, pending leave requests, absent count, active employees
- **Today's attendance panel**: working day check, holiday detection, absent count vs total
- **Recent leave requests**: last 10 APPLIED leaves with employee name and date
- **Upcoming holidays**: next 5 holidays

### Employee Management (`employee-management.jsx`)
- **Table view** with search (name, email, company ID) and employment status filter
- **Add Employee modal**: name, email, company ID, password (complexity enforced), joining date, DOB, department, employment status
- **Edit Employee modal**: same fields + option to reset password (triggers forced reset flag)
- **Delete**: soft-delete with confirmation dialog
- **Comp-Off Credit**: per-employee credit button with days input
- **CSV Export**: download link (token passed as query param)
- Handles **soft-delete restoration** — if email/company_id matches a deleted user, restores instead of failing

### Leave Requests (`leave-requests.jsx`)
- **Paginated table** with search (by employee name), status filter, leave type filter
- **Individual actions**: Approve, Reject (with reason modal), view detail/trail
- **Bulk actions**: select multiple → bulk approve or bulk reject (with shared reason)
- **Cancellation workflow**: for CANCELLATION_REQUESTED leaves → Approve Cancellation / Reject Cancellation buttons
- **Delete**: hard-deletes with balance refund for approved leaves
- **Leave trail modal**: full audit history of the selected leave
- **CSV Export**: filterable by status and date range

### Leave Balances (`leave-balances.jsx`)
- Table of all employees with: name, company ID, department, total/used/remaining CL, comp-off balance, LOP days
- Search by name/email/company ID, filter by department
- Paginated

### Leave Policy (`leave-policy.jsx`)
- Editable form for ALL policy fields:
  - Default CL per year, probation quota
  - Half-day toggle, comp-off toggle
  - Working days (multi-select checkboxes for Sun-Sat)
  - Financial year start month
  - Max consecutive leave days, low balance threshold
  - Max carry-forward days
- On save → updates policy + syncs all employee balances if quota changed + notifies all employees

### Holiday Management (`holiday-management.jsx`)
- **Table** of all holidays sorted by date
- **Add/Edit modal**: name, date picker, type selector (National/Regional/Optional)
- **Delete** with confirmation
- Duplicate date protection (unique index → error message)

### Calendar (`calendar.jsx`)
- **Org-wide** monthly grid (unlike employee calendar which is personal)
- Each day shows: approved leave count badge, pending leave indicator
- Holidays highlighted
- Navigate between months

### Regularization (`regularization.jsx`)
- **Table** of all regularization requests across all employees
- Search by employee name, filter by status (Pending/Approved/Rejected)
- **Approve**: flips attendance record to PRESENT, notifies employee
- **Reject**: requires rejection reason, notifies employee
- **Detail modal**: view full request details including reason

### Announcements (`announcements.jsx`)
- **Create**: title, message, priority (Normal/High), optional expiry date
- **Edit**: inline edit or modal
- **Delete**: with confirmation
- On create → notification broadcast to all active employees
- Shows creator name and creation date

### Analytics (`analytics.jsx`)
- **Leaves by Type** (pie/bar chart): CL vs LOP vs COMP_OFF counts for current FY
- **Leaves by Department** (bar chart): approved leave distribution across departments
- **Attendance Trends** (line chart): daily present vs absent counts for current month
- Powered by **Recharts** library

### Admin Profile (`admin-profile.jsx`)
- Current password + new password form
- Password complexity enforcement (8+ chars, uppercase, lowercase, number, special char)

---

## 🎨 Design System

- **Theme**: Dark mode (background `#0B0F19`, text `#F9FAFB`, borders `#1F2937`)
- **Font**: Inter (Google Fonts, weights 400-700)
- **Animations**: Framer Motion for page transitions and component animations
- **Toasts**: Dark-themed (background `#111827`)
- **Charts**: Recharts with dark-compatible colour palette
- **Icons**: Lucide React

---

## ⚙️ Configuration

### Environment Variables
```env
VITE_API_URL=https://leave-up1-back.onrender.com   # Production
# VITE_API_URL=http://localhost:5000                # Local development
```

### Vercel Config (`vercel.json`)
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## 🚀 Local Development

```bash
cd admin
npm install
# Set VITE_API_URL in .env to your backend URL
npm run dev
# → http://localhost:5174
```

**Default admin credentials** (seeded on first backend startup):
```
Email:    info@magicalabs.com
Password: admin123
```

**Build for production:**
```bash
npm run build    # Output: dist/
npm run preview  # Preview production build locally
```
