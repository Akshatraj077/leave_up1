import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader2, Calendar as CalendarIcon, MapPin, AlertCircle, Check, ChevronsUpDown } from 'lucide-react';

const INDIAN_STATES = [
  { label: "Andaman and Nicobar Islands", value: "IN-AN" },
  { label: "Andhra Pradesh", value: "IN-AP" },
  { label: "Arunachal Pradesh", value: "IN-AR" },
  { label: "Assam", value: "IN-AS" },
  { label: "Bihar", value: "IN-BR" },
  { label: "Chandigarh", value: "IN-CH" },
  { label: "Chhattisgarh", value: "IN-CT" },
  { label: "Dadra and Nagar Haveli", value: "IN-DH" },
  { label: "Delhi", value: "IN-DL" },
  { label: "Goa", value: "IN-GA" },
  { label: "Gujarat", value: "IN-GJ" },
  { label: "Haryana", value: "IN-HR" },
  { label: "Himachal Pradesh", value: "IN-HP" },
  { label: "Jharkhand", value: "IN-JH" },
  { label: "Karnataka", value: "IN-KA" },
  { label: "Kerala", value: "IN-KL" },
  { label: "Ladakh", value: "IN-LA" },
  { label: "Lakshadweep", value: "IN-LD" },
  { label: "Madhya Pradesh", value: "IN-MP" },
  { label: "Maharashtra", value: "IN-MH" },
  { label: "Manipur", value: "IN-MN" },
  { label: "Meghalaya", value: "IN-ML" },
  { label: "Mizoram", value: "IN-MZ" },
  { label: "Nagaland", value: "IN-NL" },
  { label: "Odisha", value: "IN-OR" },
  { label: "Puducherry", value: "IN-PY" },
  { label: "Punjab", value: "IN-PB" },
  { label: "Rajasthan", value: "IN-RJ" },
  { label: "Sikkim", value: "IN-SK" },
  { label: "Tamil Nadu", value: "IN-TN" },
  { label: "Telangana", value: "IN-TG" },
  { label: "Tripura", value: "IN-TR" },
  { label: "Uttar Pradesh", value: "IN-UP" },
  { label: "Uttarakhand", value: "IN-UT" },
  { label: "West Bengal", value: "IN-WB" }
];

const fetchHolidays = async (year) => {
  try {
    const res = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
    const rawData = res.data || [];
    
    // Normalize Data
    return rawData.map(h => {
      const regions = h.counties || [];
      return {
        name: h.name,
        date: h.date,
        type: regions.length === 0 ? "NATIONAL" : "REGIONAL",
        regions: regions
      };
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return []; // Return empty array if the year is not found / no data
    }
    throw new Error('Failed to fetch holidays');
  }
};

const MultiSelect = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="relative w-full sm:w-64" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm border cursor-pointer bg-background/50 border-border/60 rounded-xl text-textSec hover:bg-white/5 transition-colors"
      >
        <span className="truncate flex-1">
          {selected.length === 0 ? placeholder : `${selected.length} state(s) selected`}
        </span>
        <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 overflow-auto text-sm border shadow-lg bg-card border-border/50 max-h-60 rounded-xl">
          <div className="p-1">
            {options.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={`flex items-center px-3 py-2 cursor-pointer rounded-lg transition-colors ${
                    isSelected ? 'bg-primary/20 text-white' : 'hover:bg-white/10 text-textSec'
                  }`}
                >
                  <div className={`w-4 h-4 mr-3 flex items-center justify-center border rounded shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-textSec/50'}`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate">{option.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
    },
    blue: {
      wrapper: "bg-blue-500/10 border-blue-500/20",
      title: "text-blue-400",
      icon: "text-blue-500",
      item: "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/10",
      text: "text-blue-100",
      date: "text-blue-400/80"
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
      
      <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
        {holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center text-textSec/70">
            <CalendarIcon className="w-8 h-8 mb-3 opacity-20" />
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
  const [selectedStates, setSelectedStates] = useState([]);
  
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
        setError("Failed to load holidays for this year. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadHolidays();
  }, [selectedYear, holidaysCache]);

  const currentHolidays = holidaysCache[selectedYear] || [];
  
  const nationalHolidays = currentHolidays.filter(h => h.type === "NATIONAL");
  const regionalHolidays = currentHolidays.filter(h => h.type === "REGIONAL");
  
  // Deduplicate regional holidays if a holiday exists in multiple selected states
  const filteredRegionalHolidays = regionalHolidays.filter(h =>
    h.regions.some(r => selectedStates.includes(r))
  ).filter((value, index, self) =>
    index === self.findIndex((t) => (
      t.name === value.name && t.date === value.date
    ))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 mt-8">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Public Holidays</h2>
          <p className="text-textSec text-sm mt-1">View national and regional holidays for India.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm items-start sm:items-center">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-textSec ml-1 uppercase tracking-wider">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-xl bg-background/50 border-border/60 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm [color-scheme:dark]"
            >
              <option value={currentYear - 2}>{currentYear - 2}</option>
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear + 1}>{currentYear + 1}</option>
              <option value={currentYear + 2}>{currentYear + 2}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-textSec ml-1 uppercase tracking-wider">Filter by State</label>
            <MultiSelect 
              options={INDIAN_STATES}
              selected={selectedStates}
              onChange={setSelectedStates}
              placeholder="Select states..."
            />
          </div>
        </div>
      </div>

      <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-textSec">Fetching holiday data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-400">
            <AlertCircle className="w-10 h-10 mb-4 opacity-80" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <HolidayList 
              title="National Holidays"
              theme="green"
              icon={CalendarIcon}
              holidays={nationalHolidays}
              emptyMessage="No national holidays found for this year."
            />
            
            <HolidayList 
              title="Regional Holidays"
              theme="blue"
              icon={MapPin}
              holidays={filteredRegionalHolidays}
              emptyMessage={selectedStates.length === 0 
                ? "Select one or more states above to view regional holidays." 
                : "No regional holidays found for the selected states."}
            />
          </div>
        )}
      </div>
    </div>
  );
};
