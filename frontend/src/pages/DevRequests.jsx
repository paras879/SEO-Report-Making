import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PRIORITY_STYLE, DEV_CATEGORIES, DEV_STATUS_MAP, devCategoryLabel } from '../constants';
import DateRangeFilter from '../components/DateRangeFilter';

const TITLES = {
  super_admin: 'All Developer Requests',
  admin: 'Developer Requests Hub',
  team_lead: 'Team Developer Requests',
  developer: 'Assigned Requests',
  employee: 'My Developer Requests',
};

const STATUS_TABS = [
  { id: '', label: 'All Requests' },
  { id: 'submitted', label: 'With TL' },
  { id: 'forwarded', label: 'Assigned' },
  { id: 'in_progress', label: 'In Progress ⚙️' },
  { id: 'under_qa', label: 'In Review 🔍' },
  { id: 'resolved', label: 'Completed ✅' },
];

export default function DevRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ range: 'all', from: '', to: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Direct Supervisory Note Modal state
  const [noteTicket, setNoteTicket] = useState(null);
  const [noteMsg, setNoteMsg] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    if (dateFilter.from) params.set('from', dateFilter.from);
    if (dateFilter.to) params.set('to', dateFilter.to);

    const q = params.toString() ? `?${params.toString()}` : '';
    api
      .get(`/dev-requests${q}`)
      .then((r) => setRequests(r.data.requests || []))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load requests'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, category, search, dateFilter]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await api.get('/dev-requests/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `developer-requests-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteDevRequest = async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!window.confirm('Are you sure you want to delete this developer request?')) return;
    try {
      const res = await api.delete(`/dev-requests/${id}`);
      if (res.data.success) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(res.data.message || 'Failed to delete request');
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete request');
    }
  };

  const handlePostSupervisoryNote = async (e) => {
    e.preventDefault();
    if (!noteMsg.trim() || !noteTicket) return;
    setSubmittingNote(true);
    setNoteSuccess('');
    try {
      await api.post(`/dev-requests/${noteTicket.id}/events`, {
        action: 'commented',
        message: `👑 Supervisor Guidance Note: ${noteMsg.trim()}`,
      });
      setNoteSuccess('Supervisory note sent successfully!');
      setTimeout(() => {
        setNoteTicket(null);
        setNoteMsg('');
        setNoteSuccess('');
      }, 1000);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post supervisory note');
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* Top Banner - Dark Navy & Electric Blue */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
            <span className="p-2 rounded-2xl bg-brand-600/30 border border-brand-500/30 shadow-inner">🛠️</span>
            <span>{TITLES[user.role] || 'Developer Requests'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Site errors, server issues, SSL certificates, speed optimization & custom feature requests.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {user.role !== 'employee' && (
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span>📊</span>
              <span>{exporting ? 'Exporting...' : 'Export CSV / Excel'}</span>
            </button>
          )}
          {user.role === 'employee' && (
            <Link
              to="/dev-requests/new"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-900/30 transition-all flex items-center gap-2 shrink-0 transform hover:-translate-y-0.5"
            >
              <span>➕</span> Raise Developer Request
            </Link>
          )}
        </div>
      </div>

      {err && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Filters Bar Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatus(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  status === tab.id
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <input
              type="text"
              className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 focus:bg-white"
              placeholder="Search title, client or employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Live Date Filter & Category Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <DateRangeFilter onChange={setDateFilter} />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-[10px]">Category:</span>
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                category === ''
                  ? 'bg-brand-50 text-brand-700 border-brand-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Categories
            </button>
            {DEV_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                  category === c.value
                    ? 'bg-brand-50 text-brand-700 border-brand-200 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests Stream Cards */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-sm text-center text-slate-400 font-medium text-xs animate-pulse">
          Loading developer requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-3">
          <span className="text-4xl block">🛠️</span>
          <p className="font-extrabold text-slate-800 text-sm">No developer requests found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No technical issues found matching your filter criteria. Try clearing search filters or raise a new request.
          </p>
          {user.role === 'employee' && (
            <div className="pt-2">
              <Link
                to="/dev-requests/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-900/20"
              >
                <span>➕</span> Raise New Developer Request
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const st = DEV_STATUS_MAP[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-600' };
            const siteCount = Array.isArray(r.sites) ? r.sites.length : 0;
            const urlCount = Array.isArray(r.sites) ? r.sites.reduce((n, s) => n + (s.urls?.length || 0), 0) : 0;
            const attCount = Array.isArray(r.attachments) ? r.attachments.length : 0;
            const isOverdue = r.due_date && new Date(r.due_date) < new Date() && r.status !== 'resolved';

            return (
              <Link
                to={`/dev-requests/${r.id}`}
                key={r.id}
                className="bg-white hover:bg-slate-50/90 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 p-4 sm:p-5 block group relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-2 flex-1">
                    {/* Header Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        #{r.id}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                        {r.title}
                      </h3>

                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                          PRIORITY_STYLE[r.priority] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {r.priority} Priority
                      </span>

                      <span className="shrink-0 rounded-lg px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {devCategoryLabel(r.category)}
                      </span>

                      {r.client_name && (
                        <span className="shrink-0 rounded-lg px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          🏢 {r.client_name}
                        </span>
                      )}
                    </div>

                    {/* Metadata Specs */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium bg-slate-100/70 px-2 py-0.5 rounded-md border border-slate-200/60">
                        🌐 {siteCount} site{siteCount !== 1 ? 's' : ''} ({urlCount} URL{urlCount !== 1 ? 's' : ''})
                      </span>
                      {attCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          📸 {attCount} screenshot{attCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {Number(r.hours_spent) > 0 && (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ⏱️ {r.hours_spent} hrs logged
                        </span>
                      )}
                      {r.employee_name && (
                        <span className="text-slate-600 font-medium">
                          Raised by: <b className="text-slate-900 font-bold">{r.employee_name}</b>
                        </span>
                      )}
                      {r.developer_name ? (
                        <span className="text-indigo-600 font-bold bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200">
                          👨‍💻 Dev: {r.developer_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Updated {new Date(r.updated_at).toLocaleString()}</span>
                      {r.due_date && (
                        <span className={isOverdue ? 'text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-slate-500'}>
                          📅 Target Due: {new Date(r.due_date).toLocaleDateString()} {isOverdue && '(Overdue)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold border shadow-2xs ${st.cls}`}>
                      {st.label}
                    </span>

                    {['supervisor', 'admin', 'super_admin'].includes(user.role) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setNoteTicket(r);
                        }}
                        className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-xs mt-1"
                        title="Add direct supervisory note"
                      >
                        <span>💬</span> Direct Note
                      </button>
                    )}

                    {(r.employee_id === user.id || ['admin', 'super_admin', 'team_lead'].includes(user.role)) && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDevRequest(r.id, e)}
                        className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-bold border border-rose-200 transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-2xs mt-1"
                        title="Delete request"
                      >
                        <span>🗑️</span> Delete
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Supervisory Direct Note Modal */}
      {noteTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>👑 Post Supervisory Guidance Note</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{noteTicket.title}</p>
              </div>
              <button
                onClick={() => setNoteTicket(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {noteSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {noteSuccess}
              </div>
            )}

            <form onSubmit={handlePostSupervisoryNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Guidance Note / Instructions for Dev & Employee:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter supervisory instructions, priority guidelines, or technical review note..."
                  value={noteMsg}
                  onChange={(e) => setNoteMsg(e.target.value)}
                  className="w-full p-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNoteTicket(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingNote ? 'Posting...' : '👑 Send Guidance Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
