# LeaveUp — Employee Portal (Frontend)

> React 19 SPA built with Vite 8 and Tailwind CSS 4 — the employee-facing interface for leave management, attendance tracking, and profile management.

**Live:** [leaveup1front.vercel.app](https://leaveup1front.vercel.app)

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
| date-fns | 4.1.0 | Date formatting |
| react-hot-toast | 2.6.0 | Toast notifications |

---

## 🗂️ Structure

```
frontend/src/
├── api/
│   └── axiosInstance.js      # Axios with baseURL=/api/employee, Bearer token interceptor
├── context/
│   └── AuthContext.jsx        # React Context for auth state (user, login, logout, loading)
├── components/
│   ├── Navbar.jsx             # Top navigation bar
│   ├── Sidebar.jsx            # Left sidebar with navigation links
│   ├── ProtectedRoute.jsx     # Redirects to /login if no user in context
│   ├── DashboardCard.jsx      # Reusable metric card component
│   └── shared/                # Shared UI components
├── pages/
│   ├── login.jsx              # Email/Company ID + password login
│   ├── dashboard.jsx          # Main dashboard with balance, holidays, attendance
│   ├── apply-leave.jsx        # Leave application form with date picker
│   ├── leave-history.jsx      # Paginated, filterable leave history with audit trail
│   ├── calendar.jsx           # Monthly calendar with holidays, leaves, attendance overlay
│   ├── profile.jsx            # Profile editor + password change (forced reset support)
│   └── regularization-history.jsx  # Regularization request history
├── utils/                     # Utility functions
├── assets/                    # Static assets
├── index.css                  # Global styles + Tailwind imports
└── main.jsx                   # React DOM render entry point
```

---

## 🔀 Routes

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/login` | Login | No | Employee login page |
| `/` | — | — | Redirects to `/dashboard` |
| `/dashboard` | Dashboard | Yes | Leave balance, attendance, holidays, profile completion |
| `/apply-leave` | ApplyLeave | Yes | Leave application form |
| `/leave-history` | LeaveHistory | Yes | Leave records with filters & audit trail modal |
| `/calendar` | Calendar | Yes | Monthly calendar view |
| `/profile` | Profile | Yes | Profile editor & password change |
| `/regularization-history` | RegularizationHistory | Yes | Past regularization requests |

All authenticated routes are wrapped in `<ProtectedRoute>` → `<AppLayout>` (Sidebar + Navbar + content area).

---

## 🔐 Auth Flow

1. **Login page** sends `POST /api/employee/login` with `{ emailOrCompanyId, password }`
2. On success, `AuthContext.login(token, user)` stores to `localStorage`:
   - `hrms_token` — JWT string
   - `hrms_user` — JSON-stringified user object
3. `axiosInstance` interceptor attaches `Authorization: Bearer <token>` on every request
4. On **401 response** → clears localStorage → redirects to `/login`
5. On **403 with `forcePasswordReset: true`** → redirects to `/profile?forcePasswordReset=true`
6. On page load, `AuthContext` checks localStorage for existing session (no token validation — trusts presence)

---

## 📄 Page Details

### Dashboard (`dashboard.jsx`)
- Fetches `GET /dashboard` and `GET /attendance/today` in parallel
- Displays: leave balance card (CL remaining, comp-off, LOP), employment status badge
- Shows upcoming holidays (next 5)
- Profile completion percentage (based on 6 fields: name, PAN, bank details)
- **Mark Present** button: visible only on working days when no attendance/leave exists for today
- Low balance warning when below policy threshold

### Apply Leave (`apply-leave.jsx`)
- Date picker (rejects past dates, non-working days, holidays)
- Duration selector: FULL / HALF (hidden if policy disables half-day)
- Leave type: Standard (auto CL/LOP) or Comp Off
- Reason textarea (3-200 chars)
- Submits `POST /leave/apply` → navigates to leave history on success

### Leave History (`leave-history.jsx`)
- Paginated table with status/type filters and sort order toggle
- Status badges: colour-coded (APPLIED=yellow, APPROVED=green, REJECTED=red, etc.)
- Actions per row:
  - **Cancel** (APPLIED leaves → instant cancel)
  - **Request Cancellation** (APPROVED leaves → admin review)
  - **Withdraw** (CANCELLATION_REQUESTED → revert to APPROVED)
- **Audit Trail modal** — click to view full action history of any leave

### Calendar (`calendar.jsx`)
- Monthly grid view with navigation
- Colour-coded day cells:
  - Green = PRESENT, Red = ABSENT, Yellow = PENDING
  - Blue = Holiday, Orange = Leave (with status indicators)
- Integrated regularization: click an ABSENT day → submit regularization reason inline
- Legend explaining all colour codes

### Profile (`profile.jsx`)
- Displays: name, email, company ID, department, joining date, DOB, employment status
- Editable fields: name, PAN number, bank account, bank name, IFSC, account holder name
- PAN validation: `[A-Z]{5}[0-9]{4}[A-Z]` regex
- Bank account: 9-18 digit numeric
- IFSC: `[A-Z]{4}0[A-Z0-9]{6}` regex
- **Password Change section**: current password + new password (complexity enforced)
- **Forced reset mode**: if `?forcePasswordReset=true`, shows password change prominently with instruction banner

### Regularization History (`regularization-history.jsx`)
- Paginated list of all regularization requests for the logged-in employee
- Shows: date, reason, status (PENDING/APPROVED/REJECTED), rejection reason if applicable

---

## 🎨 Design System

- **Theme**: Dark mode (background `#0B0F19`, text `#F9FAFB`)
- **Font**: Inter (Google Fonts, weights 400-700)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Toasts**: Dark-themed react-hot-toast (background `#111827`, border `#1F2937`)
- **Icons**: Lucide React (consistent line-icon style)

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
Required for SPA client-side routing — all paths serve `index.html`.

### Vite Config
Standard React + Tailwind setup with `@vitejs/plugin-react` and `@tailwindcss/vite`.

---

## 🚀 Local Development

```bash
cd frontend
npm install
# Set VITE_API_URL in .env to your backend URL
npm run dev
# → http://localhost:5173
```

**Build for production:**
```bash
npm run build    # Output: dist/
npm run preview  # Preview production build locally
```
