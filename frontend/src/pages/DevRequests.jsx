import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleLabel, PRIORITY_STYLE } from '../constants';

const STATUS = {
  submitted: { label: 'With Team Lead', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  tl_rejected: { label: 'Returned to You', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  forwarded: { label: 'With Developer', cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
};

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
  const [err, setErr] = useState('');

  const load = () => {
    const q = status ? `?status=${status}` : '';
    api.get(`/dev-requests${q}`).then((r) => setRequests(r.data.requests)).catch((e) => setErr(e.response?.data?.message || 'Failed to load'));
  };
  useEffect(load, [status]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">🛠️ {TITLES[user.role]}</h1>
          <p className="text-xs text-slate-500 mt-1">Site / technical issues raised by employees, routed to developers.</p>
        </div>
        {user.role === 'employee' && <Link to="/dev-requests/new" className="btn-primary text-xs">+ New Request</Link>}
      </div>

      {err && <div className="alert-error"><span>⚠️</span><span>{err}</span></div>}

      <div className="flex items-center gap-2">
        <select className="input max-w-xs text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="submitted">With Team Lead</option>
          <option value="forwarded">With Developer</option>
          <option value="resolved">Resolved</option>
          <option value="tl_rejected">Returned</option>
        </select>
      </div>

      <div className="space-y-3">
        {requests.map((r) => {
          const st = STATUS[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-600' };
          const siteCount = Array.isArray(r.sites) ? r.sites.length : 0;
          const urlCount = Array.isArray(r.sites) ? r.sites.reduce((n, s) => n + (s.urls?.length || 0), 0) : 0;
          return (
            <Link to={`/dev-requests/${r.id}`} key={r.id} className="card block hover:shadow-md transition p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900 truncate">{r.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[r.priority] || ''}`}>{(r.priority || 'medium').toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    🌐 {siteCount} site(s) · {urlCount} URL(s)
                    {user.role !== 'employee' && r.employee_name && <> · by {r.employee_name}</>}
                    {r.developer_name && <> · Dev: {r.developer_name}</>}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{new Date(r.updated_at).toLocaleString()}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>● {st.label}</span>
              </div>
            </Link>
          );
        })}
        {requests.length === 0 && (
          <div className="card text-center py-12 text-slate-400 text-sm">
            No developer requests yet.
            {user.role === 'employee' && <div className="mt-3"><Link to="/dev-requests/new" className="btn-primary text-xs">+ Raise your first request</Link></div>}
          </div>
        )}
      </div>
    </div>
  );
}
