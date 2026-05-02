import React, { useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Users, UserCheck, CalendarOff, CalendarDays, LogOut, Settings, FileCheck, Megaphone, BarChart3, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isMenuOpen, onClose }) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/employee-management', icon: Users },
    { name: 'Leave Balances', path: '/leave-balances', icon: BarChart3 },
    { name: 'Leave Requests', path: '/leave-requests', icon: UserCheck },
    { name: 'Regularization', path: '/regularization', icon: FileCheck },
    { name: 'Holidays', path: '/holiday-management', icon: CalendarOff },
    { name: 'Calendar', path: '/calendar', icon: CalendarDays },
    { name: 'Announcements', path: '/announcements', icon: Megaphone },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Leave Policy', path: '/leave-policy', icon: Settings },
    { name: 'Profile', path: '/admin-profile', icon: User },
  ];

  /* Close mobile menu on route change */
  const handleNavClick = () => {
    if (onClose) onClose();
  };

  /* Shared nav content rendered in both desktop and mobile sidebars */
  const renderNav = () => (
    <>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="h-16 flex items-center px-6 border-b border-[#1F2937]/50">
          <h1 className="text-xl font-semibold text-white tracking-wide">
            ML<span className="text-primary tracking-normal">-Admin</span>
          </h1>
        </div>
        <nav className="mt-4 px-4 flex flex-col gap-1.5 flex-1 overflow-y-auto pb-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-textSec hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'text-primary' : 'text-textSec'} />
                  <span className="font-medium text-sm">{item.name}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute left-0 w-1 h-8 bg-primary rounded-r-md"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-[#1F2937]/50 mt-auto">
        <div className="mb-4 px-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            A
          </div>
          <div>
            <p className="text-sm font-medium text-white">Administrator</p>
            <p className="text-xs text-textSec">System Control</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-danger hover:bg-danger/10 transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop Sidebar ── visible lg and above, unchanged from original */}
      <div className="w-64 h-full bg-[#111827]/80 backdrop-blur-md flex-col hidden lg:flex z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)] border-r border-[#1F2937]/50 relative">
        {renderNav()}
      </div>

      {/* ── Mobile Slide-in Overlay Sidebar ── visible below lg when isMenuOpen is true
           Uses z-40 so it sits above page content (z-10) but below modals (z-50).
           Slide-in overlay chosen because admin has 11 nav items — bottom tabs cannot fit. */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            {/* Sidebar panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 w-72 h-full bg-[#111827] z-40 lg:hidden flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.4)] border-r border-[#1F2937]/50"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-textSec hover:text-white hover:bg-white/10 transition-colors z-10"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
              {renderNav()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
