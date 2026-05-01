import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Loader2, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

// Format date string (YYYY-MM-DD) to "Wed, 26 Jan" style
const formatDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });
};

const TypeBadge = ({ type }) => {
  const isNational = type === 'NATIONAL';
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border whitespace-nowrap ${
        isNational
          ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      }`}
    >
      {isNational ? 'National' : 'Regional'}
    </span>
  );
};

export const HolidaySection = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const cachRef = useRef({});
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadHolidays = async () => {
      // Return from cache if available
      if (cachRef.current[selectedYear]) {
        setHolidays(cachRef.current[selectedYear]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get(`/public-holidays?year=${selectedYear}`);
        const data = res.data?.data || [];
        cachRef.current[selectedYear] = data;
        setHolidays(data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to fetch holidays. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadHolidays();
  }, [selectedYear]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-8 relative z-40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Public Holidays</h2>
          <p className="text-textSec text-sm mt-1">Official holidays for India</p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2 bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl p-2 shadow-sm">
          <label className="text-xs font-semibold text-textSec ml-2 uppercase tracking-wider">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 ml-2 border rounded-xl bg-background/50 border-border/60 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm [color-scheme:dark] min-w-[100px]"
          >
            {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Holiday List Card */}
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
        ) : holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-textSec/70 text-center">
            <CalendarIcon className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm">No holidays found for {selectedYear}.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
            {holidays.map((holiday) => (
              <div
                key={holiday._id}
                className="group p-3.5 rounded-xl border border-border/30 bg-white/[0.02] hover:bg-white/[0.05] transition-colors flex items-center gap-4"
              >
                {/* Date */}
                <div className="text-xs text-textSec/80 font-mono w-[90px] shrink-0">
                  {formatDate(holiday.date)}
                </div>

                {/* Name + Note */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{holiday.name}</p>
                  {holiday.note && (
                    <p className="text-xs text-textSec/60 mt-0.5 truncate">{holiday.note}</p>
                  )}
                </div>

                {/* Badge */}
                <TypeBadge type={holiday.type} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
