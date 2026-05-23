import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, Save, Key, User as UserIcon, AlertCircle } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { INDIAN_STATES, getStateName } from '../utils/indianStates';

const PROFILE_FIELDS = ['name', 'email', 'date_of_birth', 'joining_date', 'pan_number', 'bank_account_number', 'bank_name', 'ifsc_code', 'account_holder_name', 'location'];

const getCompletionPercent = (profile) => {
  if (!profile) return 0;
  const filled = PROFILE_FIELDS.filter(f => profile[f] && String(profile[f]).trim().length > 0).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
};

const Profile = () => {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMasked, setShowMasked] = useState(false);

  // password state
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [passSaving, setPassSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('forcePasswordReset')) {
      toast.error('You must update your password before continuing.', { duration: 5000 });
      // Clear the param so it doesn't keep showing on refresh
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axiosInstance.get('/profile');
      setProfile(res.data.data);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    // Validations based on requirements
    if (profile.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(profile.pan_number)) {
      return toast.error('Invalid PAN Number format');
    }
    if (profile.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(profile.ifsc_code)) {
      return toast.error('Invalid IFSC Code format');
    }
    if (profile.bank_account_number && !/^[0-9]{9,18}$/.test(profile.bank_account_number)) {
      return toast.error('Bank Account must be 9-18 digits');
    }

    setSaving(true);
    try {
      const { name, pan_number, bank_account_number, bank_name, ifsc_code, account_holder_name, location } = profile;
      
      const payload = {
        name,
        pan_number,
        bank_account_number,
        bank_name,
        ifsc_code,
        account_holder_name,
        location: location || null
      };

      const res = await axiosInstance.put('/profile', payload);
      toast.success(res.data.message);
      setProfile(res.data.data);
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmNewPassword) {
      return toast.error('New passwords do not match');
    }
    
    // min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passRegex.test(passData.newPassword)) {
      return toast.error('Password must be at least 8 chars long, include uppercase, lowercase, number, and special character');
    }

    setPassSaving(true);
    try {
      const res = await axiosInstance.put('/change-password', {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });
      toast.success(res.data.message);
      setPassData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed');
    } finally {
      setPassSaving(false);
    }
  };

  const maskValue = (val) => {
    if (!val) return 'Not Provided';
    if (showMasked) return val;
    if (val.length <= 4) return '*'.repeat(val.length);
    return '*'.repeat(val.length - 4) + val.slice(-4);
  };

  const getInputValueForDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const completionPct = getCompletionPercent(profile);
  const missingFields = PROFILE_FIELDS.filter(f => !profile[f] || String(profile[f]).trim().length === 0);

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">My Profile</h2>
        <p className="text-textSec text-sm mt-1">Manage your personal and banking information.</p>
      </div>

      {/* Profile Completion Indicator */}
      {completionPct < 100 && (
        <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-warning font-semibold text-sm">Profile {completionPct}% Complete</p>
              <p className="text-textSec text-xs mt-1">
                Missing: {missingFields.map(f => f.replace(/_/g, ' ')).join(', ')}
              </p>
            </div>
          </div>
          <div className="w-full bg-background/50 rounded-full h-2">
            <div className="bg-warning h-2 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      )}

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <UserIcon size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{profile.name}</h3>
              <p className="text-sm text-textSec">Company ID: <span className="text-white font-medium">{profile.company_id}</span></p>
              {profile.department && (
                <p className="text-xs text-textSec mt-0.5">Department: <span className="text-white/80">{profile.department}</span></p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <button
                onClick={() => setShowMasked(!showMasked)}
                className="flex items-center gap-2 px-4 py-2 bg-background/50 border border-border/50 hover:bg-background rounded-xl text-sm font-medium text-textSec hover:text-white transition-colors"
              >
                {showMasked ? <EyeOff size={16} /> : <Eye size={16} />}
                {showMasked ? 'Hide Sensitive' : 'Reveal Sensitive'}
              </button>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 text-primary hover:bg-primary hover:text-white rounded-xl text-sm font-medium transition-all"
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2 bg-background/50 border border-border/50 hover:bg-background rounded-xl text-sm font-medium text-textSec hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className="col-span-1 sm:col-span-2">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 opacity-80">General Information</h4>
            </div>
            
            {/* Field: Name */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">Full Name</label>
              {editing ? (
                 <input type="text" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} className="block w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:outline-none focus:ring-1 focus:ring-primary text-sm" required />
              ) : (
                 <p className="text-white font-medium bg-background/30 px-3 py-2 rounded-lg border border-transparent">{profile.name}</p>
              )}
            </div>

            {/* Field: Email (read-only) */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">Email Address</label>
              <p className="text-white font-medium bg-background/30 px-3 py-2 rounded-lg border border-transparent">{profile.email}</p>
            </div>

            {/* Field: Date of Birth */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">Date of Birth</label>
              <p className="text-white font-medium bg-background/30 px-3 py-2 rounded-lg border border-transparent">{formatDate(profile.date_of_birth)}</p>
            </div>

            {/* Field: Joining Date */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">Joining Date</label>
              <p className="text-white font-medium bg-background/30 px-3 py-2 rounded-lg border border-transparent">{formatDate(profile.joining_date)}</p>
            </div>

            {/* Field: Location / State */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">
                Location / State
              </label>
              {editing ? (
                <select
                  value={profile.location || ''}
                  onChange={e => setProfile({ ...profile, location: e.target.value || null })}
                  className="block w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                >
                  <option value="">Select your state...</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-white font-medium bg-background/30 px-3 py-2 rounded-lg border border-transparent">
                  {getStateName(profile.location)}
                </p>
              )}
              {editing && (
                <p className="text-[10px] text-textSec mt-1">
                  Your state determines which regional holidays are visible to you.
                </p>
              )}
            </div>

            <div className="col-span-1 sm:col-span-2 mt-4">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 opacity-80 pt-6 border-t border-border/50">Financial Information</h4>
            </div>

            {/* Field: PAN Number */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">PAN Number</label>
              {editing ? (
                 <input type="text" value={profile.pan_number || ''} onChange={e => setProfile({...profile, pan_number: e.target.value.toUpperCase()})} className="block w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:outline-none focus:ring-1 focus:ring-primary text-sm uppercase" placeholder="ABCDE1234F" />
              ) : (
                 <p className="text-white font-medium tracking-widest bg-background/30 px-3 py-2 rounded-lg border border-transparent">{maskValue(profile.pan_number)}</p>
              )}
            </div>

            {/* Field: Account Holder Name */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">Account Holder Name</label>
              {editing ? (
                 <input type="text" value={profile.account_holder_name || ''} onChange={e => setProfile({...profile, account_holder_name: e.target.value})} className="block w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:outline-none focus:ring-1 focus:ring-primary text-sm" />
              ) : (
                 <p className="text-white font-medium bg-background/30 px-3 py-2 rounded-lg border border-transparent">{profile.account_holder_name || 'Not Provided'}</p>
              )}
            </div>

            {/* Field: Bank Name */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">Bank Name</label>
              {editing ? (
                 <input type="text" value={profile.bank_name || ''} onChange={e => setProfile({...profile, bank_name: e.target.value})} className="block w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:outline-none focus:ring-1 focus:ring-primary text-sm" />
              ) : (
                 <p className="text-white font-medium bg-background/30 px-3 py-2 rounded-lg border border-transparent">{profile.bank_name || 'Not Provided'}</p>
              )}
            </div>

            {/* Field: Bank Account Number */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">Bank Account Number</label>
              {editing ? (
                 <input type="text" value={profile.bank_account_number || ''} onChange={e => setProfile({...profile, bank_account_number: e.target.value.replace(/\D/g, '')})} className="block w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:outline-none focus:ring-1 focus:ring-primary text-sm font-mono" placeholder="9 to 18 digits" maxLength="18" />
              ) : (
                 <p className="text-white font-mono tracking-widest bg-background/30 px-3 py-2 rounded-lg border border-transparent">{maskValue(profile.bank_account_number)}</p>
              )}
            </div>

            {/* Field: IFSC Code */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase tracking-wider mb-2">IFSC Code</label>
              {editing ? (
                 <input type="text" value={profile.ifsc_code || ''} onChange={e => setProfile({...profile, ifsc_code: e.target.value.toUpperCase()})} className="block w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:outline-none focus:ring-1 focus:ring-primary text-sm uppercase" placeholder="SBIN0001234" />
              ) : (
                 <p className="text-white font-medium bg-background/30 px-3 py-2 rounded-lg border border-transparent">{profile.ifsc_code || 'Not Provided'}</p>
              )}
            </div>
          </div>

          {editing && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="pt-6 border-t border-border/50 flex justify-end"
            >
              <button
                type="submit"
                disabled={saving}
                className="flex justify-center items-center gap-2 py-2.5 px-6 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <><Save size={18} /> Save Changes</>}
              </button>
            </motion.div>
          )}
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/50">
          <Key className="text-textSec w-6 h-6" />
          <h3 className="text-xl font-bold text-white">Change Password</h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
          <div>
            <label className="block text-sm font-medium text-textSec mb-2">Current Password</label>
            <input
              type="password"
              value={passData.currentPassword}
              onChange={e => setPassData({...passData, currentPassword: e.target.value})}
              className="block w-full px-4 py-2.5 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSec mb-2">New Password</label>
            <input
              type="password"
              value={passData.newPassword}
              onChange={e => setPassData({...passData, newPassword: e.target.value})}
              className="block w-full px-4 py-2.5 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
              required
            />
            <p className="text-[10px] text-textSec mt-1.5">Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special (@$!%*?&)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-textSec mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passData.confirmNewPassword}
              onChange={e => setPassData({...passData, confirmNewPassword: e.target.value})}
              className="block w-full px-4 py-2.5 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
              required
            />
          </div>
          
          <div className="pt-2">
             <button
                type="submit"
                disabled={passSaving || !passData.currentPassword || !passData.newPassword || !passData.confirmNewPassword}
                className="py-2.5 px-6 rounded-xl border border-primary/50 text-sm font-bold text-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passSaving ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Update Password'}
              </button>
          </div>
        </form>
      </div>

    </motion.div>
  );
};

export default Profile;
