import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/login';
import Dashboard from './pages/dashboard';
import ApplyLeave from './pages/apply-leave';
import LeaveHistory from './pages/leave-history';
import Calendar from './pages/calendar';
import Profile from './pages/profile';
import RegularizationHistory from './pages/regularization-history';
import ChangePassword from './pages/change-password';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

const AppLayout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isMenuOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className="flex flex-col flex-1 w-full relative">
        <Navbar onMenuToggle={() => setIsMenuOpen(prev => !prev)} />
        <main className="w-full h-full overflow-y-auto p-3 sm:p-4 md:p-6 flex-1">
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
          <Route path="/change-password" element={
            <ProtectedRoute allowWhenMustChange><ChangePassword /></ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
             <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
          } />
          <Route path="/apply-leave" element={
            <ProtectedRoute><AppLayout><ApplyLeave /></AppLayout></ProtectedRoute>
          } />
          <Route path="/leave-history" element={
            <ProtectedRoute><AppLayout><LeaveHistory /></AppLayout></ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute><AppLayout><Calendar /></AppLayout></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>
          } />
          <Route path="/regularization-history" element={
            <ProtectedRoute><AppLayout><RegularizationHistory /></AppLayout></ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
