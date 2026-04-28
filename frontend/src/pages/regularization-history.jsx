import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatDate } from '../utils/dateUtils';
import { motion } from 'framer-motion';
import { Loader2, FileCheck } from 'lucide-react';
import PaginationControls from '../components/shared/PaginationControls';

const RegularizationHistory = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async (p = page) => {
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

  useEffect(() => { fetchData(page); }, [page]);

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
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <FileCheck className="w-7 h-7 text-primary" /> Regularization History
        </h2>
        <p className="text-textSec text-sm mt-1">Track your attendance regularization requests.</p>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/80 border-b border-border/50 text-sm text-textSec">
                <th className="px-6 py-4 font-medium whitespace-nowrap">Date</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Reason</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Admin Remark</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Submitted On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white font-medium whitespace-nowrap">{formatDate(req.date)}</td>
                    <td className="px-6 py-4 text-textSec max-w-[250px] truncate" title={req.reason}>{req.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-textSec max-w-[200px] truncate" title={req.admin_remark}>{req.admin_remark || '—'}</td>
                    <td className="px-6 py-4 text-textSec whitespace-nowrap">{formatDate(req.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-textSec">No regularization requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border/50">
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </motion.div>
  );
};

export default RegularizationHistory;
