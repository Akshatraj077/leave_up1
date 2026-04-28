import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import DashboardCard from '../components/DashboardCard';
import { Briefcase, CalendarCheck, CalendarMinus, CalendarHeart, Loader2, Megaphone, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [markingPresent, setMarkingPresent] = useState(false);
  const [loading, setLoading] = useState(true);
  const announcementsRef = useRef(null);

  const PROFILE_FIELDS = [
    'name', 'pan_number', 'bank_account_number', 
    'bank_name', 'ifsc_code', 'account_holder_name'
  ];
  
  const getCompletionPercent = (p) => {
    if (!p) return 0;
    const filled = PROFILE_FIELDS.filter(f => p[f] && String(p[f]).trim().length > 0).length;
    return Math.round((filled / PROFILE_FIELDS.length) * 100);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, statsRes, annRes, todayRes, profileRes] = await Promise.all([
          axiosInstance.get(`/dashboard?t=${Date.now()}`),
          axiosInstance.get(`/leave/stats?t=${Date.now()}`).catch(() => ({ data: { data: {} } })),
          axiosInstance.get(`/announcements?t=${Date.now()}`).catch(() => ({ data: { data: [] } })),
          axiosInstance.get(`/attendance/today?t=${Date.now()}`).catch(() => ({ data: { data: null } })),
          axiosInstance.get(`/profile?t=${Date.now()}`).catch(() => ({ data: { data: null } }))
        ]);
        setData(dashRes.data.data);
        setStats(statsRes.data.data);
        setAnnouncements(annRes.data.data.slice(0, 5));
        setTodayAttendance(todayRes.data.data);
        setProfile(profileRes?.data?.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [location.key]);

  const profileCompletion = getCompletionPercent(profile);

  const handleMarkPresent = async () => {
    setMarkingPresent(true);
    try {
      await axiosInstance.post('/attendance/mark-present');
      toast.success('Marked present for today!');
    } catch (err) {
      if (err.response?.status !== 400 || !err.response?.data?.message?.includes('Already marked')) {
        toast.error(err.response?.data?.message || 'Failed to mark present');
      }
    } finally {
      try {
        const res = await axiosInstance.get(`/attendance/today?t=${Date.now()}`);
        setTodayAttendance(res.data.data);
      } catch (e) {
        console.error('Failed to refresh attendance');
      }
      setMarkingPresent(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { leaveBalance, employmentStatus, upcomingHolidays } = data || {};

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h2>
        <p className="text-textSec text-sm mt-1">Your current attendance and leave status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Total Leaves" 
          value={leaveBalance?.total_leaves || 0} 
          icon={CalendarCheck} 
          color="primary"
        />
        <DashboardCard 
          title="Used Leaves" 
          value={leaveBalance?.used_leaves || 0} 
          icon={CalendarMinus} 
          color="danger"
        />
        <DashboardCard 
          title="Remaining Leaves" 
          value={leaveBalance?.remaining_leaves || 0} 
          icon={CalendarHeart} 
          color="success"
        />
        <DashboardCard 
          title="Status" 
          value={
            <span className={`text-xl ${employmentStatus === 'NOTICE_PERIOD' ? 'text-warning' : 'text-success'}`}>
              {employmentStatus?.replace('_', ' ')}
            </span>
          } 
          icon={Briefcase} 
          color={employmentStatus === 'NOTICE_PERIOD' ? 'warning' : 'success'}
        />
      </div>

      {/* Profile Completion Indicator */}
      {profileCompletion < 100 && (
        <div className="bg-card/30 border border-border/50 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Profile Completion
            </span>
            <span className="text-sm text-primary font-bold">{profileCompletion}%</span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border/30">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${profileCompletion}%` }}
              className="h-full bg-primary"
            />
          </div>
          <p className="text-[10px] text-textSec mt-2 italic">Tip: Complete your profile details in settings to reach 100%.</p>
        </div>
      )}


      {/* Banners Section */}
      <div className="space-y-4">
        {/* Low Balance Alert */}
        {leaveBalance?.remaining_leaves <= data?.low_balance_threshold && leaveBalance?.remaining_leaves > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4 bg-danger/10 border border-danger/30 p-4 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center text-danger shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <p className="text-danger font-bold text-sm">Low Leave Balance</p>
              <p className="text-textSec text-xs">You have only {leaveBalance.remaining_leaves} leaves left. Plan accordingly.</p>
            </div>
          </motion.div>
        )}

        {/* Latest Announcement Banner */}
        {announcements?.length > 0 && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 bg-primary/10 border border-primary/20 p-4 rounded-2xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Megaphone size={20} className="group-hover:rotate-12 transition-transform" />
            </div>
            <div className="flex-1">
              <p className="text-primary font-bold text-sm">Latest Announcement: {announcements[0].title}</p>
              <p className="text-textSec text-xs line-clamp-1">{announcements[0].message}</p>
            </div>
            <button onClick={() => announcementsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="text-xs text-primary font-bold hover:underline shrink-0">View All</button>
          </motion.div>
        )}
      </div>

      {/* NOTICE_PERIOD Warning Banner */}
      {employmentStatus === 'NOTICE_PERIOD' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-2xl p-4"
        >
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-warning font-semibold text-sm">Notice Period Active</p>
            <p className="text-textSec text-sm mt-1">
              Your account is in notice period. Leave applications are disabled. Please contact HR if you have questions.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 lg:col-span-1 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h3 className="text-lg font-semibold text-white mb-4">Upcoming Holidays</h3>
          {upcomingHolidays?.length > 0 ? (
            <div className="space-y-4">
              {upcomingHolidays.map((holiday) => (
                <div key={holiday._id} className="flex flex-col gap-1 p-3 rounded-xl bg-background/50 hover:bg-background border border-border/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white">{holiday.name}</span>
                    <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-md font-medium">
                      {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                  <div className="text-sm text-textSec flex justify-between">
                    <span>{formatDate(holiday.date)}</span>
                    <span className="text-xs truncate max-w-[100px] capitalize">{holiday.type?.toLowerCase() || 'national'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-textSec text-sm text-center py-6 bg-background/30 rounded-xl">No upcoming holidays scheduled.</p>
          )}
        </div>

        <div ref={announcementsRef} className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 lg:col-span-1 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" /> Announcements
          </h3>
          {announcements?.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((ann) => (
                <div key={ann._id} className="p-3 rounded-xl bg-background/50 border border-border/50 flex flex-col gap-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium text-white">{ann.title}</h4>
                    {ann.priority === 'HIGH' && <span className="text-[10px] px-2 py-0.5 bg-danger/20 text-danger rounded-full">HIGH</span>}
                  </div>
                  <p className="text-xs text-textSec line-clamp-2">{ann.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-textSec text-sm text-center py-6 bg-background/30 rounded-xl">No recent announcements.</p>
          )}
        </div>

        {/* Today's Attendance Card */}
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 lg:col-span-1 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Today's Attendance
          </h3>

          {todayAttendance ? (() => {
            const { attendance, leave, isHoliday, holiday, workingDays = [1, 2, 3, 4, 5, 6] } = todayAttendance || {};
            const today = new Date();
            const dayOfWeek = today.getDay();
            const isTodayWorking = workingDays.includes(dayOfWeek);
            const todayFormatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

            if (isHoliday) return (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-400 font-bold text-sm">H</span>
                </div>
                <p className="text-white font-medium">{holiday?.name || 'Holiday'}</p>
                <p className="text-textSec text-sm mt-1">Public Holiday</p>
              </div>
            );

            if (!isTodayWorking) return (
              <div className="text-center py-6">
                 <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
                  <span className="text-gray-400 font-bold text-sm">W</span>
                </div>
                <p className="text-white font-medium">Weekly Off</p>
                <p className="text-textSec text-sm mt-1">{todayFormatted}</p>
              </div>
            );

            if (leave) return (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-400 font-bold text-sm">L</span>
                </div>
                <p className="text-white font-medium">On Approved Leave</p>
                <p className="text-textSec text-sm mt-1">{todayFormatted}</p>
              </div>
            );

            if (attendance?.status === 'PRESENT') return (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <p className="text-success font-semibold text-lg">Already marked present</p>
                <p className="text-textSec text-sm mt-1">{todayFormatted}</p>
              </div>
            );

            return (
              <div className="text-center py-4">
                <p className="text-textSec text-sm mb-1">{todayFormatted}</p>
                <p className="text-warning text-sm font-medium mb-4">Not yet marked</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMarkPresent}
                  disabled={markingPresent}
                  className="w-full py-3 bg-success/20 border border-success/30 text-success hover:bg-success hover:text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {markingPresent
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><CheckCircle2 className="w-4 h-4" /> Mark Present</>
                  }
                </motion.button>
                <p className="text-textSec text-[10px] mt-4 opacity-70">
                  Unmarked days are automatically marked Absent after midnight.
                </p>
              </div>
            );
          })() : (
            <div className="h-full flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
