import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { motion } from 'framer-motion';
import { Loader2, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';

const Analytics = () => {
  const [leavesByType, setLeavesByType] = useState([]);
  const [leavesByDept, setLeavesByDept] = useState([]);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [typeRes, deptRes, trendRes] = await Promise.all([
          axiosInstance.get('/analytics/leaves-by-type').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/analytics/leaves-by-department').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/analytics/attendance-trends').catch(() => ({ data: { data: [] } })),
        ]);
        setLeavesByType(typeRes.data.data || []);
        setLeavesByDept(deptRes.data.data || []);
        
        // Format attendance trends for Recharts
        const formattedTrends = (trendRes.data.data || []).map(day => ({
          name: day._id.split('-')[2],
          present: day.present || 0,
          absent: day.absent || 0
        }));
        setAttendanceTrends(formattedTrends);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const typeColors = { CL: '#3b82f6', LOP: '#ef4444', COMP_OFF: '#10b981' };
  const deptColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-1">{label || payload[0].name}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-primary" /> Analytics
        </h2>
        <p className="text-textSec text-sm mt-1">Organization-wide leave and attendance insights.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaves by Type */}
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" /> Approved Leaves by Type
          </h3>
          {leavesByType.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leavesByType}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {leavesByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={typeColors[entry._id] || deptColors[index % deptColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9ca3af' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-textSec text-sm text-center py-8">No data available</p>
          )}
        </div>

        {/* Leaves by Department */}
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Leaves by Department
          </h3>
          {leavesByDept.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leavesByDept} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="_id" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.4 }} />
                  <Bar dataKey="count" name="Leaves" radius={[4, 4, 0, 0]}>
                    {leavesByDept.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={deptColors[index % deptColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-textSec text-sm text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Attendance Trends */}
      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Attendance Trends (Current Month)
        </h3>
        {attendanceTrends.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="present" name="Present" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-textSec text-sm text-center py-8">No attendance data for this month</p>
        )}
      </div>
    </motion.div>
  );
};

export default Analytics;
