import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/login';
import Dashboard from './pages/dashboard';
import EmployeeManagement from './pages/employee-management';
import LeaveRequests from './pages/leave-requests';
import HolidayManagement from './pages/holiday-management';
import Calendar from './pages/calendar';
import LeavePolicy from './pages/leave-policy';
import Regularization from './pages/regularization';
import Announcements from './pages/announcements';
import LeaveBalances from './pages/leave-balances';
import Analytics from './pages/analytics';
import AdminProfile from './pages/admin-profile';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

const AppLayout = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 w-full relative">
        <Navbar />
        <main className="w-full h-full overflow-y-auto p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" 
           toastOptions={{
            style: {
              background: '#111827',
              color: '#F9FAFB',
              border: '1px solid #1F2937'
            }
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          
          <Route path="/dashboard" element={
             <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
          } />
          <Route path="/employee-management" element={
             <ProtectedRoute><AppLayout><EmployeeManagement /></AppLayout></ProtectedRoute>
          } />
          <Route path="/leave-requests" element={
             <ProtectedRoute><AppLayout><LeaveRequests /></AppLayout></ProtectedRoute>
          } />
          <Route path="/holiday-management" element={
             <ProtectedRoute><AppLayout><HolidayManagement /></AppLayout></ProtectedRoute>
          } />
          <Route path="/calendar" element={
             <ProtectedRoute><AppLayout><Calendar /></AppLayout></ProtectedRoute>
          } />
          <Route path="/leave-policy" element={
             <ProtectedRoute><AppLayout><LeavePolicy /></AppLayout></ProtectedRoute>
          } />
          <Route path="/regularization" element={
             <ProtectedRoute><AppLayout><Regularization /></AppLayout></ProtectedRoute>
          } />
          <Route path="/announcements" element={
             <ProtectedRoute><AppLayout><Announcements /></AppLayout></ProtectedRoute>
          } />
          <Route path="/leave-balances" element={
             <ProtectedRoute><AppLayout><LeaveBalances /></AppLayout></ProtectedRoute>
          } />
          <Route path="/analytics" element={
             <ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>
          } />
          <Route path="/admin-profile" element={
             <ProtectedRoute><AppLayout><AdminProfile /></AppLayout></ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

