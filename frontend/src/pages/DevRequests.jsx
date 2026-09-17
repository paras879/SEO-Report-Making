import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PRIORITY_STYLE, DEV_CATEGORIES, DEV_STATUS_MAP, devCategoryLabel } from '../constants';

const TITLES = {
  super_admin: 'All Developer Requests',
  admin: 'Developer Requests',
  team_lead: 'Team Developer Requests',
  developer: 'Assigned Requests',
  employee: 'My Developer Requests',
};

export default function DevRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [err, setErr] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (search) params.set('search', search);

    const q = params.toString() ? `?${params.toString()}` : '';
    api
      .get(`/dev-requests${q}`)
      .then((r) => setRequests(r.data.requests))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load'));
  };

  useEffect(load, [status, category, search]);

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

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">🛠️ {TITLES[user.role]}</h1>
          <p className="text-xs text-slate-500 mt-1">Site / technical issues raised by employees, routed to developers.</p>
        </div>
        <div className="flex items-center gap-2">
          {user.role !== 'employee' && (
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="btn-secondary text-xs font-bold inline-flex items-center gap-1.5"
            >
              <span>📊</span>
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}
          {user.role === 'employee' && (
            <Link to="/dev-requests/new" className="btn-primary text-xs">
              + New Request
            </Link>
          )}
        </div>
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <input
            className="input text-sm pl-9"
            placeholder="Search by title, client or employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>

        {/* Status */}
        <select className="input text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="submitted">With Team Lead</option>
          <option value="forwarded">With Developer</option>
          <option value="in_progress">In Progress ⚙️</option>
          <option value="under_qa">Under QA / Testing 🔍</option>
          <option value="resolved">Resolved ✅</option>
          <option value="reopened">Reopened ⚠️</option>
          <option value="tl_rejected">Returned to Employee</option>
        </select>

        {/* Category */}
        <select className="input text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {DEV_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Requests Stream */}
      <div className="space-y-3">
        {requests.map((r) => {
          const st = DEV_STATUS_MAP[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-600' };
          const siteCount = Array.isArray(r.sites) ? r.sites.length : 0;
          const urlCount = Array.isArray(r.sites) ? r.sites.reduce((n, s) => n + (s.urls?.length || 0), 0) : 0;
          const attCount = Array.isArray(r.attachments) ? r.attachments.length : 0;
          const isOverdue = r.due_date && new Date(r.due_date) < new Date() && r.status !== 'resolved';

          return (
            <Link to={`/dev-requests/${r.id}`} key={r.id} className="card block hover:shadow-md transition p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900 truncate">{r.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        PRIORITY_STYLE[r.priority] || ''
                      }`}
                    >
                      {(r.priority || 'medium').toUpperCase()}
                    </span>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {devCategoryLabel(r.category)}
                    </span>
                    {r.client_name && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-brand-50 text-brand-700">
                        🏢 {r.client_name}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 truncate flex items-center gap-2 flex-wrap">
                    <span>🌐 {siteCount} site(s) · {urlCount} URL(s)</span>
                    {attCount > 0 && <span>📸 {attCount} image(s)</span>}
                    {Number(r.hours_spent) > 0 && <span className="font-semibold text-emerald-600">⏱️ {r.hours_spent} hrs</span>}
                    {user.role !== 'employee' && r.employee_name && <> · by <b className="text-slate-700">{r.employee_name}</b></>}
                    {r.developer_name && <> · Dev: <b className="text-slate-700">{r.developer_name}</b></>}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>Updated: {new Date(r.updated_at).toLocaleString()}</span>
                    {r.due_date && (
                      <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}>
                        📅 Due: {new Date(r.due_date).toLocaleDateString()} {isOverdue && '(Overdue)'}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>● {st.label}</span>
              </div>
            </Link>
          );
        })}

        {requests.length === 0 && (
          <div className="card text-center py-12 text-slate-400 text-sm">
            No developer requests matching the criteria.
            {user.role === 'employee' && (
              <div className="mt-3">
                <Link to="/dev-requests/new" className="btn-primary text-xs">
                  + Raise your first request
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

