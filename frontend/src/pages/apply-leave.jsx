import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Loader2, CalendarPlus, AlertCircle } from 'lucide-react';
import { isSunday } from 'date-fns';
import ConfirmModal from '../components/shared/ConfirmModal';

const ApplyLeave = () => {
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('FULL');
  const [reason, setReason] = useState('');
  const [requestedType, setRequestedType] = useState('STANDARD');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    if (reason.length < 5) {
      toast.error('Reason must be at least 5 characters long');
      return;
    }
    
    const selectedDate = new Date(date);
    if (isSunday(selectedDate)) {
      toast.error('Cannot apply leave on a Sunday');
      return;
    }

    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/leave/apply', {
        date,
        duration,
        reason,
        leave_type: requestedType
      });
      toast.success(res.data.message);
      navigate('/leave-history');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply for leave');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Apply for Leave</h2>
        <p className="text-textSec text-sm mt-1">Submit your leave request for approval.</p>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        
        <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl p-4 mb-8">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-textSec">
            <p className="font-medium text-white mb-1">Leave Rules</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Cannot apply on Sundays or designated system holidays.</li>
              <li>Cannot apply if employment status is NOTICE_PERIOD.</li>
              <li>Comp Off requests depend on having enough Comp Off balance.</li>
              <li>If STANDARD is selected and no Casual Leave (CL) is remaining, it will be marked as Loss of Pay (LOP).</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleOpenConfirm} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-textSec mb-2">Leave Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full px-4 py-3 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all [color-scheme:dark]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textSec mb-2">Duration</label>
            <div className="grid grid-cols-2 gap-4">
              <label 
                className={`
                  flex items-center justify-center py-3 border rounded-xl cursor-pointer transition-all
                  ${duration === 'FULL' ? 'bg-primary/20 border-primary text-white' : 'bg-background/50 border-border/60 text-textSec hover:border-textSec/50'}
                `}
              >
                <input
                  type="radio"
                  name="duration"
                  value="FULL"
                  checked={duration === 'FULL'}
                  onChange={() => setDuration('FULL')}
                  className="sr-only"
                />
                <span className="font-medium text-sm">Full Day</span>
              </label>
              
              <label 
                className={`
                  flex items-center justify-center py-3 border rounded-xl cursor-pointer transition-all
                  ${duration === 'HALF' ? 'bg-secondary/20 border-secondary text-white' : 'bg-background/50 border-border/60 text-textSec hover:border-textSec/50'}
                `}
              >
                <input
                  type="radio"
                  name="duration"
                  value="HALF"
                  checked={duration === 'HALF'}
                  onChange={() => setDuration('HALF')}
                  className="sr-only"
                />
                <span className="font-medium text-sm">Half Day</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSec mb-2">Leave Type Request</label>
            <div className="grid grid-cols-2 gap-4">
              <label 
                className={`
                  flex items-center justify-center py-3 border rounded-xl cursor-pointer transition-all
                  ${requestedType === 'STANDARD' ? 'bg-primary/20 border-primary text-white' : 'bg-background/50 border-border/60 text-textSec hover:border-textSec/50'}
                `}
              >
                <input
                  type="radio"
                  name="requestedType"
                  value="STANDARD"
                  checked={requestedType === 'STANDARD'}
                  onChange={() => setRequestedType('STANDARD')}
                  className="sr-only"
                />
                <span className="font-medium text-sm">Standard (CL/LOP)</span>
              </label>
              
              <label 
                className={`
                  flex items-center justify-center py-3 border rounded-xl cursor-pointer transition-all
                  ${requestedType === 'COMP_OFF' ? 'bg-success/20 border-success text-white' : 'bg-background/50 border-border/60 text-textSec hover:border-textSec/50'}
                `}
              >
                <input
                  type="radio"
                  name="requestedType"
                  value="COMP_OFF"
                  checked={requestedType === 'COMP_OFF'}
                  onChange={() => setRequestedType('COMP_OFF')}
                  className="sr-only"
                />
                <span className="font-medium text-sm">Comp Off</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSec mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="block w-full px-4 py-3 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all [color-scheme:dark] resize-none h-24"
              required
              placeholder="Please provide a detailed reason..."
            />
          </div>

          <div className="pt-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  <CalendarPlus className="w-5 h-5" /> 
                  Submit Request
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>

      <ConfirmModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSubmit}
        title="Confirm Leave Application"
        message={`Are you sure you want to apply for a ${duration === 'FULL' ? 'Full Day' : 'Half Day'} ${requestedType === 'COMP_OFF' ? 'Comp Off' : 'Leave'} on ${new Date(date).toLocaleDateString()}?`}
        confirmText="Yes, Apply"
        isLoading={loading}
      />
    </motion.div>
  );
};

export default ApplyLeave;
