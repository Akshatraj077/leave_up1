import React from 'react';

const getActionColor = (action) => {
  if (action === 'APPLIED') return 'bg-blue-500';
  if (action === 'APPROVED' || action === 'CANCELLATION_APPROVED' || action === 'REGULARIZATION_APPROVED') return 'bg-green-500';
  if (action === 'REJECTED' || action === 'CANCELLATION_REJECTED' || action === 'REGULARIZATION_REJECTED') return 'bg-red-500';
  if (action === 'CANCELLED' || action === 'CANCELLATION_REQUESTED') return 'bg-orange-500';
  return 'bg-gray-500';
};

const AuditTrailTimeline = ({ trail = [] }) => {
  if (!trail || trail.length === 0) {
    return <div className="text-sm text-text-secondary italic">No audit trail available.</div>;
  }

  return (
    <div className="space-y-4">
      {trail.map((entry, idx) => (
        <div key={idx} className="relative pl-6">
          {idx !== trail.length - 1 && (
            <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-border" />
          )}
          
          <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-card ${getActionColor(entry.action)}`} />
          
          <div>
            <div className="font-medium text-text text-sm">
              {entry.action.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-text-secondary flex flex-wrap items-center justify-between mt-0.5 gap-2">
              <span>By {entry.actor_name} ({entry.actor_role})</span>
              <span>{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
            {entry.note && (
              <div className="mt-1 text-sm text-text-secondary bg-surface/50 p-2 rounded-md border border-border">
                {entry.note}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AuditTrailTimeline;
