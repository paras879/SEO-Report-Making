import { useEffect, useState } from 'react';
import api from '../api/client';
import { roleLabel } from '../constants';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/audit?limit=200')
      .then((r) => setLogs(r.data.logs || []))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.user_name && l.user_name.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.entity_type && l.entity_type.toLowerCase().includes(q)) ||
      (l.ip_address && l.ip_address.toLowerCase().includes(q))
    );
  });

  const getActionColor = (action = '') => {
    const act = action.toLowerCase();
    if (act.includes('approve') || act.includes('create')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (act.includes('reject') || act.includes('delete')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (act.includes('forward') || act.includes('submit')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (act.includes('login') || act.includes('auth')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security & Audit Logs</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {logs.length} events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident chronological activity trail of all administrative and lifecycle actions
          </p>
        </div>
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Filter / Search Toolbar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            className="input text-xs pl-9 py-2"
            placeholder="Search by user, action, IP, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs font-semibold text-slate-400 self-end sm:self-auto">
          Showing {filteredLogs.length} of {logs.length} logged entries
        </span>
      </div>

      {/* Logs Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-left">
              <tr>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Timestamp</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Actor</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Target Entity</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((l) => {
                const initials = (l.user_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 font-medium">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <span className="font-semibold text-slate-800 text-xs">{l.user_name || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {roleLabel(l.user_role) || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getActionColor(l.action)}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-medium text-slate-600">
                      {l.entity_type ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                          <span>{l.entity_type}</span>
                          {l.entity_id && <span className="text-brand-600">#{l.entity_id}</span>}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">
                        {l.ip_address || '127.0.0.1'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-3xl mb-2">🛡️</span>
                      <p className="text-sm font-semibold text-slate-600">No audit logs match your query</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try clearing your search filter</p>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-semibold">Loading audit logs...</span>
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
