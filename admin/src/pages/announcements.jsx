import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Trash2, Megaphone, Edit2 } from 'lucide-react';
import ConfirmModal from '../components/shared/ConfirmModal';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({ title: '', message: '', priority: 'NORMAL', expires_at: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await axiosInstance.get('/announcements');
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSubmitting(true);
    try {
      await axiosInstance.post('/announcements', formData);
      toast.success('Announcement created & notifications sent');
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSubmitting(true);
    try {
      await axiosInstance.put(`/announcements/${editTarget._id}`, formData);
      toast.success('Announcement updated');
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axiosInstance.delete(`/announcements/${deleteTarget._id}`);
      toast.success('Announcement deleted');
      setDeleteTarget(null);
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to delete announcement');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', message: '', priority: 'NORMAL', expires_at: '' });
    setShowForm(false);
    setEditTarget(null);
  };

  const startEdit = (ann) => {
    setEditTarget(ann);
    setFormData({ title: ann.title, message: ann.message, priority: ann.priority || 'NORMAL', expires_at: ann.expires_at ? new Date(ann.expires_at).toISOString().split('T')[0] : '' });
    setShowForm(true);
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Megaphone className="w-7 h-7 text-primary" /> Announcements
          </h2>
          <p className="text-textSec text-sm mt-1">Broadcast announcements to all employees.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 py-2.5 px-5 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all">
          <Plus size={18} /> New Announcement
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={editTarget ? handleUpdate : handleCreate} className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-white">
                {editTarget ? 'Edit Announcement' : 'Create New Announcement'}
              </h3>
              <div>
                <label className="block text-xs font-medium text-textSec uppercase mb-1">Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-textSec uppercase mb-1">Message *</label>
                <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm resize-none h-24" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-textSec uppercase mb-1">Priority</label>
                <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2.5 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm">
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-textSec uppercase mb-1">Expires At (Optional)</label>
                <input type="date" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} className="w-full px-3 py-2.5 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg font-medium bg-surface hover:bg-border transition-colors text-textSec text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm">
                  {submitting ? 'Saving...' : (editTarget ? 'Update Announcement' : 'Publish Announcement')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((ann) => (
            <motion.div key={ann._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white">{ann.title}</h3>
                  {ann.priority === 'HIGH' && <span className="text-[10px] px-2 py-0.5 bg-danger/20 text-danger rounded-full font-semibold">HIGH</span>}
                </div>
                <p className="text-textSec text-sm mb-2">{ann.message}</p>
                <p className="text-xs text-textSec">{formatDate(ann.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(ann)} className="text-secondary hover:text-secondary/80 p-1.5 rounded-lg hover:bg-secondary/10 transition-colors" title="Edit">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => setDeleteTarget(ann)} className="text-danger hover:text-danger/80 p-1.5 rounded-lg hover:bg-danger/10 transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-12 text-center text-textSec">No announcements yet.</div>
        )}
      </div>

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Announcement" message={`Delete "${deleteTarget?.title}"? This cannot be undone.`} confirmText="Delete" isDanger />
    </motion.div>
  );
};

export default Announcements;
