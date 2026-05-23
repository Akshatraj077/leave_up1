import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Edit2, Trash2, X } from 'lucide-react';
import ConfirmModal from '../components/shared/ConfirmModal';
import { INDIAN_STATES, getStateName } from '../utils/indianStates';

const HolidayManagement = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await axiosInstance.get('/holidays');
      setHolidays(res.data.data);
    } catch (err) {
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await axiosInstance.delete(`/holidays/${deleteTarget}`);
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to delete holiday');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const openAddModal = () => {
    setEditingHoliday(null);
    setIsModalOpen(true);
  };

  const openEditModal = (h) => {
    setEditingHoliday(h);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Holiday Management</h2>
          <p className="text-textSec text-sm mt-1">Declare global system holidays that apply to all employees.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex justify-center items-center gap-2 py-2.5 px-5 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all"
        >
          <Plus size={18} /> Add Holiday
        </button>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/80 border-b border-border/50 text-sm text-textSec">
                <th className="px-6 py-4 font-medium whitespace-nowrap">Holiday Name</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Date</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Day</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Type</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Scope</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm">
              {holidays.length > 0 ? holidays.map((h) => (
                <tr key={h._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-white font-medium whitespace-nowrap">{h.name}</td>
                  <td className="px-6 py-4 text-textSec whitespace-nowrap">{formatDate(h.date)}</td>
                  <td className="px-6 py-4 text-textSec whitespace-nowrap">
                     <span className="px-2.5 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-md text-xs font-semibold">
                       {new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' })}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-textSec capitalize">{h.type?.toLowerCase() || 'national'}</td>
                  <td className="px-6 py-4 text-textSec whitespace-nowrap max-w-[200px]">
                    {h.isGlobal !== false ? (
                      <span className="px-2.5 py-1 bg-success/10 text-success border border-success/20 rounded-md text-xs font-semibold">
                        Global
                      </span>
                    ) : (
                      <span
                        className="text-xs text-textSec/80 truncate block"
                        title={h.applicableStates?.map(getStateName).join(', ')}
                      >
                        {h.applicableStates?.length > 0
                          ? h.applicableStates.map(getStateName).join(', ')
                          : <span className="text-warning/70">No states set</span>
                        }
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                    <button onClick={() => openEditModal(h)} className="text-secondary hover:text-secondary/80 transition-colors p-1" title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(h._id)} className="text-danger hover:text-danger/80 transition-colors p-1" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-textSec">No holidays registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && <HolidayModal holiday={editingHoliday} onClose={() => setIsModalOpen(false)} refresh={fetchHolidays} />}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Holiday"
        message="Are you sure you want to delete this holiday? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleteLoading}
      />
    </motion.div>
  );
};

const HolidayModal = ({ holiday, onClose, refresh }) => {
  const isEdit = !!holiday;
  const [formData, setFormData] = useState({
    name: holiday?.name || '',
    date: holiday?.date ? new Date(holiday.date).toISOString().split('T')[0] : '',
    type: holiday?.type || 'NATIONAL',
    isGlobal: holiday?.isGlobal !== false,
    applicableStates: holiday?.applicableStates || []
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await axiosInstance.put(`/holidays/${holiday._id}`, formData);
        toast.success('Holiday updated');
      } else {
        await axiosInstance.post('/holidays', formData);
        toast.success('Holiday added');
      }
      refresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
        className="bg-card border border-border/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden flex flex-col relative z-10"
      >
        <div className="flex justify-between items-center p-6 border-b border-border/50">
          <h3 className="text-xl font-bold text-white">{isEdit ? 'Edit Holiday' : 'Add New Holiday'}</h3>
          <button onClick={onClose} className="text-textSec hover:text-white transition-colors"><X size={24} /></button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-1">Holiday Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" placeholder="e.g. Independence Day" />
            </div>
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-1">Date *</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm [color-scheme:dark]" />
              <p className="text-[10px] text-textSec mt-1">The day of the week will be automatically derived from the date.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-1">Holiday Type *</label>
              <select name="type" value={formData.type} onChange={handleChange} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm">
                <option value="NATIONAL">National Holiday</option>
                <option value="REGIONAL">Regional Holiday</option>
                <option value="OPTIONAL">Optional Holiday</option>
              </select>
            </div>

            {/* isGlobal toggle */}
            <div>
              <label className="block text-xs font-medium text-textSec uppercase mb-2">Holiday Scope *</label>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border/40 bg-background/30 hover:bg-background/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isGlobal}
                  onChange={e =>
                    setFormData({ ...formData, isGlobal: e.target.checked, applicableStates: [] })
                  }
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <div>
                  <p className="text-sm text-white font-medium">Global Holiday</p>
                  <p className="text-[11px] text-textSec mt-0.5">
                    {formData.isGlobal
                      ? 'Visible to all employees regardless of location.'
                      : 'Only visible to employees in selected states.'}
                  </p>
                </div>
              </label>
            </div>

            {/* applicableStates — shown only when isGlobal is false */}
            {!formData.isGlobal && (
              <div>
                <label className="block text-xs font-medium text-textSec uppercase mb-1">
                  Applicable States <span className="text-danger">*</span>
                </label>
                <select
                  multiple
                  value={formData.applicableStates}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      applicableStates: Array.from(e.target.selectedOptions, o => o.value)
                    })
                  }
                  className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm h-36"
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-textSec mt-1">
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple states.
                  {formData.applicableStates.length > 0 && (
                    <span className="text-primary ml-2">{formData.applicableStates.length} selected</span>
                  )}
                </p>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={loading} className="w-full sm:w-auto flex justify-center items-center gap-2 py-2.5 px-6 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (isEdit ? 'Save Changes' : 'Create Holiday')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default HolidayManagement;
