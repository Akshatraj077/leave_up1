import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { user, clearMustChangePassword } = useContext(AuthContext);
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else {
      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passRegex.test(newPassword)) {
        newErrors.newPassword = 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character (@$!%*?&)';
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await axiosInstance.put('/change-password', {
        currentPassword,
        newPassword,
      });
      clearMustChangePassword();
      toast.success('Password updated successfully. Welcome!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-warning/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-warning/20 border border-warning/30 flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Change Your Password
          </h2>
          <p className="mt-2 text-sm text-textSec max-w-xs mx-auto">
            Logged in as <span className="text-white font-medium">{user?.email}</span> — please set a new password before continuing.
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-xl py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 sm:rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-textSec mb-1">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setErrors(prev => ({ ...prev, currentPassword: undefined })); }}
                  className="block w-full pl-10 pr-3 py-2.5 border border-border/60 rounded-xl bg-background/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                  placeholder="Enter current password"
                />
              </div>
              {errors.currentPassword && (
                <p className="text-danger text-xs mt-1.5">{errors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-textSec mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, newPassword: undefined })); }}
                  className="block w-full pl-10 pr-3 py-2.5 border border-border/60 rounded-xl bg-background/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                  placeholder="Enter new password"
                />
              </div>
              {errors.newPassword && (
                <p className="text-danger text-xs mt-1.5">{errors.newPassword}</p>
              )}
              <p className="text-[10px] text-textSec mt-1.5">Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special (@$!%*?&)</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-textSec mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: undefined })); }}
                  className="block w-full pl-10 pr-3 py-2.5 border border-border/60 rounded-xl bg-background/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                  placeholder="Re-enter new password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-danger text-xs mt-1.5">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" /> Update Password
                  </span>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
