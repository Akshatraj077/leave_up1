import React from 'react';
import NotificationBell from './shared/NotificationBell';

const Navbar = () => {
  return (
    <header className="h-16 w-full flex items-center justify-between px-6 bg-[#111827]/60 backdrop-blur-lg border-b border-[#1F2937]/50 shadow-[0_4px_30px_rgba(0,0,0,0.1)] z-10 sticky top-0">
      <h1 className="text-xl font-semibold text-white tracking-wide flex items-center md:hidden">
        ML<span className="text-primary tracking-normal">-Admin</span>
      </h1>
      <div className="hidden md:block text-sm text-textSec font-medium">Control Panel</div>
      <div className="flex items-center gap-4">
        <NotificationBell userRole="admin" />
      </div>
    </header>
  );
};

export default Navbar;
