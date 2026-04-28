import React from 'react';
import { motion } from 'framer-motion';

const colorMap = {
  primary: {
    iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    glowBg: 'bg-indigo-500',
  },
  success: {
    iconBg: 'bg-green-500/10 border-green-500/20 text-green-400',
    glowBg: 'bg-green-500',
  },
  warning: {
    iconBg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    glowBg: 'bg-yellow-500',
  },
  danger: {
    iconBg: 'bg-red-500/10 border-red-500/20 text-red-400',
    glowBg: 'bg-red-500',
  },
  secondary: {
    iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    glowBg: 'bg-cyan-500',
  },
};

const DashboardCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const c = colorMap[color] || colorMap.primary;

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.15)' }}
      className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 relative overflow-hidden group"
    >
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-[40px] opacity-20 ${c.glowBg}`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-textSec font-medium text-sm mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-xs text-textSec mt-2">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${c.iconBg}`}>
          {Icon && <Icon size={24} />}
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardCard;