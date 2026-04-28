import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import DashboardCard from '../components/DashboardCard';
import { Users, FileStack, UserX, UserCheck, Loader2, Activity } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axiosInstance.get(`/dashboard?t=${Date.now()}`);
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleQuickApprove = async (id) => {
    try {
      await axiosInstance.put(`/leaves/${id}/approve`);
      // Optimistic update
      setData(prev => ({
        ...prev,
        pendingLeaves: prev.pendingLeaves - 1,
        recentLeaves: prev.recentLeaves.filter(l => l._id !== id)
      }));
    } catch (err) {
      console.error(err);
    }
  };



  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { totalEmployees, pendingLeaves, absentCount, activeEmployees, recentLeaves, upcomingHolidays, todayAttendance } = data;

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">System Overview</h2>
        <p className="text-textSec text-sm mt-1">Real-time statistics across the organization.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Total Employees" 
          value={totalEmployees || 0} 
          icon={Users} 
          color="primary"
        />
        <DashboardCard 
          title="Active Employees" 
          value={activeEmployees || 0} 
          icon={UserCheck} 
          color="success"
        />
        <DashboardCard 
          title="Pending Leave Requests" 
          value={pendingLeaves || 0} 
          icon={FileStack} 
          color="warning"
        />
        <DashboardCard 
          title="Absent Today" 
          value={absentCount || 0} 
          icon={UserX} 
          color="danger"
        />
      </div>

      {/* Today's Attendance Section (Admin context) */}
      <div className="bg-card/30 border border-border/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Today's Attendance Overview
        </h3>
        {todayAttendance ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-background/40 p-4 rounded-xl border border-border/40">
                <p className="text-xs text-textSec uppercase">Working Day</p>
                <p className="text-white font-bold mt-1">{todayAttendance.isWorkingDay ? 'Yes' : 'No'}</p>
             </div>
             <div className="bg-background/40 p-4 rounded-xl border border-border/40">
                <p className="text-xs text-textSec uppercase">Holiday</p>
                <p className="text-white font-bold mt-1">{todayAttendance.holiday?.name || 'None'}</p>
             </div>
             <div className="bg-background/40 p-4 rounded-xl border border-border/40">
                <p className="text-xs text-textSec uppercase">Organization Status</p>
                <p className="text-white font-bold mt-1">{absentCount} Absent Today</p>
             </div>
             <div className="bg-background/40 p-4 rounded-xl border border-border/40">
                <p className="text-xs text-textSec uppercase">Date</p>
                <p className="text-white font-bold mt-1 text-sm">{todayAttendance.todayFormatted}</p>
             </div>
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 xl:col-span-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col h-[500px]">
          <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-border/50">Recent Pending Requests</h3>
          <div className="overflow-y-auto flex-1 pr-2">
            {recentLeaves?.length > 0 ? (
              <div className="space-y-3">
                {recentLeaves.map((leave) => (
                  <div key={leave._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 hover:bg-background/80 transition-colors">
                    <div>
                      <p className="font-semibold text-white">{leave.user_id?.name} <span className="text-textSec text-xs ml-2 font-normal">{leave.user_id?.company_id}</span></p>
                      <p className="text-sm text-textSec mt-1">
                        {formatDate(leave.date)} • <span className={leave.duration === 'FULL' ? 'text-secondary' : 'text-primary'}>{leave.duration} Day</span> • {leave.leave_type}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0 items-center">
                      <button 
                        onClick={() => handleQuickApprove(leave._id)}
                        className="px-3 py-1.5 bg-success/10 text-success border border-success/30 hover:bg-success/20 rounded-lg text-sm font-medium transition-colors"
                      >
                        Approve
                      </button>
                      <Link to="/leave-requests" className="text-xs text-textSec hover:text-white transition-colors">Manage →</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-textSec">
                No pending leave requests.
              </div>
            )}
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 xl:col-span-1 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col h-[500px]">
          <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-border/50">Upcoming Holidays</h3>
          <div className="overflow-y-auto flex-1 pr-2">
            {upcomingHolidays?.length > 0 ? (
              <div className="space-y-4 shadow-sm">
                {upcomingHolidays.map((holiday) => (
                  <div key={holiday._id} className="flex flex-col gap-1 p-4 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-white">{holiday.name}</span>
                      <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-md font-medium">{holiday.day}</span>
                    </div>
                    <div className="text-sm text-textSec">
                      {formatDate(holiday.date)}
                      <p className="mt-1 text-xs">{holiday.occasion}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="h-full flex items-center justify-center text-textSec text-sm text-center">
                 No upcoming holidays.
               </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
