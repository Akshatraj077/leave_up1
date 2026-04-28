import React from 'react';

const ProgressBar = ({ value, max, color = 'bg-primary', label }) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1 text-sm text-text-secondary">
          <span>{label}</span>
          <span>{value} / {max}</span>
        </div>
      )}
      <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
