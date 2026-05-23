import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, XCircle, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PaginationControls from '../components/shared/PaginationControls';
import ConfirmModal from '../components/shared/ConfirmModal';
import AuditTrailTimeline from '../components/shared/AuditTrailTimeline';

const LeaveHistory = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [trailTarget, setTrailTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchHistory = async (p = page) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/leave/history?page=${p}&limit=10${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}${typeFilter !== 'ALL' ? `&leave_type=${typeFilter}` : ''}`);
      const { data: items = [], pagination = {} } = res.data;
      setLeaves(items);
      setTotalPages(pagination.totalPages || 1);
      setPaginationMeta(pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(page); }, [page, statusFilter, typeFilter]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      const res = await axiosInstance.put(`/leave/${cancelTarget._id}/cancel`);
      toast.success(res.data.message || 'Leave cancelled');
      setCancelTarget(null);
      fetchHistory(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawTarget) return;
    setActionLoading(true);
    try {
      const res = await axiosInstance.put(`/leave/${withdrawTarget._id}/withdraw`);
      toast.success(res.data.message || 'Cancellation withdrawn');
      setWithdrawTarget(null);
      fetchHistory(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdraw failed');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchTrail = async (leaveId) => {
    try {
      const res = await axiosInstance.get(`/leave/${leaveId}/trail`);
      const leave = res.data.data;
      setTrailTarget(leave.audit_trail || leave.trail || []);
    } catch (err) {
      toast.error('Failed to load audit trail');
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
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Leave History</h2>
          <p className="text-textSec text-sm mt-1">View the status of your past and present leave requests.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 rounded-xl bg-background/50 border border-border/60 text-white text-sm focus:ring-1 focus:ring-primary">
            <option value="ALL">All Statuses</option>
            <option value="APPLIED">Applied</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="CANCELLATION_REQUESTED">Cancellation Requested</option>
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 rounded-xl bg-background/50 border border-border/60 text-white text-sm focus:ring-1 focus:ring-primary">
            <option value="ALL">All Types</option>
            <option value="CL">Casual Leave</option>
            <option value="COMP_OFF">Comp Off</option>
          </select>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-background/80 border-b border-border/50 text-sm text-textSec">
                <th className="px-6 py-4 font-medium whitespace-nowrap">Date</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Duration</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Type</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Reason</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm">
              {leaves.length > 0 ? (
                leaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white font-medium whitespace-nowrap">{formatDate(leave.date)}</td>
                    <td className="px-6 py-4 text-textSec whitespace-nowrap">{leave.duration === 'FULL' ? 'Full Day' : 'Half Day'}</td>
                    <td className="px-6 py-4 text-textSec whitespace-nowrap">{leave.leave_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(leave.status)}</td>
                    <td className="px-6 py-4 text-textSec max-w-[200px] truncate" title={leave.reason}>{leave.reason || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                      <button onClick={() => fetchTrail(leave._id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="View Trail">
                        <Eye className="w-4 h-4" />
                      </button>
                      {(leave.status === 'APPLIED' || leave.status === 'APPROVED') && (
                        <button onClick={() => setCancelTarget(leave)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors" title="Cancel Leave">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {leave.status === 'CANCELLATION_REQUESTED' && (
                        <button onClick={() => setWithdrawTarget(leave)} className="p-1.5 rounded-lg hover:bg-warning/10 text-warning transition-colors" title="Withdraw Cancellation">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-textSec">
                    No leave history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border/50">
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} paginationMeta={paginationMeta} />
        </div>
      </div>

      {/* Cancel Confirmation */}
      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Leave"
        message={cancelTarget?.status === 'APPROVED' ? 'This approved leave will require admin approval for cancellation. Proceed?' : 'This will cancel your applied leave immediately. Proceed?'}
        confirmText="Yes, Cancel"
        isDanger
        isLoading={actionLoading}
      />

      {/* Withdraw Cancellation Confirmation */}
      <ConfirmModal
        isOpen={!!withdrawTarget}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={handleWithdraw}
        title="Withdraw Cancellation Request"
        message="This will withdraw your cancellation request and restore the leave to APPROVED status. Proceed?"
        confirmText="Yes, Withdraw"
        isLoading={actionLoading}
      />

      {/* Audit Trail Modal */}
      <AnimatePresence>
        {trailTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setTrailTarget(null)} />
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card w-full max-w-md mx-4 p-6 rounded-2xl shadow-luxury border border-border pointer-events-auto max-h-[70vh] overflow-y-auto">
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
    </motion.div>
  );
};

export default LeaveHistory;
