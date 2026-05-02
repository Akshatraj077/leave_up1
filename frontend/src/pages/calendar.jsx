import React, { useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { 
  format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths,
  getYear, getMonth, isToday, isBefore, isAfter, endOfYear, startOfYear
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, FileEdit } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { HolidaySection } from '../components/HolidayViewer';

// RegularizationModal Component
const RegularizationModal = ({ isOpen, onClose, selectedDate, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (isOpen) setReason(''); }, [isOpen]);

  const handleSubmit = async () => {
    if (!reason || reason.length < 5) {
      toast.error('Reason must be at least 5 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/regularization', {
        date: format(selectedDate, 'yyyy-MM-dd'),
        reason
      });
      toast.success(res.data.message || 'Regularization request submitted');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose} />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card w-full max-w-md mx-4 p-6 rounded-2xl shadow-luxury border border-border pointer-events-auto">
              <h2 className="text-xl font-semibold mb-1 text-white">Request Regularization</h2>
              <p className="text-textSec text-sm mb-4">
                For: <span className="text-white font-medium">{selectedDate ? format(selectedDate, 'EEEE, MMM dd, yyyy') : ''}</span>
              </p>
              <p className="text-textSec text-xs mb-4 bg-primary/5 border border-primary/10 p-3 rounded-lg">
                Regularization converts an ABSENT day to PRESENT, subject to admin approval.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-textSec mb-2">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="block w-full px-4 py-3 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none h-24 [color-scheme:dark]"
                  placeholder="Explain why you need regularization..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg font-medium bg-surface hover:bg-border transition-colors text-textSec">Cancel</button>
                <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const Calendar = () => {
  const { user } = useContext(AuthContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({ holidays: [], leaves: [], attendances: [] });
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [regModalDate, setRegModalDate] = useState(null);

  // Parse the employee's joining date for comparisons
  const joiningDate = user?.joining_date ? new Date(user.joining_date) : null;
  if (joiningDate) joiningDate.setHours(0, 0, 0, 0);

  // current year const limits
  const minDate = startOfYear(new Date());
  const maxDate = endOfYear(new Date());

  const fetchCalendarData = async (date) => {
    setLoading(true);
    const month = getMonth(date) + 1;
    const year = getYear(date);
    
    try {
      // 1. Resolve pending attendance first
      await axiosInstance.post('/attendance/resolve-pending', { month, year });
      // 2. Fetch data
      const res = await axiosInstance.get(`/calendar?month=${month}&year=${year}`);
      setCalendarData(res.data.data);
    } catch (error) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData(currentDate);
  }, [currentDate]);

  const handlePrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    if (!isBefore(prev, minDate) || isSameMonth(prev, minDate)) {
      setCurrentDate(prev);
    }
  };

  const handleNextMonth = () => {
    const next = addMonths(currentDate, 1);
    if (!isAfter(next, maxDate) || isSameMonth(next, maxDate)) {
      setCurrentDate(next);
    }
  };

  const handleMarkPresent = async () => {
    setMarking(true);
    try {
      await axiosInstance.post('/attendance/mark-present');
      toast.success('Marked present for today!');
      fetchCalendarData(currentDate);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark present');
    } finally {
      setMarking(false);
    }
  };

  const getDayData = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const holiday = calendarData.holidays.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr);
    const leave = calendarData.leaves.find(l => format(new Date(l.date), 'yyyy-MM-dd') === dateStr);
    const attendance = calendarData.attendances.find(a => format(new Date(a.date), 'yyyy-MM-dd') === dateStr);
    
    return { holiday, leave, attendance };
  };

  // Build grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const renderCellContent = (day, data) => {
    const { holiday, leave, attendance } = data;
    const isSun = format(day, 'EEEE') === 'Sunday';

    // 1. Holiday (H)
    if (holiday) return { code: 'H', style: 'bg-blue-600 text-white', label: holiday.name };
    
    // 2 & 3. Approved Leave (L / HL)
    if (leave && leave.status === 'APPROVED') {
      if (leave.duration === 'FULL') return { code: 'L', style: 'bg-orange-500 text-white', label: 'Full Day Leave' };
      if (leave.duration === 'HALF') return { code: 'HL', style: 'bg-orange-400 text-white', label: 'Half Day Leave' };
    }
    
    // 4. Sunday (W)
    if (isSun) return { code: 'W', style: 'bg-gray-700 text-gray-400', label: 'Weekend Off' };
    
    // 5 & 6. Present / Absent
    if (attendance && attendance.status === 'PRESENT') return { code: 'P', style: 'bg-green-600 text-white', label: 'Present' };
    if (attendance && attendance.status === 'ABSENT') return { code: 'A', style: 'bg-red-600 text-white', label: 'Absent', isAbsent: true };
    
    // 7. Pending (–)
    return { code: '–', style: 'bg-gray-800 text-gray-500', label: 'Pending' };
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Attendance Calendar</h2>
          <p className="text-textSec text-sm mt-1">Manage your daily attendance and view accurate records.</p>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center gap-4 bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-2 shadow-sm">
          <button 
            onClick={handlePrevMonth}
            disabled={isSameMonth(currentDate, minDate)}
            className="p-2 hover:bg-white/10 rounded-lg text-textSec hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-white min-w-[120px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button 
            onClick={handleNextMonth}
            disabled={isSameMonth(currentDate, maxDate)}
            className="p-2 hover:bg-white/10 rounded-lg text-textSec hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-3 sm:p-4 md:p-6">
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-border/50 text-xs font-medium">
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-green-600 flex items-center justify-center text-white">P</div> Present</div>
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center text-white">A</div> Absent</div>
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white">H</div> Holiday</div>
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white">L</div> Leave</div>
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-gray-400">W</div> Weekend</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-warning"></div> Applied Leave</div>
          <div className="flex items-center gap-2"><FileEdit className="w-4 h-4 text-secondary" /> Regularize</div>
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white text-[8px] font-bold">DOJ</div> Date of Joining</div>
        </div>

        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1 sm:mx-0">
          <div className="grid grid-cols-7 gap-px bg-border/50 border border-border/50 rounded-xl overflow-hidden min-w-[500px]">
            {/* Header */}
            {weekDays.map(day => (
              <div key={day} className="bg-background/90 py-3 text-center text-sm font-semibold text-textSec">
                {day.substring(0,3)}<span className="hidden sm:inline">{day.substring(3)}</span>
              </div>
            ))}

            {/* Days */}
            {days.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const data = getDayData(day);
              const cellData = renderCellContent(day, data);
              const { code, style, label } = cellData;
              const hasAppliedLeave = data.leave && data.leave.status === 'APPLIED';
              const showMarkPresentBtn = isToday(day) && format(day, 'EEEE') !== 'Sunday' && !data.holiday && (!data.attendance || data.attendance.status === 'PENDING');
              
              // Only allow regularization on/after joining date
              const dayNormalized = new Date(day);
              dayNormalized.setHours(0, 0, 0, 0);
              const isBeforeJoining = joiningDate && isBefore(dayNormalized, joiningDate);
              const isDOJ = joiningDate && isSameDay(dayNormalized, joiningDate);
              const canRegularize = isCurrentMonth && cellData.isAbsent && !isToday(day) && !isBeforeJoining;

              return (
                <div 
                  key={idx} 
                  className={`min-h-[80px] sm:min-h-[120px] bg-card p-1.5 sm:p-2 relative flex flex-col transition-all group ${!isCurrentMonth ? 'opacity-40' : 'hover:bg-white/[0.02]'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-white text-black' : 'text-textSec'}`}>
                      {format(day, dateFormat)}
                    </span>
                    {hasAppliedLeave && (
                       <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_8px_rgba(234,179,8,0.8)] absolute top-3 right-3" title="Leave Applied Pending Approval" />
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-2 justify-center items-center">
                    {isBeforeJoining && isCurrentMonth ? (
                      /* Empty cell for days before joining */
                      <div className="w-8 h-8 rounded shrink-0 flex flex-col items-center justify-center bg-transparent" />
                    ) : (
                      <>
                        {/* DOJ badge */}
                        {isDOJ && isCurrentMonth && (
                          <div className="w-full py-1 bg-primary/15 border border-primary/30 rounded-md flex items-center justify-center gap-1 mb-1" title="Date of Joining">
                            <span className="text-[10px] font-bold text-primary tracking-wide">DOJ</span>
                          </div>
                        )}

                        {/* Mark present logic takes precedence for today */}
                        {showMarkPresentBtn && isCurrentMonth ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleMarkPresent}
                            disabled={marking}
                            className="w-full py-2 bg-success/20 text-success border border-success/30 rounded-lg text-xs font-bold hover:bg-success hover:text-white transition-all flex items-center justify-center gap-1"
                          >
                            {marking ? <Loader2 className="w-3 h-3 animate-spin"/> : <><CheckCircle2 className="w-3 h-3"/> Present</>}
                          </motion.button>
                        ) : (
                          <div className={`w-8 h-8 rounded shrink-0 flex flex-col items-center justify-center shadow-lg ${style}`} title={label}>
                             <span className="font-bold text-sm tracking-tighter">{code}</span>
                          </div>
                        )}

                        {/* Regularization button for absent days — only on/after joining date */}
                        {canRegularize && (
                          <button
                            onClick={() => setRegModalDate(day)}
                            className="w-full py-1 text-[10px] font-semibold text-secondary hover:bg-secondary/10 border border-secondary/20 rounded-md transition-all flex items-center justify-center gap-1"
                            title="Request Regularization"
                          >
                            <FileEdit className="w-3 h-3" /> Regularize
                          </button>
                        )}
                        
                        {code === 'H' && data.holiday && (
                          <span className="text-[10px] text-center text-textSec leading-tight px-1 break-words hidden sm:block w-full">{data.holiday.name}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>

      <RegularizationModal
        isOpen={!!regModalDate}
        onClose={() => setRegModalDate(null)}
        selectedDate={regModalDate}
        onSuccess={() => fetchCalendarData(currentDate)}
      />

      {/* New Holiday Viewer Section */}
      <HolidaySection />
    </motion.div>
  );
};

export default Calendar;
