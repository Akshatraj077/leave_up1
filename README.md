# Human Resource Management System (HQ.LMS / HQ.Admin)

A complete MERN stack Human Resource Management System with distinct Employee and Admin applications.

## Prerequisites

- Node.js (v18+ recommended)
- MongoDB running either locally on `localhost:27017` or via MongoDB Atlas

## Project Structure

This is a monorepo containing three distinct applications:
- `/backend`: Node.js + Express REST API (Port 5000)
- `/frontend`: React + Vite Employee Portal (Port 5173)
- `/admin`: React + Vite Administrator Portal (Port 5174)

There is ZERO shared code between the `frontend` and `admin` applications. Each is entirely standalone and communicates explicitly with the stateless backend over REST.

## Setup Instructions

### 1. Database & Environment

The backend comes mostly preconfigured. Navigate to `/backend/.env` to customize settings if necessary.

```env
MONGO_URI=mongodb://localhost:27017/hrms-db
JWT_SECRET=super_secret_jwt_key_placeholder
PORT=5000
ADMIN_EMAIL=info@magicalabs.com
ADMIN_PASSWORD=admin123
```

By default, we expect a local MongoDB instance. During the backend's first startup, it will automatically connect to MongoDB and seed the database with the Admin User based on the `.env` credentials.

### 2. Install Dependencies

You'll need to install dependencies for all three projects. Open three separate terminal instances:

**Terminal 1 (Backend):**
```bash
cd backend
npm install
```

**Terminal 2 (Employee Frontend):**
```bash
cd frontend
npm install
```

**Terminal 3 (Admin Portal):**
```bash
cd admin
npm install
```

### 3. Run the Applications

Start all three development servers simultaneously using your three terminal instances:

**Terminal 1 (Backend):**
```bash
cd backend
node server.js
```
*(Runs on `http://localhost:5000`)*

**Terminal 2 (Employee Frontend):**
```bash
cd frontend
npm run dev
```
*(Runs on `http://localhost:5173`)*

**Terminal 3 (Admin Portal):**
```bash
cd admin
npm run dev
```
*(Runs on `http://localhost:5174`)*

---

## Authentication Flow & Starting Work

1. Go to **`http://localhost:5174`** (Admin Portal). 
2. Log in using `info@magicalabs.com` and password `admin123`.
3. Navigate to **Employees** and create a new employee. You'll set their email, password, and company ID.
4. Next, go to **`http://localhost:5173`** (Employee Portal) in a new incognito window or different browser.
5. Log in using the newly created Employee's Email or Company ID, and their specific Password.
6. The employee can mark attendance, ask for leaves, and manage their profile.
7. Return to the Admin portal to approve or reject any pending applications.

Enjoy!
