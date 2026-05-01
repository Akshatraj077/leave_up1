import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
  Loader2,
  Calendar as CalendarIcon,
  AlertCircle,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil
} from 'lucide-react';

// Format date string (YYYY-MM-DD) to "Wed, 26 Jan" style
const formatDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });
};

const TypeBadge = ({ type }) => {
  const isNational = type === 'NATIONAL';
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border whitespace-nowrap ${
        isNational
          ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      }`}
    >
      {isNational ? 'National' : 'Regional'}
    </span>
  );
};

// Inline toast-like feedback
const InlineFeedback = ({ message, type }) => {
  if (!message) return null;
  return (
    <div
      className={`text-xs px-3 py-1.5 rounded-lg font-medium animate-pulse ${
        type === 'error'
          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
          : 'bg-green-500/20 text-green-400 border border-green-500/30'
      }`}
    >
      {message}
    </div>
  );
};

export const HolidaySection = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const cacheRef = useRef({});
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Edit states
  const [editingNameId, setEditingNameId] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', date: '', note: '' });
  const [addingCustom, setAddingCustom] = useState(false);

  // Action feedback
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [actionLoading, setActionLoading] = useState(null); // id of item being acted upon

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
  };

  const isEditable = selectedYear === currentYear;
  const isFuture = selectedYear > currentYear;
  const isPast = selectedYear < currentYear;

  const fetchHolidays = useCallback(async (year, skipCache = false) => {
    if (!skipCache && cacheRef.current[year]) {
      setHolidays(cacheRef.current[year]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/public-holidays?year=${year}`);
      const data = res.data?.data || [];
      cacheRef.current[year] = data;
      setHolidays(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch holidays. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHolidays(selectedYear);
  }, [selectedYear, fetchHolidays]);

  // Clear cache for year and refetch
  const invalidateAndRefetch = async (year) => {
    delete cacheRef.current[year];
    await fetchHolidays(year, true);
  };

  // ── Rename handler ──────────────────────────────────────────
  const handleRenameStart = (holiday) => {
    setEditingNameId(holiday._id);
    setEditingNameValue(holiday.name);
  };

  const handleRenameSave = async (id) => {
    if (!editingNameValue.trim()) return;
    setActionLoading(id);
    try {
      await axiosInstance.put(`/public-holidays/${id}`, { name: editingNameValue.trim() });
      setEditingNameId(null);
      showFeedback('Holiday renamed');
      await invalidateAndRefetch(selectedYear);
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Rename failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') handleRenameSave(id);
    if (e.key === 'Escape') setEditingNameId(null);
  };

  // ── Note handler ────────────────────────────────────────────
  const handleNoteStart = (holiday) => {
    setEditingNoteId(holiday._id);
    setEditingNoteValue(holiday.note || '');
  };

  const handleNoteSave = async (id) => {
    setActionLoading(id);
    try {
      await axiosInstance.put(`/public-holidays/${id}`, { note: editingNoteValue });
      setEditingNoteId(null);
      showFeedback('Note updated');
      await invalidateAndRefetch(selectedYear);
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Note update failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoteKeyDown = (e, id) => {
    if (e.key === 'Enter') handleNoteSave(id);
    if (e.key === 'Escape') setEditingNoteId(null);
  };

  // ── Delete handler ──────────────────────────────────────────
  const handleDelete = async (id) => {
    setActionLoading(id);
    try {
      await axiosInstance.delete(`/public-holidays/${id}`);
      setDeletingId(null);
      showFeedback('Holiday deleted');
      await invalidateAndRefetch(selectedYear);
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Sync handler ────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      await axiosInstance.post('/public-holidays/sync', { year: selectedYear });
      showFeedback('Holidays synced from API');
      await invalidateAndRefetch(selectedYear);
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ── Add Custom handler ──────────────────────────────────────
  const handleAddCustom = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.date) return;
    setAddingCustom(true);
    try {
      await axiosInstance.post('/public-holidays/custom', {
        name: addForm.name.trim(),
        date: addForm.date,
        note: addForm.note
      });
      setAddForm({ name: '', date: '', note: '' });
      setShowAddForm(false);
      showFeedback('Custom holiday added');
      await invalidateAndRefetch(selectedYear);
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to add holiday', 'error');
    } finally {
      setAddingCustom(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-8 relative z-40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Public Holidays</h2>
          <p className="text-textSec text-sm mt-1">Official holidays for India</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Feedback */}
          <InlineFeedback message={feedback.message} type={feedback.type} />

          {/* Sync Button — visible for current & future years */}
          {!isPast && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          )}

          {/* Year Selector */}
          <div className="flex items-center gap-2 bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl p-2 shadow-sm">
            <label className="text-xs font-semibold text-textSec ml-2 uppercase tracking-wider">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 ml-2 border rounded-xl bg-background/50 border-border/60 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm [color-scheme:dark] min-w-[100px]"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Year info badges */}
      {isFuture && (
        <div className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 inline-flex items-center gap-2">
          <CalendarIcon className="w-3.5 h-3.5" />
          Editable once the year begins.
        </div>
      )}

      {/* Holiday List Card */}
      <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm min-h-[400px] relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-textSec">Fetching holiday data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-400 max-w-lg mx-auto text-center">
            <AlertCircle className="w-10 h-10 mb-4 opacity-80" />
            <p className="font-medium mb-2">{error}</p>
          </div>
        ) : holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-textSec/70 text-center">
            <CalendarIcon className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm">No holidays found for {selectedYear}.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
            {holidays.map((holiday) => (
              <div
                key={holiday._id}
                className="group p-3.5 rounded-xl border border-border/30 bg-white/[0.02] hover:bg-white/[0.05] transition-colors flex items-center gap-4"
              >
                {/* Date */}
                <div className="text-xs text-textSec/80 font-mono w-[90px] shrink-0">
                  {formatDate(holiday.date)}
                </div>

                {/* Name + Note */}
                <div className="flex-1 min-w-0">
                  {editingNameId === holiday._id ? (
                    <input
                      type="text"
                      value={editingNameValue}
                      onChange={(e) => setEditingNameValue(e.target.value)}
                      onBlur={() => handleRenameSave(holiday._id)}
                      onKeyDown={(e) => handleRenameKeyDown(e, holiday._id)}
                      autoFocus
                      className="w-full bg-white/10 border border-primary/40 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  ) : (
                    <p
                      className={`text-sm font-medium text-white truncate ${
                        isEditable ? 'cursor-pointer hover:text-primary/80 transition-colors' : ''
                      }`}
                      onClick={() => isEditable && handleRenameStart(holiday)}
                      title={isEditable ? 'Click to rename' : undefined}
                    >
                      {holiday.name}
                      {isEditable && (
                        <Pencil className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                      )}
                    </p>
                  )}

                  {/* Note display / edit */}
                  {editingNoteId === holiday._id ? (
                    <input
                      type="text"
                      value={editingNoteValue}
                      onChange={(e) => setEditingNoteValue(e.target.value)}
                      onBlur={() => handleNoteSave(holiday._id)}
                      onKeyDown={(e) => handleNoteKeyDown(e, holiday._id)}
                      placeholder="Add a note..."
                      autoFocus
                      className="w-full mt-1 bg-white/5 border border-border/40 rounded-lg px-2 py-0.5 text-xs text-textSec focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  ) : (
                    <>
                      {holiday.note ? (
                        <p
                          className={`text-xs text-textSec/60 mt-0.5 truncate ${
                            isEditable ? 'cursor-pointer hover:text-textSec/80 transition-colors' : ''
                          }`}
                          onClick={() => isEditable && handleNoteStart(holiday)}
                        >
                          {holiday.note}
                        </p>
                      ) : isEditable ? (
                        <p
                          className="text-xs text-textSec/30 mt-0.5 cursor-pointer hover:text-textSec/50 transition-colors"
                          onClick={() => handleNoteStart(holiday)}
                        >
                          + Add note
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Badge */}
                <TypeBadge type={holiday.type} />

                {/* Action icons — current year only */}
                {isEditable && (
                  <div className="shrink-0 flex items-center gap-1">
                    {deletingId === holiday._id ? (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-red-400 mr-1">Delete?</span>
                        <button
                          onClick={() => handleDelete(holiday._id)}
                          disabled={actionLoading === holiday._id}
                          className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          {actionLoading === holiday._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="p-1 rounded-lg bg-white/5 text-textSec hover:bg-white/10 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(holiday._id)}
                        className="p-1.5 rounded-lg text-textSec/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Custom Holiday Form — current year only */}
        {isEditable && (
          <div className="mt-4 border-t border-border/20 pt-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 text-sm font-medium text-primary/70 hover:text-primary transition-colors"
            >
              {showAddForm ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {showAddForm ? 'Close' : '+ Add Holiday'}
            </button>

            {/* Collapsible form with height transition */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showAddForm ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}
            >
              <form
                onSubmit={handleAddCustom}
                className="flex flex-col sm:flex-row items-end gap-3 p-4 rounded-xl bg-white/[0.03] border border-border/30"
              >
                <div className="flex-1 w-full">
                  <label className="block text-[11px] uppercase tracking-wider text-textSec/60 font-semibold mb-1">
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Company Foundation Day"
                    className="w-full bg-white/5 border border-border/40 rounded-lg px-3 py-2 text-sm text-white placeholder-textSec/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="w-full sm:w-[160px]">
                  <label className="block text-[11px] uppercase tracking-wider text-textSec/60 font-semibold mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full bg-white/5 border border-border/40 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-[11px] uppercase tracking-wider text-textSec/60 font-semibold mb-1">
                    Note
                  </label>
                  <input
                    type="text"
                    value={addForm.note}
                    onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                    placeholder="Optional note"
                    className="w-full bg-white/5 border border-border/40 rounded-lg px-3 py-2 text-sm text-white placeholder-textSec/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingCustom}
                  className="px-5 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 font-semibold text-sm transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                >
                  {addingCustom ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
