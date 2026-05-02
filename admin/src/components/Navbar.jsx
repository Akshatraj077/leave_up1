import React from 'react';
import { Menu } from 'lucide-react';
import NotificationBell from './shared/NotificationBell';

const Navbar = ({ onMenuToggle }) => {
  return (
    <header className="h-16 w-full flex items-center justify-between px-4 sm:px-6 bg-[#111827]/60 backdrop-blur-lg border-b border-[#1F2937]/50 shadow-[0_4px_30px_rgba(0,0,0,0.1)] z-10 sticky top-0">
      <div className="flex items-center gap-3">
        {/* Hamburger menu — visible only below lg */}
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-textSec hover:text-white hover:bg-white/10 transition-colors lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-xl font-semibold text-white tracking-wide flex items-center lg:hidden">
          ML<span className="text-primary tracking-normal">-Admin</span>
        </h1>
      </div>
      <div className="hidden lg:block text-sm text-textSec font-medium">Control Panel</div>
      <div className="flex items-center gap-4">
        <NotificationBell userRole="admin" />
      </div>
    </header>
  );
};

export default Navbar;
