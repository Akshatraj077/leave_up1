import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Loader2, Save } from 'lucide-react';

const DAY_MAP = [
  { label: 'Sunday',    value: 0 },
  { label: 'Monday',    value: 1 },
  { label: 'Tuesday',   value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday',  value: 4 },
  { label: 'Friday',    value: 5 },
  { label: 'Saturday',  value: 6 },
];

const LeavePolicy = () => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await axiosInstance.get('/policy');
        setPolicy(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const handleChange = (field, value) => {
    setPolicy(prev => ({ ...prev, [field]: value }));
  };

  const handleWorkingDayToggle = (dayValue) => {
    const current = policy.working_days || [];
    if (current.includes(dayValue)) {
      handleChange('working_days', current.filter(d => d !== dayValue));
    } else {
      handleChange('working_days', [...current, dayValue].sort());
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/policy', policy);
      toast.success('Leave policy updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (!policy) {
    return <div className="h-full flex items-center justify-center text-textSec">No policy found. Create one in the database first.</div>;
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Leave Policy Configuration</h2>
        <p className="text-textSec text-sm mt-1">Configure organization-wide leave rules and parameters.</p>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 space-y-8">
        
        {/* Basic Settings */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Basic Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-1">Default Annual CL Quota</label>
              <input type="number" value={policy.default_cl_per_year || ''} onChange={(e) => handleChange('default_cl_per_year', Number(e.target.value))} min={1} max={365} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-1">Financial Year Start Month (1-12)</label>
              <input type="number" value={policy.financial_year_start_month || ''} min={1} max={12} onChange={(e) => handleChange('financial_year_start_month', Number(e.target.value))} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-1">Max Carry Forward Days</label>
              <input type="number" value={policy.max_carry_forward_days ?? ''} onChange={(e) => handleChange('max_carry_forward_days', Number(e.target.value))} min={0} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-1">Max Consecutive Leave Days</label>
              <input type="number" value={policy.max_consecutive_leave_days ?? ''} onChange={(e) => handleChange('max_consecutive_leave_days', Number(e.target.value))} min={1} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={policy.allow_comp_off || false} onChange={(e) => handleChange('allow_comp_off', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
              <span className="text-sm text-white font-medium">Allow Comp Off</span>
            </div>
          </div>
        </div>

        <hr className="border-border/50" />

        {/* Working Days */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Working Days</h3>
          <div className="flex flex-wrap gap-3">
            {DAY_MAP.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleWorkingDayToggle(day.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  (policy.working_days || []).includes(day.value)
                    ? 'bg-primary/20 border-primary text-white'
                    : 'bg-background/50 border-border/60 text-textSec hover:border-textSec/50'
                } ${day.value === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={day.value === 0}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-border/50" />

        {/* Probation Settings */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Probation Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-1">Probation Leave Quota</label>
              <input type="number" value={policy.probation_leave_quota ?? ''} onChange={(e) => handleChange('probation_leave_quota', Number(e.target.value))} min={0} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
            </div>
          </div>
        </div>

        <hr className="border-border/50" />

        {/* Advanced Settings */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Advanced Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={policy.allow_half_day !== false} onChange={(e) => handleChange('allow_half_day', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
              <span className="text-sm text-white font-medium">Allow Half Day Leaves</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-1">Low Balance Threshold</label>
              <input type="number" value={policy.low_balance_threshold ?? ''} onChange={(e) => handleChange('low_balance_threshold', Number(e.target.value))} min={0} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
              <p className="text-xs text-textSec mt-1">Notify employee when remaining leaves fall below this number.</p>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleSave} disabled={saving} className="flex items-center gap-2 py-2.5 px-6 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-70">
            {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <><Save size={16} /> Save Policy</>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default LeavePolicy;
