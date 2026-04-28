import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Loader2, Lock, User } from 'lucide-react';

const AdminProfile = () => {
  const { user } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('forcePasswordReset')) {
      toast.error('You must update your password before continuing.', { duration: 5000 });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.put('/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-2xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Admin Profile</h2>
        <p className="text-textSec text-sm mt-1">Manage your account and security settings.</p>
      </div>

      {/* Profile Info */}
      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{user?.name || 'Administrator'}</h3>
            <p className="text-textSec text-sm">{user?.email}</p>
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium mt-1 inline-block">ADMIN</span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" /> Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-textSec uppercase mb-1">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-textSec uppercase mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
            <p className="text-xs text-textSec mt-1">Min 8 chars, must include uppercase, lowercase, number, and special character.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-textSec uppercase mb-1">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
          </div>
          <div className="pt-2">
            <button type="submit" disabled={loading} className="flex items-center gap-2 py-2.5 px-5 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-70">
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AdminProfile;
