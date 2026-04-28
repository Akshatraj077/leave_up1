import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Loader2, Search, BarChart2 } from 'lucide-react';
import PaginationControls from '../components/shared/PaginationControls';

const LeaveBalances = () => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({});

  const fetchBalances = async (p = page, s = search) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/leave-balances?page=${p}&limit=10&search=${s}`);
      const { data: items = [], pagination = {} } = res.data;
      
      setBalances(items);
      setTotalPages(pagination.totalPages || 1);
      setPaginationMeta(pagination);
    } catch (err) {
      toast.error('Failed to load leave balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [page]);

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <BarChart2 className="w-7 h-7 text-primary" /> Leave Balances
          </h2>
          <p className="text-textSec text-sm mt-1">Overview of all employee leave quotas and usage.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSec" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchBalances(1, search)}
              className="pl-9 pr-4 py-2.5 rounded-xl bg-background/50 border border-border/60 text-white text-sm focus:ring-1 focus:ring-primary w-64"
            />
          </div>
          <button onClick={() => fetchBalances(1, search)} className="p-2.5 rounded-xl border border-border/60 text-textSec hover:text-white hover:bg-white/5 transition-all">
            <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/80 border-b border-border/50 text-sm text-textSec">
                <th className="px-6 py-4 font-medium whitespace-nowrap">Employee</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Department</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-center">Used / Total CL</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Balance Progress</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-center">Comp Off</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-center">LOP Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm">
              {balances.length > 0 ? balances.map((bal) => {
                const pct = bal.total_leaves > 0 ? (bal.used_leaves / bal.total_leaves) * 100 : 0;
                return (
                  <tr key={bal._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-white font-medium">{bal.name}</p>
                      <p className="text-textSec text-xs">{bal.email} • {bal.company_id}</p>
                    </td>
                    <td className="px-6 py-4 text-textSec whitespace-nowrap">{bal.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${bal.employment_status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {bal.employment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-semibold text-white">{bal.used_leaves}</span>
                      <span className="text-textSec"> / {bal.total_leaves}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                      <div className="w-full bg-background rounded-full h-2">
                        <div className={`h-2 rounded-full ${pct > 80 ? 'bg-danger' : pct > 50 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-textSec mt-1 text-right">{bal.remaining_leaves} remaining</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-white font-medium">
                      {bal.comp_off_balance}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-danger font-medium">
                      {bal.lop_days || 0}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-textSec">No balances found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border/50">
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} paginationMeta={paginationMeta} />
        </div>
      </div>
    </motion.div>
  );
};

export default LeaveBalances;
