import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleLabel, PRIORITY_STYLE } from '../constants';

const STATUS = {
  submitted: { label: 'With Team Lead', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  tl_rejected: { label: 'Returned to Employee', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  forwarded: { label: 'With Developer', cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  resolved: { label: 'Resolved ✅', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
};

const ACTION_STYLE = {
  submitted: 'text-blue-600 bg-blue-50',
  forwarded: 'text-indigo-600 bg-indigo-50',
  resolved: 'text-emerald-600 bg-emerald-50',
  rejected: 'text-amber-600 bg-amber-50',
  commented: 'text-slate-600 bg-slate-100',
};

export default function DevRequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [developers, setDevelopers] = useState([]);
  const [devId, setDevId] = useState('');
  const [fwdMsg, setFwdMsg] = useState('');
  const [resolveMsg, setResolveMsg] = useState('');
  const [comment, setComment] = useState('');

  const load = () => api.get(`/dev-requests/${id}`).then((r) => setData(r.data)).catch((e) => setErr(e.response?.data?.message || 'Failed to load'));
  useEffect(load, [id]);

  useEffect(() => {
    if (user.role === 'team_lead') {
      api.get('/dev-requests/developers').then((r) => setDevelopers(r.data.developers || [])).catch(() => {});
    }
  }, [user.role]);

  const act = async (path, body) => {
    setBusy(true); setErr('');
    try { await api.post(`/dev-requests/${id}/${path}`, body || {}); setFwdMsg(''); setResolveMsg(''); setComment(''); load(); }
    catch (e) { setErr(e.response?.data?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  if (err && !data) return (
    <div className="w-full space-y-4">
      <button onClick={() => navigate('/dev-requests')} className="btn-secondary text-xs">← Back</button>
      <div className="alert-error"><span>⚠️</span><span>{err}</span></div>
    </div>
  );
  if (!data) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const r = data.request;
  const sites = Array.isArray(r.sites) ? r.sites : [];
  const st = STATUS[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-600' };
  const canForward = user.role === 'team_lead' && r.status === 'submitted' && r.team_lead_id === user.id;
  const canResolve = user.role === 'developer' && r.status === 'forwarded' && r.developer_id === user.id;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/dev-requests')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card">
          <span>←</span><span>Back to Requests</span>
        </button>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${st.cls}`}>● {st.label}</span>
      </div>

      {err && <div className="alert-error"><span>⚠️</span><span>{err}</span></div>}

      {/* Header card */}
      <div className="card p-6 md:p-8 bg-gradient-to-br from-white to-slate-50 space-y-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PRIORITY_STYLE[r.priority] || ''}`}>{(r.priority || 'medium').toUpperCase()} PRIORITY</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{r.title}</h1>
        <p className="text-xs text-slate-500">
          Raised by <b className="text-slate-700">{r.employee_name}</b> · Team: {r.team_name || '—'} · {new Date(r.created_at).toLocaleString()}
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] pt-1">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">👤 TL: {r.team_lead_name || '—'}</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">🛠️ Developer: {r.developer_name || 'Not assigned yet'}</span>
        </div>
      </div>

      {/* Problem + Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-lg">📝</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Problem Description</h2>
          </div>
          <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">{r.description || 'No description provided.'}</p>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-lg">🌐</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Affected Sites ({sites.length})</h2>
          </div>
          <div className="space-y-3">
            {sites.map((s, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-bold text-slate-800">{s.name || '(unnamed site)'}</p>
                <div className="mt-1 space-y-1">
                  {(s.urls || []).map((u, j) => (
                    <a key={j} href={u.startsWith('http') ? u : `https://${u}`} target="_blank" rel="noreferrer"
                      className="block text-xs text-brand-600 hover:underline truncate">🔗 {u}</a>
                  ))}
                  {(!s.urls || s.urls.length === 0) && <p className="text-xs text-slate-400">No URLs</p>}
                </div>
              </div>
            ))}
            {sites.length === 0 && <p className="text-xs text-slate-400">No sites listed</p>}
          </div>
        </div>
      </div>

      {/* Team Lead: forward / return */}
      {canForward && (
        <div className="card bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-0 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📤</span>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Forward to a Developer</h3>
              <p className="text-xs text-indigo-200">Assign this issue to a developer to solve</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className="rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              value={devId} onChange={(e) => setDevId(e.target.value)}>
              <option value="" className="text-slate-800">-- Select developer --</option>
              {developers.map((d) => <option key={d.id} value={d.id} className="text-slate-800">{d.name} ({d.username})</option>)}
            </select>
            <input className="rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Message to developer (optional)" value={fwdMsg} onChange={(e) => setFwdMsg(e.target.value)} />
          </div>
          {developers.length === 0 && <p className="text-xs text-amber-300">No developers yet — ask Admin to create a Developer account.</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-secondary text-xs" disabled={busy} onClick={() => act('reject', { message: fwdMsg })}>Return to Employee</button>
            <button className="btn-success text-xs px-5" disabled={busy || !devId} onClick={() => act('forward', { developer_id: Number(devId), message: fwdMsg })}>
              {busy ? 'Forwarding...' : '🚀 Forward to Developer'}
            </button>
          </div>
        </div>
      )}

      {/* Developer: resolve */}
      {canResolve && (
        <div className="card bg-gradient-to-br from-emerald-900 to-slate-900 text-white border-0 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✅</span>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Mark as Resolved</h3>
              <p className="text-xs text-emerald-200">Explain how you fixed it — the Team Lead & Admin will see this</p>
            </div>
          </div>
          <textarea className="w-full rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm text-white placeholder-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            rows="3" placeholder="e.g. Fixed the DNS record, cleared cache — site is live now." value={resolveMsg} onChange={(e) => setResolveMsg(e.target.value)} />
          <div className="flex justify-end">
            <button className="btn-success text-xs px-5" disabled={busy || !resolveMsg.trim()} onClick={() => act('resolve', { message: resolveMsg })}>
              {busy ? 'Saving...' : '✅ Mark Resolved & Notify'}
            </button>
          </div>
        </div>
      )}

      {/* Activity & Comments */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="text-lg">💬</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Activity & Comments</h3>
        </div>

        <ol className="relative border-l-2 border-slate-200 ml-3 space-y-4 my-2">
          {data.events?.map((e) => (
            <li key={e.id} className="ml-4">
              <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-white" />
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">{e.actor_name} <span className="font-normal text-slate-500">({roleLabel(e.actor_role)})</span></p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ACTION_STYLE[e.action] || 'text-slate-600 bg-slate-100'}`}>{e.action}</span>
                </div>
                <p className="text-[11px] text-slate-400">{new Date(e.created_at).toLocaleString()}</p>
                {e.message && <div className="mt-1.5 p-2 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700">{e.message}</div>}
              </div>
            </li>
          ))}
          {(!data.events || data.events.length === 0) && <li className="ml-4 text-xs text-slate-400">No activity yet</li>}
        </ol>

        {/* comment box */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <input className="input flex-1 text-sm" placeholder="Write a comment..." value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && comment.trim()) { e.preventDefault(); act('comments', { message: comment }); } }} />
          <button className="btn-primary text-xs" disabled={busy || !comment.trim()} onClick={() => act('comments', { message: comment })}>Send</button>
        </div>
      </div>
    </div>
  );
}
