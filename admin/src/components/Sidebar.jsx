import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Users, UserCheck, CalendarOff, CalendarDays, LogOut, Settings, FileCheck, Megaphone, BarChart3, User } from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

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

  return (
    <div className="w-64 h-full bg-[#111827]/80 backdrop-blur-md flex flex-col hidden md:flex z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)] border-r border-[#1F2937]/50 relative">
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
    </div>
  );
};

export default Sidebar;
