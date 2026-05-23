import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { 
  format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, 
  eachDayOfInterval, isSameMonth, subMonths, addMonths,
  getYear, getMonth, isToday, startOfYear, endOfYear, isBefore, isAfter
} from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { HolidaySection } from '../components/HolidayViewer';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({ holidays: [], leaveSummary: {}, pendingSummary: {} });
  const [loading, setLoading] = useState(true);

  // current year const limits
  const minDate = startOfYear(new Date());
  const maxDate = endOfYear(new Date());

  const fetchCalendarData = async (date) => {
    setLoading(true);
    const month = getMonth(date) + 1;
    const year = getYear(date);
    
    try {
      const res = await axiosInstance.get(`/calendar?month=${month}&year=${year}`);
      setCalendarData(res.data.data);
    } catch (error) {
      toast.error('Failed to load admin calendar data');
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

  const getDayData = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holidays = calendarData.holidays.filter(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr);
    const approvedLeaveCount = calendarData.leaveSummary[dateStr] || 0;
    const hasPendingLeaves = calendarData.pendingSummary[dateStr] || false;
    
    return { holidays, approvedLeaveCount, hasPendingLeaves };
  };

  // Build grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Organization Calendar</h2>
          <p className="text-textSec text-sm mt-1">Global view of system holidays and employee leave density.</p>
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
        <div className="flex flex-wrap items-center gap-6 mb-6 pb-6 border-b border-border/50 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded outline outline-1 outline-blue-500 bg-blue-500/20"></div> 
            <span className="text-textSec">Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <Info className="text-primary w-4 h-4"/> 
            <span className="text-textSec">Number indicates approved employee leaves</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
             <span className="text-textSec">Pending Leave Requests</span>
          </div>
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

              return (
                <div 
                  key={idx} 
                  className={`min-h-[90px] sm:min-h-[140px] bg-card p-1.5 sm:p-3 relative flex flex-col transition-all group ${!isCurrentMonth ? 'opacity-40' : 'hover:bg-white/[0.02]'} ${data.holidays.length > 0 ? 'bg-blue-900/10' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2 relative">
                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-white text-black' : 'text-textSec'}`}>
                      {format(day, dateFormat)}
                    </span>
                    <div className="flex gap-1.5 absolute right-0 top-1">
                       {data.hasPendingLeaves && (
                          <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_8px_rgba(234,179,8,0.8)]" title="Pending Applications on this day" />
                       )}
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-2 mt-2">
                    {data.holidays.length > 0 && data.holidays.map((h, i) => (
                      <div key={h._id || i} className="text-xs bg-blue-600 border border-blue-500 rounded p-1.5 text-white font-medium leading-tight shadow-sm flex items-center gap-1.5">
                        <span
                          className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                            h.isGlobal !== false ? 'bg-emerald-300' : 'bg-amber-300'
                          }`}
                          title={h.isGlobal !== false ? 'Global' : 'Regional'}
                        />
                        <span className="truncate">{h.name}</span>
                      </div>
                    ))}

                    {data.approvedLeaveCount > 0 && (
                      <div className="text-xs bg-primary/20 border border-primary/30 text-primary rounded p-1.5 font-medium flex justify-between items-center mt-auto shadow-sm">
                        <span>On Leave:</span>
                        <span className="bg-primary text-white w-5 h-5 rounded-sm flex items-center justify-center font-bold">{data.approvedLeaveCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>

      {/* New Holiday Viewer Section */}
      {/* <HolidaySection /> */}
    </motion.div>
  );
};

export default Calendar;
