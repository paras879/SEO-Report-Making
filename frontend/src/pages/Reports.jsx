import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { PRIORITY_STYLE } from '../constants';
import DateRangeFilter from '../components/DateRangeFilter';

const TITLES = {
  super_admin: 'All Reports', admin: 'Forwarded Reports',
  team_lead: 'Team Reports', employee: 'My Reports', supervisor: 'Supervisor Reports Center',
};

export default function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('');
  const [dateFilter, setDateFilter] = useState({ range: 'all', from: '', to: '' });
  const [err, setErr] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (dateFilter.from) params.set('from', dateFilter.from);
    if (dateFilter.to) params.set('to', dateFilter.to);
    const q = params.toString() ? `?${params.toString()}` : '';

    api.get(`/reports${q}`).then((r) => setReports(r.data.reports || [])).catch((e) => setErr(e.response?.data?.message || 'Failed'));
  };
  useEffect(load, [status, dateFilter]);

  const canExport = ['admin', 'super_admin', 'supervisor'].includes(user.role);
  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (dateFilter.from) params.set('from', dateFilter.from);
      if (dateFilter.to) params.set('to', dateFilter.to);
      const q = params.toString() ? `?${params.toString()}` : '';

      const res = await api.get(`/reports/export/csv${q}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `reports_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setErr('Export failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{TITLES[user.role] || 'Reports Overview'}</h1>
          <p className="text-xs text-slate-500 mt-1">Review, track, and manage all campaign deliverables</p>
        </div>
        <div className="flex items-center gap-2.5">
          {canExport && (
            <button className="btn-secondary" onClick={exportCsv}>
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          )}
          {user.role === 'employee' && (
            <Link to="/reports/new" className="btn-primary">
              <span>➕</span>
              <span>Create New Report</span>
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

      {/* Filter Toolbar */}
      <div className="card p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <select className="input py-1.5 px-3 text-xs max-w-xs font-semibold" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted to TL</option>
              <option value="tl_rejected">Returned by TL</option>
              <option value="forwarded">Forwarded to Admin</option>
              <option value="admin_rejected">Returned by Admin</option>
              <option value="admin_approved">Approved</option>
            </select>
          </div>
          <DateRangeFilter onChange={setDateFilter} />
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Showing {reports.length} {reports.length === 1 ? 'report' : 'reports'}
        </span>
      </div>

      {/* Reports Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/90 border-b border-slate-100 text-left">
              <tr>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Report Title</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                {user.role !== 'employee' && <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Author</th>}
                {['super_admin', 'admin'].includes(user.role) && <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Team</th>}
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Priority</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-5 py-4 font-semibold text-slate-800">
                    <Link to={`/reports/${r.id}`} className="hover:text-brand-600 transition-colors">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">
                    {r.report_date?.slice(0, 10)}
                  </td>
                  {user.role !== 'employee' && (
                    <td className="px-5 py-4 text-slate-700 font-medium">
                      {r.employee_name}
                    </td>
                  )}
                  {['super_admin', 'admin'].includes(user.role) && (
                    <td className="px-5 py-4 text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {r.team_name || 'No Team'}
                      </span>
                    </td>
                  )}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${PRIORITY_STYLE[r.priority] || ''}`}>
                      {r.priority || 'medium'}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <Link
                      to={`/reports/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span>Open</span>
                      <span>➔</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-4xl mb-2">📄</span>
                      <p className="text-sm font-semibold text-slate-600">No reports found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try adjusting your status filter or create a new report</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
