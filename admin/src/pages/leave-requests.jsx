import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Search, Eye, Check, X, Download } from 'lucide-react';
import PaginationControls from '../components/shared/PaginationControls';
import ConfirmModal from '../components/shared/ConfirmModal';
import AuditTrailTimeline from '../components/shared/AuditTrailTimeline';

const LeaveRequests = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelApproveTarget, setCancelApproveTarget] = useState(null);
  const [cancelRejectTarget, setCancelRejectTarget] = useState(null);
  const [trailTarget, setTrailTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedLeaves, setSelectedLeaves] = useState([]);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportStatus, setExportStatus] = useState('ALL');

  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkRejectLoading, setBulkRejectLoading] = useState(false);

  const fetchLeaves = async (p = page) => {
    try {
      setLoading(true);
      let url = `/leaves?page=${p}&limit=10&search=${search}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      const res = await axiosInstance.get(url);
      const { data: items = [], pagination = {} } = res.data;
      setLeaves(items);
      setTotalPages(pagination.totalPages || 1);
      setPaginationMeta(pagination);
      setSelectedLeaves([]); // Reset selections on page change
    } catch (err) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(page); }, [page, statusFilter]);

  const handleApprove = async (id) => {
    try {
      await axiosInstance.put(`/leaves/${id}/approve`);
      toast.success('Leave approved');
      fetchLeaves(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason || rejectReason.trim().length < 5) {
      toast.error('Rejection reason must be at least 5 characters');
      return;
    }
    setActionLoading(true);
    try {
      await axiosInstance.put(`/leaves/${rejectTarget._id}/reject`, { rejection_reason: rejectReason });
      toast.success('Leave rejected');
      setRejectTarget(null);
      setRejectReason('');
      fetchLeaves(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelApprove = async () => {
    if (!cancelApproveTarget) return;
    setActionLoading(true);
    try {
      await axiosInstance.put(`/leaves/${cancelApproveTarget._id}/approve-cancellation`);
      toast.success('Cancellation approved');
      setCancelApproveTarget(null);
      fetchLeaves(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelReject = async () => {
    if (!cancelRejectTarget) return;
    setActionLoading(true);
    try {
      await axiosInstance.put(`/leaves/${cancelRejectTarget._id}/reject-cancellation`);
      toast.success('Cancellation rejected');
      setCancelRejectTarget(null);
      fetchLeaves(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchTrail = async (leaveId) => {
    try {
      const res = await axiosInstance.get(`/leaves/${leaveId}/trail`);
      const leave = res.data.data;
      setTrailTarget(leave.audit_trail || leave.trail || []);
    } catch (err) {
      toast.error('Failed to load audit trail');
    }
  };

  const handleExportCSV = async () => {
    try {
      let url = '/leaves/export-csv?';
      const params = new URLSearchParams();
      if (exportStatus !== 'ALL') params.append('status', exportStatus);
      if (exportFrom) params.append('from', exportFrom);
      if (exportTo) params.append('to', exportTo);
      const token = localStorage.getItem('hrms_admin_token');
      if (token) params.append('token', token);

      const res = await axiosInstance.get(url + params.toString(), { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'leaves_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('CSV exported successfully');
      setShowExportModal(false);
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pendingIds = leaves.filter(l => l.status === 'APPLIED').map(l => l._id);
      setSelectedLeaves(pendingIds);
    } else {
      setSelectedLeaves([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedLeaves(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkApprove = async () => {
    if (selectedLeaves.length === 0) return;
    setActionLoading(true);
    try {
      await axiosInstance.post('/leaves/bulk-approve', { leaveIds: selectedLeaves });
      toast.success('Leaves approved');
      fetchLeaves(page);
    } catch (err) {
      toast.error('Failed to bulk approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = () => {
    if (selectedLeaves.length === 0) return;
    setBulkRejectReason('');
    setShowBulkRejectModal(true);
  };

  const confirmBulkReject = async () => {
    if (!bulkRejectReason || bulkRejectReason.trim().length < 5) {
      toast.error('Rejection reason must be at least 5 characters');
      return;
    }
    setBulkRejectLoading(true);
    try {
      await axiosInstance.post('/leaves/bulk-reject', {
        leaveIds: selectedLeaves,
        rejection_reason: bulkRejectReason.trim()
      });
      toast.success('Leaves rejected');
      setShowBulkRejectModal(false);
      setBulkRejectReason('');
      setSelectedLeaves([]);
      fetchLeaves(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to bulk reject');
    } finally {
      setBulkRejectLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      APPLIED: 'bg-warning/10 text-warning border-warning/20',
      APPROVED: 'bg-success/10 text-success border-success/20',
      REJECTED: 'bg-danger/10 text-danger border-danger/20',
      CANCELLED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      CANCELLATION_REQUESTED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    };
    const cls = map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    return <span className={`px-3 py-1 ${cls} border rounded-full text-xs font-semibold`}>{status?.replace(/_/g, ' ')}</span>;
  };

  if (loading && leaves.length === 0) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Leave Requests</h2>
          <p className="text-textSec text-sm mt-1">Approve, reject, or manage employee leave requests.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSec" />
            <input type="text" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchLeaves(1)} className="pl-9 pr-4 py-2.5 rounded-xl bg-background/50 border border-border/60 text-white text-sm focus:ring-1 focus:ring-primary w-48" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 rounded-xl bg-background/50 border border-border/60 text-white text-sm focus:ring-1 focus:ring-primary">
            <option value="ALL">All Statuses</option>
            <option value="APPLIED">Applied</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="CANCELLATION_REQUESTED">Cancellation Requested</option>
          </select>
          <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20 text-sm font-medium transition-colors">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {selectedLeaves.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <span className="text-primary font-medium text-sm">{selectedLeaves.length} leave(s) selected</span>
          <div className="flex items-center gap-3">
            <button onClick={handleBulkApprove} disabled={actionLoading} className="px-4 py-2 rounded-lg bg-success text-white font-medium text-sm hover:bg-success/90 transition-colors disabled:opacity-50">Approve All</button>
            <button onClick={handleBulkReject} disabled={actionLoading} className="px-4 py-2 rounded-lg bg-danger text-white font-medium text-sm hover:bg-danger/90 transition-colors disabled:opacity-50">Reject All</button>
          </div>
        </motion.div>
      )}

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/80 border-b border-border/50 text-sm text-textSec">
                <th className="px-5 py-4 w-10">
                  <input type="checkbox" onChange={handleSelectAll} checked={leaves.length > 0 && selectedLeaves.length === leaves.filter(l => l.status === 'APPLIED').length && leaves.some(l => l.status === 'APPLIED')} className="rounded border-border/60 bg-background/50 text-primary focus:ring-primary focus:ring-offset-background" />
                </th>
                <th className="px-5 py-4 font-medium">Employee</th>
                <th className="px-5 py-4 font-medium">Date</th>
                <th className="px-5 py-4 font-medium">Duration</th>
                <th className="px-5 py-4 font-medium">Type</th>
                <th className="px-5 py-4 font-medium">Reason</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm">
              {leaves.length > 0 ? (
                leaves.map((leave) => (
                  <tr key={leave._id} className={`hover:bg-white/[0.02] transition-colors ${selectedLeaves.includes(leave._id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-5 py-4">
                      {leave.status === 'APPLIED' && (
                        <input type="checkbox" checked={selectedLeaves.includes(leave._id)} onChange={() => handleSelectOne(leave._id)} className="rounded border-border/60 bg-background/50 text-primary focus:ring-primary focus:ring-offset-background" />
                      )}
                    </td>
                    <td className="px-5 py-4 text-white font-medium whitespace-nowrap">
                      {leave.user_id?.name || 'N/A'}
                      <div className="text-xs text-textSec">{leave.user_id?.company_id}</div>
                    </td>
                    <td className="px-5 py-4 text-textSec whitespace-nowrap">{formatDate(leave.date)}</td>
                    <td className="px-5 py-4 text-textSec whitespace-nowrap">{leave.duration === 'FULL' ? 'Full' : 'Half'}</td>
                    <td className="px-5 py-4 text-textSec whitespace-nowrap">{leave.leave_type}</td>
                    <td className="px-5 py-4 text-textSec max-w-[150px] truncate" title={leave.reason}>{leave.reason || '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(leave.status)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => fetchTrail(leave._id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Audit Trail">
                          <Eye className="w-4 h-4" />
                        </button>
                        {leave.status === 'APPLIED' && (
                          <>
                            <button onClick={() => handleApprove(leave._id)} className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors" title="Approve">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setRejectTarget(leave)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors" title="Reject">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {leave.status === 'CANCELLATION_REQUESTED' && (
                          <>
                            <button onClick={() => setCancelApproveTarget(leave)} className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors" title="Approve Cancellation">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setCancelRejectTarget(leave)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors" title="Reject Cancellation">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-textSec">No leave requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border/50">
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} paginationMeta={paginationMeta} />
        </div>
      </div>

      {/* Reject Leave Modal */}
      <AnimatePresence>
        {rejectTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setRejectTarget(null)} />
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card w-full max-w-md p-6 rounded-2xl shadow-luxury border border-border pointer-events-auto">
                <h2 className="text-xl font-semibold mb-4 text-white">Reject Leave</h2>
                <p className="text-textSec text-sm mb-4">Rejecting leave for <span className="text-white font-medium">{rejectTarget?.user_id?.name}</span> on {formatDate(rejectTarget?.date)}</p>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-textSec mb-2">Rejection Reason (min 5 characters) *</label>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="block w-full px-4 py-3 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none h-24 [color-scheme:dark]" placeholder="Provide reason..." />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="px-4 py-2 rounded-lg font-medium bg-surface hover:bg-border transition-colors text-textSec">Cancel</button>
                  <button onClick={handleReject} disabled={actionLoading} className="px-4 py-2 rounded-lg font-medium bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-50">
                    {actionLoading ? 'Processing...' : 'Reject Leave'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Cancel Approve/Reject Modals */}
      <ConfirmModal isOpen={!!cancelApproveTarget} onClose={() => setCancelApproveTarget(null)} onConfirm={handleCancelApprove} title="Approve Cancellation" message="Approve this cancellation request? The employee's leave balance will be restored." confirmText="Approve" isLoading={actionLoading} />
      <ConfirmModal isOpen={!!cancelRejectTarget} onClose={() => setCancelRejectTarget(null)} onConfirm={handleCancelReject} title="Reject Cancellation" message="Reject this cancellation request? The leave will remain as APPROVED." confirmText="Reject" isDanger isLoading={actionLoading} />

      {/* Audit Trail Modal */}
      <AnimatePresence>
        {trailTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setTrailTarget(null)} />
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card w-full max-w-md p-6 rounded-2xl shadow-luxury border border-border pointer-events-auto max-h-[70vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4 text-white">Audit Trail</h2>
                <AuditTrailTimeline trail={trailTarget} />
                <div className="flex justify-end mt-6">
                  <button onClick={() => setTrailTarget(null)} className="px-4 py-2 rounded-lg font-medium bg-surface hover:bg-border transition-colors text-textSec">Close</button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Export CSV Modal */}
      <AnimatePresence>
        {showExportModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setShowExportModal(false)} />
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card w-full max-w-md p-6 rounded-2xl shadow-luxury border border-border pointer-events-auto">
                <h2 className="text-xl font-semibold mb-4 text-white">Export Leave Records</h2>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-textSec mb-2">Status</label>
                    <select value={exportStatus} onChange={(e) => setExportStatus(e.target.value)} className="block w-full px-4 py-2 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="ALL">All Statuses</option>
                      <option value="APPLIED">Applied</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-textSec mb-2">From Date</label>
                      <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="block w-full px-4 py-2 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-textSec mb-2">To Date</label>
                      <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="block w-full px-4 py-2 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowExportModal(false)} className="px-4 py-2 rounded-lg font-medium bg-surface hover:bg-border transition-colors text-textSec">Cancel</button>
                  <button onClick={handleExportCSV} className="px-4 py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2">
                    <Download size={16} /> Download CSV
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowBulkRejectModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/50 rounded-2xl
                shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-md
                p-6 relative z-10"
            >
              <h3 className="text-xl font-bold text-white mb-1">
                Bulk Reject Leaves
              </h3>
              <p className="text-textSec text-sm mb-4">
                Rejecting {selectedLeaves.length} leave(s). A reason is
                required for all.
              </p>
              <div>
                <label className="block text-xs font-medium text-textSec
                  uppercase mb-1">Rejection Reason (min 5 chars)</label>
                <textarea
                  value={bulkRejectReason}
                  onChange={e => setBulkRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border/60
                    rounded-xl bg-background/50 text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-danger/50
                    resize-none"
                  placeholder="State the reason for rejecting these leaves..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowBulkRejectModal(false)}
                  className="px-4 py-2 rounded-xl border border-border/50
                    text-textSec hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmBulkReject}
                  disabled={bulkRejectLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-danger
                    text-white rounded-xl text-sm font-semibold transition-all
                    hover:bg-danger/90 disabled:opacity-50"
                >
                  {bulkRejectLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Reject All Selected'
                  }
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LeaveRequests;
