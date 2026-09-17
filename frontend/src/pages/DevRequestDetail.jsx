import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleLabel, PRIORITY_STYLE, DEV_STATUS_MAP, devCategoryLabel } from '../constants';

const ACTION_STYLE = {
  submitted: 'text-blue-600 bg-blue-50',
  forwarded: 'text-indigo-600 bg-indigo-50',
  in_progress: 'text-amber-600 bg-amber-50',
  under_qa: 'text-purple-600 bg-purple-50',
  resolved: 'text-emerald-600 bg-emerald-50',
  reopened: 'text-rose-600 bg-rose-50',
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
  const [hoursSpent, setHoursSpent] = useState('');
  const [qaMsg, setQaMsg] = useState('');
  const [reopenMsg, setReopenMsg] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [activeImage, setActiveImage] = useState(null);
  const [comment, setComment] = useState('');

  const load = () =>
    api
      .get(`/dev-requests/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load'));

  useEffect(load, [id]);

  useEffect(() => {
    if (['team_lead', 'admin', 'super_admin'].includes(user.role)) {
      api.get('/dev-requests/developers').then((r) => setDevelopers(r.data.developers || [])).catch(() => {});
    }
  }, [user.role]);

  const act = async (path, body) => {
    setBusy(true);
    setErr('');
    try {
      await api.post(`/dev-requests/${id}/${path}`, body || {});
      setFwdMsg('');
      setResolveMsg('');
      setHoursSpent('');
      setQaMsg('');
      setReopenMsg('');
      setShowReopenForm(false);
      setComment('');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (err && !data)
    return (
      <div className="w-full space-y-4">
        <button onClick={() => navigate('/dev-requests')} className="btn-secondary text-xs">
          ← Back
        </button>
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const r = data.request;
  const sites = Array.isArray(r.sites) ? r.sites : [];
  const attachments = Array.isArray(r.attachments) ? r.attachments : [];
  const st = DEV_STATUS_MAP[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-600' };

  // Permissions
  const isAssignedDev = user.role === 'developer' && r.developer_id === user.id;
  const isAssignedTL = user.role === 'team_lead' && r.team_lead_id === user.id;
  const isAdmin = ['super_admin', 'admin'].includes(user.role);
  const isEmployee = user.role === 'employee' && r.employee_id === user.id;

  const canForward = (isAssignedTL || isAdmin) && ['submitted', 'tl_rejected', 'reopened'].includes(r.status);
  const canStartProgress = (isAssignedDev || isAdmin) && ['forwarded', 'reopened'].includes(r.status);
  const canSubmitQA = (isAssignedDev || isAdmin) && ['in_progress', 'forwarded', 'reopened'].includes(r.status);
  const canResolve = (isAssignedDev || isAssignedTL || isAdmin) && ['under_qa', 'in_progress', 'forwarded'].includes(r.status);
  const canReopen = (isEmployee || isAssignedTL || isAdmin) && ['resolved', 'under_qa'].includes(r.status);

  // Due date calculation
  const isOverdue = r.due_date && new Date(r.due_date) < new Date() && r.status !== 'resolved';

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Lightbox / Image Zoom Modal */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{activeImage.name}</span>
              <button onClick={() => setActiveImage(null)} className="text-slate-400 hover:text-slate-800 font-bold text-sm">✕ Close</button>
            </div>
            <img src={activeImage.url} alt={activeImage.name} className="max-h-[75vh] w-auto object-contain mx-auto" />
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dev-requests')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card"
        >
          <span>←</span>
          <span>Back to Requests</span>
        </button>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${st.cls}`}>
          ● {st.label}
        </span>
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Header Card */}
      <div className="card p-6 md:p-8 bg-gradient-to-br from-white to-slate-50 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PRIORITY_STYLE[r.priority] || ''}`}>
            {(r.priority || 'medium').toUpperCase()} PRIORITY
          </span>
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {devCategoryLabel(r.category)}
          </span>
          {r.client_name && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
              🏢 {r.client_name}
            </span>
          )}
          {r.due_date && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isOverdue ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              📅 Due: {new Date(r.due_date).toLocaleDateString()} {isOverdue && '⚠️ (Overdue)'}
            </span>
          )}
          {Number(r.hours_spent) > 0 && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ⏱️ {r.hours_spent} hrs logged
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{r.title}</h1>
        <p className="text-xs text-slate-500">
          Raised by <b className="text-slate-700">{r.employee_name}</b> · Team: {r.team_name || '—'} ·{' '}
          {new Date(r.created_at).toLocaleString()}
        </p>

        <div className="flex flex-wrap gap-2 text-[11px] pt-1">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">👤 TL: {r.team_lead_name || '—'}</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
            🛠️ Developer: {r.developer_name || 'Not assigned yet'}
          </span>
        </div>
      </div>

      {/* Problem + Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-lg">📝</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Problem Description</h2>
          </div>
          <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
            {r.description || 'No description provided.'}
          </p>
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
                    <a
                      key={j}
                      href={u.startsWith('http') ? u : `https://${u}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs text-brand-600 hover:underline truncate"
                    >
                      🔗 {u}
                    </a>
                  ))}
                  {(!s.urls || s.urls.length === 0) && <p className="text-xs text-slate-400">No URLs</p>}
                </div>
              </div>
            ))}
            {sites.length === 0 && <p className="text-xs text-slate-400">No sites listed</p>}
          </div>
        </div>
      </div>

      {/* Screenshots Gallery */}
      {attachments.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-lg">📸</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Attached Screenshots ({attachments.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {attachments.map((att, i) => (
              <div
                key={i}
                onClick={() => setActiveImage(att)}
                className="group relative cursor-pointer rounded-xl overflow-hidden border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all"
              >
                <img src={att.url} alt={att.name} className="w-full h-28 object-cover group-hover:scale-105 transition-all" />
                <div className="p-1.5 bg-white text-[10px] font-semibold text-slate-700 truncate">{att.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidential Credentials (Visible to Dev, TL, Admin) */}
      {r.credentials_note && (isAssignedDev || isAssignedTL || isAdmin) && (
        <div className="card bg-amber-50/70 border border-amber-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🔒</span>
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Confidential Access / Logins</h3>
            </div>
            <button
              onClick={() => setShowCreds(!showCreds)}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              {showCreds ? 'Hide Logins' : 'Reveal Logins 👁️'}
            </button>
          </div>
          {showCreds ? (
            <pre className="p-3 rounded-xl bg-white border border-amber-200 text-xs font-mono text-slate-800 whitespace-pre-wrap break-all">
              {r.credentials_note}
            </pre>
          ) : (
            <p className="text-xs text-amber-700 italic">Click "Reveal Logins" to inspect confidential credentials.</p>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKFLOW ACTION PANELS */}
      {/* ========================================================================= */}

      {/* 1. Team Lead: Forward / Return */}
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
            <select
              className="rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              value={devId}
              onChange={(e) => setDevId(e.target.value)}
            >
              <option value="" className="text-slate-800">
                -- Select developer --
              </option>
              {developers.map((d) => (
                <option key={d.id} value={d.id} className="text-slate-800">
                  {d.name} ({d.username})
                </option>
              ))}
            </select>
            <input
              className="rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Message to developer (optional)"
              value={fwdMsg}
              onChange={(e) => setFwdMsg(e.target.value)}
            />
          </div>
          {developers.length === 0 && (
            <p className="text-xs text-amber-300">No developers yet — ask Admin to create a Developer account.</p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="btn-secondary text-xs"
              disabled={busy}
              onClick={() => act('reject', { message: fwdMsg })}
            >
              Return to Employee
            </button>
            <button
              className="btn-success text-xs px-5"
              disabled={busy || !devId}
              onClick={() => act('forward', { developer_id: Number(devId), message: fwdMsg })}
            >
              {busy ? 'Forwarding...' : '🚀 Forward to Developer'}
            </button>
          </div>
        </div>
      )}

      {/* 2. Developer: Start Progress */}
      {canStartProgress && r.status !== 'in_progress' && (
        <div className="card bg-gradient-to-br from-amber-900 to-slate-900 text-white border-0 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚙️</span>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight">Ready to Work on this Request?</h3>
                <p className="text-xs text-amber-200">Click to notify Team Lead and Employee that work has started</p>
              </div>
            </div>
            <button
              className="btn-warning text-xs px-5"
              disabled={busy}
              onClick={() => act('start-progress', {})}
            >
              {busy ? 'Updating...' : '⚙️ Start Working (In Progress)'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Developer: Submit for QA & Testing */}
      {canSubmitQA && (
        <div className="card bg-gradient-to-br from-purple-900 to-slate-900 text-white border-0 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔍</span>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Submit for Testing / QA</h3>
              <p className="text-xs text-purple-200">Notify the Team Lead & Employee to test on live site</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <input
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm text-white placeholder-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="What was fixed / instructions for tester..."
                value={qaMsg}
                onChange={(e) => setQaMsg(e.target.value)}
              />
            </div>
            <div>
              <input
                type="number"
                step="0.5"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm text-white placeholder-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Hours spent (e.g. 1.5)"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              className="btn-primary text-xs px-5"
              disabled={busy || !qaMsg.trim()}
              onClick={() => act('submit-qa', { message: qaMsg, hours_spent: Number(hoursSpent) || 0 })}
            >
              {busy ? 'Submitting...' : '🔍 Submit for QA'}
            </button>
          </div>
        </div>
      )}

      {/* 4. Resolve panel (Developer / TL / Admin) */}
      {canResolve && (
        <div className="card bg-gradient-to-br from-emerald-900 to-slate-900 text-white border-0 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✅</span>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Mark as Resolved</h3>
              <p className="text-xs text-emerald-200">Finalize the fix and close the request</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <textarea
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm text-white placeholder-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                rows="2"
                placeholder="Describe final resolution..."
                value={resolveMsg}
                onChange={(e) => setResolveMsg(e.target.value)}
              />
            </div>
            <div>
              <input
                type="number"
                step="0.5"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm text-white placeholder-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Hours (e.g. 2.0)"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              className="btn-success text-xs px-5"
              disabled={busy || !resolveMsg.trim()}
              onClick={() => act('resolve', { message: resolveMsg, hours_spent: Number(hoursSpent) || 0 })}
            >
              {busy ? 'Saving...' : '✅ Mark Resolved & Close'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Re-open Request (if resolved but problem returns) */}
      {canReopen && (
        <div className="card space-y-3">
          {!showReopenForm ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">Still having issues with this site or fix?</p>
              <button
                onClick={() => setShowReopenForm(true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl transition"
              >
                ⚠️ Re-open Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Reason for Re-opening</h3>
              <textarea
                className="input text-xs"
                rows="2"
                placeholder="Explain why the issue is not solved..."
                value={reopenMsg}
                onChange={(e) => setReopenMsg(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-xs" onClick={() => setShowReopenForm(false)}>
                  Cancel
                </button>
                <button
                  className="btn-danger text-xs px-4"
                  disabled={busy || !reopenMsg.trim()}
                  onClick={() => act('reopen', { message: reopenMsg })}
                >
                  Confirm Re-open
                </button>
              </div>
            </div>
          )}
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
                  <p className="text-xs font-bold text-slate-800">
                    {e.actor_name} <span className="font-normal text-slate-500">({roleLabel(e.actor_role)})</span>
                  </p>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      ACTION_STYLE[e.action] || 'text-slate-600 bg-slate-100'
                    }`}
                  >
                    {e.action.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{new Date(e.created_at).toLocaleString()}</p>
                {e.message && (
                  <div className="mt-1.5 p-2 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700">
                    {e.message}
                  </div>
                )}
              </div>
            </li>
          ))}
          {(!data.events || data.events.length === 0) && (
            <li className="ml-4 text-xs text-slate-400">No activity yet</li>
          )}
        </ol>

        {/* Comment box */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <input
            className="input flex-1 text-sm"
            placeholder="Write a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && comment.trim()) {
                e.preventDefault();
                act('comments', { message: comment });
              }
            }}
          />
          <button
            className="btn-primary text-xs"
            disabled={busy || !comment.trim()}
            onClick={() => act('comments', { message: comment })}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

