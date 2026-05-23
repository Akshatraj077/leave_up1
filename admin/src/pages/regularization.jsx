import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X, FileCheck, Eye } from 'lucide-react';
import PaginationControls from '../components/shared/PaginationControls';
import ConfirmModal from '../components/shared/ConfirmModal';

const Regularization = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [approveTarget, setApproveTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);

  const fetchRequests = async (p = page) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/regularization?page=${p}&limit=10`);
      const { data: items = [], pagination = {} } = res.data;
      setRequests(items);
      setTotalPages(pagination.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(page); }, [page]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await axiosInstance.put(`/regularization/${approveTarget._id}/approve`);
      toast.success('Regularization approved');
      setApproveTarget(null);
      fetchRequests(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectRemark || rejectRemark.trim().length < 5) {
      toast.error('Rejection reason must be at least 5 characters');
      return;
    }
    setActionLoading(true);
    try {
      await axiosInstance.put(`/regularization/${rejectTarget._id}/reject`, { rejection_reason: rejectRemark });
      toast.success('Regularization rejected');
      setRejectTarget(null);
      setRejectRemark('');
      fetchRequests(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      PENDING: 'bg-warning/10 text-warning border-warning/20',
      APPROVED: 'bg-success/10 text-success border-success/20',
      REJECTED: 'bg-danger/10 text-danger border-danger/20',
    };
    const cls = map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    return <span className={`px-3 py-1 ${cls} border rounded-full text-xs font-semibold`}>{status}</span>;
  };

  if (loading && requests.length === 0) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <FileCheck className="w-7 h-7 text-primary" /> Regularization Requests
        </h2>
        <p className="text-textSec text-sm mt-1">Review and process employee attendance regularization requests.</p>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-background/80 border-b border-border/50 text-sm text-textSec">
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white font-medium whitespace-nowrap">
                      {req.user_id?.name || 'N/A'}
                      <div className="text-xs text-textSec">{req.user_id?.company_id}</div>
                    </td>
                    <td className="px-6 py-4 text-textSec whitespace-nowrap">{formatDate(req.date)}</td>
                    <td className="px-6 py-4 text-textSec max-w-[250px] truncate" title={req.reason}>{req.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setDetailTarget(req)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {req.status === 'PENDING' && (
                          <>
                            <button onClick={() => setApproveTarget(req)} className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors" title="Approve">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setRejectTarget(req)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors" title="Reject">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-textSec">No regularization requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border/50">
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmModal isOpen={!!approveTarget} onClose={() => setApproveTarget(null)} onConfirm={handleApprove} title="Approve Regularization" message={`Approve regularization for ${approveTarget?.user_id?.name} on ${approveTarget ? formatDate(approveTarget.date) : ''}? Their attendance will be changed to PRESENT.`} confirmText="Approve" isLoading={actionLoading} />

      {/* Reject Modal with remark */}
      {rejectTarget && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setRejectTarget(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card w-full max-w-md mx-4 p-6 rounded-2xl shadow-luxury border border-border pointer-events-auto">
              <h2 className="text-xl font-semibold mb-4 text-white">Reject Regularization</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-textSec mb-2">Admin Remark (Optional)</label>
                <textarea value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="block w-full px-4 py-3 border border-border/60 rounded-xl bg-background/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none h-24 [color-scheme:dark]" placeholder="Reason for rejection..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setRejectTarget(null); setRejectRemark(''); }} className="px-4 py-2 rounded-lg font-medium bg-surface hover:bg-border transition-colors text-textSec">Cancel</button>
                <button onClick={handleReject} disabled={actionLoading} className="px-4 py-2 rounded-lg font-medium bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-50">{actionLoading ? 'Processing...' : 'Reject'}</button>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* Detail View Modal */}
      <AnimatePresence>
        {detailTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setDetailTarget(null)} />
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card w-full max-w-lg mx-4 p-6 rounded-2xl shadow-luxury border border-border pointer-events-auto max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Regularization Details</h2>
                  {getStatusBadge(detailTarget.status)}
                </div>

                <div className="space-y-5">
                  {/* Employee Info */}
                  <div className="bg-background/50 rounded-xl p-4 border border-border/30 space-y-3">
                    <h3 className="text-xs font-semibold text-textSec uppercase tracking-wider mb-2">Employee Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-textSec">Name</p>
                        <p className="text-sm text-white font-medium">{detailTarget.user_id?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-textSec">Company ID</p>
                        <p className="text-sm text-white font-medium">{detailTarget.user_id?.company_id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-textSec">Email</p>
                        <p className="text-sm text-white font-medium">{detailTarget.user_id?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-textSec">Requested Date</p>
                        <p className="text-sm text-white font-medium">{formatDate(detailTarget.date)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-background/50 rounded-xl p-4 border border-border/30">
                    <h3 className="text-xs font-semibold text-textSec uppercase tracking-wider mb-2">Reason for Regularization</h3>
                    <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{detailTarget.reason || 'No reason provided.'}</p>
                  </div>

                  {/* Review Info (if reviewed) */}
                  {(detailTarget.status === 'APPROVED' || detailTarget.status === 'REJECTED') && (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/30 space-y-3">
                      <h3 className="text-xs font-semibold text-textSec uppercase tracking-wider mb-2">Review Information</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-textSec">Reviewed At</p>
                          <p className="text-sm text-white font-medium">{detailTarget.reviewed_at ? formatDate(detailTarget.reviewed_at) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-textSec">Submitted On</p>
                          <p className="text-sm text-white font-medium">{detailTarget.createdAt ? formatDate(detailTarget.createdAt) : '—'}</p>
                        </div>
                      </div>
                      {detailTarget.status === 'REJECTED' && detailTarget.rejection_reason && (
                        <div>
                          <p className="text-xs text-textSec">Rejection Reason</p>
                          <p className="text-sm text-danger font-medium mt-1">{detailTarget.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submission Metadata */}
                  {detailTarget.status === 'PENDING' && (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/30">
                      <h3 className="text-xs font-semibold text-textSec uppercase tracking-wider mb-2">Submission Info</h3>
                      <div>
                        <p className="text-xs text-textSec">Submitted On</p>
                        <p className="text-sm text-white font-medium">{detailTarget.createdAt ? formatDate(detailTarget.createdAt) : '—'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/30">
                  {detailTarget.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => { setDetailTarget(null); setApproveTarget(detailTarget); }}
                        className="px-4 py-2 rounded-lg font-medium bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-colors text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setDetailTarget(null); setRejectTarget(detailTarget); }}
                        className="px-4 py-2 rounded-lg font-medium bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 transition-colors text-sm"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button onClick={() => setDetailTarget(null)} className="px-4 py-2 rounded-lg font-medium bg-surface hover:bg-border transition-colors text-textSec text-sm">Close</button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Regularization;
