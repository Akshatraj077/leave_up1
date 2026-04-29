import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

const API_KEY = "vJmM3faiCzLLelgnTIIEFYSZTO0qmVsq";

const fetchHolidays = async (year) => {
  try {
    const res = await axios.get(`https://calendarific.com/api/v2/holidays?api_key=${API_KEY}&country=IN&year=${year}`);
    
    if (res.data?.meta?.code !== 200) {
      throw new Error(res.data?.meta?.error_detail || 'Failed to fetch holidays');
    }

    const rawData = res.data?.response?.holidays || [];
    
    // Normalize Data
    return rawData.map(h => {
      let regions = [];
      if (Array.isArray(h.states)) {
        regions = h.states.map(s => s.iso || s.abbrev || "");
      }

      // A holiday is National ONLY if it applies to all states (no specific regions returned)
      const isNational = regions.length === 0;

      return {
        name: h.name,
        date: h.date?.iso?.split('T')[0], // Extract just the YYYY-MM-DD
        type: isNational ? "NATIONAL" : "REGIONAL"
      };
    });
  } catch (error) {
    throw new Error(error.response?.data?.meta?.error_detail || error.message || 'Failed to fetch holidays');
  }
};

const HolidayList = ({ title, holidays, theme, icon: Icon, emptyMessage }) => {
  const themeClasses = {
    green: {
      wrapper: "bg-green-500/10 border-green-500/20",
      title: "text-green-400",
      icon: "text-green-500",
      item: "bg-green-500/5 hover:bg-green-500/10 border-green-500/10",
      text: "text-green-100",
      date: "text-green-400/80"
    }
  };

  const classes = themeClasses[theme];

  return (
    <div className={`p-5 rounded-2xl border ${classes.wrapper} flex flex-col h-full`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg bg-white/5 ${classes.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className={`font-semibold text-lg ${classes.title}`}>{title}</h3>
      </div>
      
      <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
        {holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center text-textSec/70">
            <CalendarIcon className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          holidays.map((holiday, idx) => {
             const dateObj = new Date(holiday.date);
             const displayDate = dateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
             
             return (
              <div key={idx} className={`p-3 rounded-xl border transition-colors flex justify-between items-center ${classes.item}`}>
                <span className={`font-medium text-sm ${classes.text}`}>{holiday.name}</span>
                <span className={`text-xs whitespace-nowrap ml-4 ${classes.date}`}>{displayDate}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const HolidaySection = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Cache structure: { 2024: [...], 2025: [...] }
  const [holidaysCache, setHolidaysCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadHolidays = async () => {
      if (holidaysCache[selectedYear]) return; // Already cached
      
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHolidays(selectedYear);
        setHolidaysCache(prev => ({ ...prev, [selectedYear]: data }));
      } catch (err) {
        console.error(err);
        setError(`Failed to fetch holidays: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadHolidays();
  }, [selectedYear, holidaysCache]);

  const currentHolidays = holidaysCache[selectedYear] || [];
  
  // Only use National Holidays now
  const nationalHolidays = currentHolidays.filter(h => h.type === "NATIONAL");

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-8 relative z-40">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Public Holidays</h2>
          <p className="text-textSec text-sm mt-1">View official national holidays for India.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl p-2 shadow-sm">
          <label className="text-xs font-semibold text-textSec ml-2 uppercase tracking-wider">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 ml-2 border rounded-xl bg-background/50 border-border/60 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm [color-scheme:dark] min-w-[100px]"
          >
            <option value={currentYear - 2}>{currentYear - 2}</option>
            <option value={currentYear - 1}>{currentYear - 1}</option>
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear + 1}>{currentYear + 1}</option>
            <option value={currentYear + 2}>{currentYear + 2}</option>
          </select>
        </div>
      </div>

      <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm min-h-[400px] relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-textSec">Fetching holiday data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-400 max-w-lg mx-auto text-center">
            <AlertCircle className="w-10 h-10 mb-4 opacity-80" />
            <p className="font-medium mb-2">{error}</p>
          </div>
        ) : (
          <div className="h-full max-w-2xl mx-auto">
            <HolidayList 
              title="National Holidays"
              theme="green"
              icon={CalendarIcon}
              holidays={nationalHolidays}
              emptyMessage="No national holidays found for this year."
            />
          </div>
        )}
      </div>
    </div>
  );
};
