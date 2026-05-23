import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Edit2, Trash2, X, Gift, Search } from 'lucide-react';
import ConfirmModal from '../components/shared/ConfirmModal';
import PaginationControls from '../components/shared/PaginationControls';
import { INDIAN_STATES, getStateName } from '../utils/indianStates';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({});
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedDept, setDebouncedDept] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [compOffTarget, setCompOffTarget] = useState(null);

  const fetchEmployees = async (p = page, s = search, d = deptFilter) => {
    try {
      const res = await axiosInstance.get(`/employees?page=${p}&limit=10&search=${s}${d ? `&department=${d}` : ''}`);
      const { data: items = [], pagination = {} } = res.data;
      setEmployees(items);
      setTotalPages(pagination.totalPages || 1);
      setPaginationMeta(pagination);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedDept(deptFilter);
    }, 400);
    return () => clearTimeout(handler);
  }, [search, deptFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedDept]);

  useEffect(() => { 
    fetchEmployees(page, debouncedSearch, debouncedDept); 
  }, [page, debouncedSearch, debouncedDept]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axiosInstance.delete(`/employees/${deleteTarget._id}`);
      toast.success('Employee deleted successfully');
      setDeleteTarget(null);
      fetchEmployees(page, search);
    } catch (err) {
      toast.error('Failed to delete employee');
    }
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE': return <span className="px-3 py-1 bg-success/10 text-success border border-success/20 rounded-full text-xs font-semibold">ACTIVE</span>;
      case 'NOTICE_PERIOD': return <span className="px-3 py-1 bg-warning/10 text-warning border border-warning/20 rounded-full text-xs font-semibold">NOTICE PERIOD</span>;
      case 'PROBATION': return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold">PROBATION</span>;
      default: return null;
    }
  };

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Employee Management</h2>
          <p className="text-textSec text-sm mt-1">Manage employee records, access, and statuses.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSec" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl bg-background/50 border border-border/60 text-white text-sm focus:ring-1 focus:ring-primary w-full sm:w-56"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by Department..."
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-background/50 border border-border/60 text-white text-sm focus:ring-1 focus:ring-primary w-full sm:w-48"
            />
          </div>
          <button
            onClick={() => fetchEmployees(1, search, deptFilter)}
            className="p-2.5 rounded-xl border border-border/60 text-textSec hover:text-white hover:bg-white/5 transition-all"
            title="Refresh"
          >
            <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={async () => {
              try {
                const res = await axiosInstance.get('/employees/export-csv', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'employees.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                toast.success('CSV exported successfully');
              } catch (err) {
                toast.error('Failed to export CSV');
              }
            }}
            className="flex justify-center items-center gap-2 py-2.5 px-5 rounded-xl border border-secondary/30 text-secondary hover:bg-secondary/10 transition-all text-sm font-bold"
          >
            Export CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex justify-center items-center gap-2 py-2.5 px-5 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all"
          >
            <Plus size={18} /> Add Employee
          </button>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/80 border-b border-border/50 text-sm text-textSec">
                <th className="px-6 py-4 font-medium whitespace-nowrap">Name</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Email</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Company ID</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Department</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Location</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Joining Date</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm">
              {employees.length > 0 ? employees.map((emp) => (
                <tr key={emp._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-white font-medium whitespace-nowrap">{emp.name}</td>
                  <td className="px-6 py-4 text-textSec whitespace-nowrap">{emp.email}</td>
                  <td className="px-6 py-4 text-textSec font-mono whitespace-nowrap">{emp.company_id}</td>
                  <td className="px-6 py-4 text-textSec whitespace-nowrap">{emp.department || <span className="text-textSec/50 italic">—</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(emp.employment_status)}</td>
                  <td className="px-6 py-4 text-textSec whitespace-nowrap">
                    {emp.location ? getStateName(emp.location) : (
                      <span className="text-warning/70 text-xs">Not Set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-textSec whitespace-nowrap">{formatDate(emp.joining_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                    <button onClick={() => setCompOffTarget(emp)} className="text-success hover:text-success/80 transition-colors p-1" title="Grant Comp Off">
                      <Gift size={16} />
                    </button>
                    <button onClick={() => openEditModal(emp)} className="text-secondary hover:text-secondary/80 transition-colors p-1" title="Edit Employee">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget(emp)} className="text-danger hover:text-danger/80 transition-colors p-1" title="Delete Employee">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-textSec">No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border/50">
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} paginationMeta={paginationMeta} />
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && <AddEmployeeModal onClose={() => setIsAddModalOpen(false)} refresh={() => fetchEmployees(page, search)} />}
        {isEditModalOpen && <EditEmployeeModal employee={editingEmployee} onClose={() => setIsEditModalOpen(false)} refresh={() => fetchEmployees(page, search)} />}
        {compOffTarget && <GrantCompOffModal employee={compOffTarget} onClose={() => setCompOffTarget(null)} />}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This will remove all their leaves, attendance, and balances permanently.`}
        confirmText="Delete"
        isDanger
      />
    </motion.div>
  );
};

const AddEmployeeModal = ({ onClose, refresh }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', company_id: '', password: '', 
    joining_date: '', date_of_birth: '', employment_status: 'ACTIVE',
    department: '', location: '',
    pan_number: '', bank_account_number: '', bank_name: '', ifsc_code: '', account_holder_name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axiosInstance.post('/employees', formData);
      toast.success('Employee added successfully');
      refresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalLayout title="Add New Employee" onClose={onClose}>
      <EmployeeForm formData={formData} setFormData={setFormData} onSubmit={handleSubmit} loading={loading} isEdit={false} />
    </ModalLayout>
  );
};

const EditEmployeeModal = ({ employee, onClose, refresh }) => {
  const [formData, setFormData] = useState({
    name: employee.name || '', email: employee.email || '', company_id: employee.company_id || '', 
    password: '', // optional on edit
    joining_date: employee.joining_date ? new Date(employee.joining_date).toISOString().split('T')[0] : '', 
    date_of_birth: employee.date_of_birth ? new Date(employee.date_of_birth).toISOString().split('T')[0] : '', 
    employment_status: employee.employment_status || 'ACTIVE',
    department: employee.department || '',
    location: employee.location || '',
    leaveQuota: '', // custom field for admin
    pan_number: employee.pan_number || '', bank_account_number: employee.bank_account_number || '', 
    bank_name: employee.bank_name || '', ifsc_code: employee.ifsc_code || '', account_holder_name: employee.account_holder_name || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...formData };
    if (!payload.password) delete payload.password; // dont send if empty
    if (!payload.leaveQuota) delete payload.leaveQuota;
    
    try {
      await axiosInstance.put(`/employees/${employee._id}`, payload);
      toast.success('Employee updated successfully');
      refresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalLayout title="Edit Employee" onClose={onClose}>
      <EmployeeForm formData={formData} setFormData={setFormData} onSubmit={handleSubmit} loading={loading} isEdit={true} />
    </ModalLayout>
  );
};

const ModalLayout = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
      className="bg-card border border-border/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-3xl mx-2 sm:mx-4 max-h-[90vh] overflow-hidden flex flex-col relative z-10"
    >
      <div className="flex justify-between items-center p-6 border-b border-border/50">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <button onClick={onClose} className="text-textSec hover:text-white transition-colors"><X size={24} /></button>
      </div>
      <div className="overflow-y-auto p-6 custom-scrollbar">
        {children}
      </div>
    </motion.div>
  </div>
);

const EmployeeForm = ({ formData, setFormData, onSubmit, loading, isEdit }) => {
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Full Name *</label>
           <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Email *</label>
           <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Company ID *</label>
           <input type="text" name="company_id" value={formData.company_id} onChange={handleChange} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" placeholder="6-12 chars alphanumeric" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">{isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
           <input type="text" name="password" value={formData.password} onChange={handleChange} required={!isEdit} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Date of Birth *</label>
           <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm [color-scheme:dark]" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Joining Date *</label>
           <input type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} required className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm [color-scheme:dark]" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Status *</label>
           <select name="employment_status" value={formData.employment_status} onChange={handleChange} className="w-full px-3 py-2.5 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm">
             <option value="ACTIVE">Active</option>
             <option value="PROBATION">Probation</option>
             <option value="NOTICE_PERIOD">Notice Period</option>
           </select>
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Department</label>
           <input type="text" name="department" value={formData.department || ''} onChange={handleChange} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" placeholder="e.g. Engineering" />
        </div>
        {/* Location / State */}
        <div>
          <label className="block text-xs font-medium text-textSec uppercase mb-1">
            Location / State {!isEdit && <span className="text-danger">*</span>}
          </label>
          <select
            name="location"
            value={formData.location || ''}
            onChange={handleChange}
            required={!isEdit}
            className="w-full px-3 py-2.5 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm"
          >
            <option value="">Select State...</option>
            {INDIAN_STATES.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          {!isEdit && (
            <p className="text-[10px] text-textSec mt-1">Required. Determines which state-specific holidays apply.</p>
          )}
        </div>
        {isEdit && (
          <div>
            <label className="block text-xs font-medium text-textSec uppercase mb-1">Update Total Leave Quota (Optional)</label>
            <input type="number" name="leaveQuota" value={formData.leaveQuota} onChange={handleChange} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" placeholder="e.g. 14" />
          </div>
        )}
      </div>

      <hr className="border-border/50 my-6" />
      <h4 className="text-sm font-semibold text-white mb-4">Financial Details (Optional)</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">PAN Number</label>
           <input type="text" name="pan_number" value={formData.pan_number.toUpperCase()} onChange={handleChange} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm uppercase" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Account Holder Name</label>
           <input type="text" name="account_holder_name" value={formData.account_holder_name} onChange={handleChange} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Bank Name</label>
           <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">Bank Account Number</label>
           <input type="text" name="bank_account_number" value={formData.bank_account_number} onChange={e => setFormData({...formData, bank_account_number: e.target.value.replace(/\D/g, '')})} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm" maxLength="18" />
        </div>
        <div>
           <label className="block text-xs font-medium text-textSec uppercase mb-1">IFSC Code</label>
           <input type="text" name="ifsc_code" value={formData.ifsc_code.toUpperCase()} onChange={handleChange} className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm uppercase" />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button type="submit" disabled={loading} className="flex justify-center items-center gap-2 py-2.5 px-6 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-70 flex-1 md:flex-none">
          {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (isEdit ? 'Save Changes' : 'Create Employee')}
        </button>
      </div>
    </form>
  );
};

const GrantCompOffModal = ({ employee, onClose }) => {
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axiosInstance.put(`/employees/${employee._id}/credit-comp-off`, { days: Number(days) });
      toast.success(`${days} Comp Off day(s) credited to ${employee.name}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to credit comp off');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalLayout title={`Grant Comp Off — ${employee.name}`} onClose={onClose}>
      <div className="space-y-6">
        <p className="text-textSec text-sm">Credit compensatory-off days to this employee's balance.</p>
        <div>
          <label className="block text-xs font-medium text-textSec uppercase mb-1">Number of Days</label>
          <input
            type="number"
            value={days}
            min={0.5}
            step={0.5}
            onChange={(e) => setDays(e.target.value)}
            className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background/50 text-white focus:ring-1 focus:ring-primary text-sm"
          />
        </div>
        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={loading} className="flex justify-center items-center gap-2 py-2.5 px-6 rounded-xl shadow-lg text-sm font-bold text-white bg-success hover:bg-success/90 transition-all disabled:opacity-70">
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Gift size={16} /> Credit Comp Off</>}
          </button>
        </div>
      </div>
    </ModalLayout>
  );
};

export default EmployeeManagement;
