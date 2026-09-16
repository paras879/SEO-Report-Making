import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../constants';

const NOTE_STATUS = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  sent_to_tl: { label: 'Sent to Team Lead', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  forwarded_to_admin: { label: 'Forwarded to Admin', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
};

const CATEGORIES = {
  blocker: { label: 'Blocker / Issue', icon: '🚨', cls: 'border-rose-300 text-rose-800 bg-rose-50' },
  task: { label: 'Daily Checklist', icon: '🎯', cls: 'border-blue-300 text-blue-800 bg-blue-50' },
  idea: { label: 'SEO Idea & Strategy', icon: '💡', cls: 'border-purple-300 text-purple-800 bg-purple-50' },
  audit: { label: 'Technical Audit', icon: '🔍', cls: 'border-emerald-300 text-emerald-800 bg-emerald-50' },
  general: { label: 'General Note', icon: '📄', cls: 'border-slate-300 text-slate-700 bg-slate-50' },
};

export default function NoteDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [fwdMsg, setFwdMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const copyNoteText = () => {
    if (!data?.note) return;
    const n = data.note;
    const txt = `${n.title ? `${n.title}\n\n` : ''}${n.content?.text || ''}`;
    navigator.clipboard.writeText(txt);
    showToast('📋 Note content copied to clipboard!');
  };

  const load = () => {
    api.get(`/notes/${id}`).then((r) => setData(r.data)).catch((e) => setErr(e.response?.data?.message || 'Failed to load note'));
  };
  useEffect(load, [id]);

  const forward = async () => {
    setBusy(true); setErr('');
    try {
      await api.post(`/notes/${id}/forward`, { message: fwdMsg });
      setFwdMsg('');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to forward note');
    } finally {
      setBusy(false);
    }
  };

  const deleteCurrentNote = async () => {
    if (!window.confirm('Are you sure you want to delete this note from your view?')) return;
    setBusy(true); setErr('');
    try {
      await api.delete(`/notes/${id}`);
      navigate('/notes');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to delete note');
      setBusy(false);
    }
  };

  if (err && !data) {
    return (
      <div className="w-full space-y-4">
        <button onClick={() => navigate('/notes')} className="btn-secondary text-xs">← Back to Notes</button>
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold uppercase tracking-wider">Loading Note...</span>
        </div>
      </div>
    );
  }

  const n = data.note;
  const content = n.content || { text: '', images: [] };
  const st = NOTE_STATUS[n.status] || { label: n.status, cls: 'bg-slate-100 text-slate-600' };
  const cat = CATEGORIES[content.category] || CATEGORIES.general;
  const canForward = user.role === 'team_lead' && n.status === 'sent_to_tl' && n.team_lead_id === user.id;
  const authorInitials = (n.author_name || 'U').split(' ').map(nm => nm[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/notes')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card"
        >
          <span>←</span>
          <span>Back to Notes</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={copyNoteText}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
          >
            <span>📋</span>
            <span>Copy Note</span>
          </button>

          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${st.cls}`}>
            ● {st.label}
          </span>

          <button
            onClick={deleteCurrentNote}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
          >
            <span>🗑️</span>
            <span>Delete Note</span>
          </button>
        </div>
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Note Header Card */}
      <div className="card p-6 md:p-8 bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/90 shadow-card">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-md border ${cat.cls}`}>
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {n.title || '(Untitled Note)'}
          </h1>

          <div className="flex items-center gap-3 pt-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {authorInitials}
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800">
                {n.author_name}{' '}
                <span className="font-normal text-slate-400">({roleLabel(n.author_role)})</span>
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Created on {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Note Body Card */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="text-lg">📝</span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Note Content</h2>
        </div>

        {content.text ? (
          <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed font-normal">
            {content.text}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic">No text content in this note.</p>
        )}

        {/* Attached Images Gallery */}
        {content.images?.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Attached Screenshots ({content.images.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {content.images.map((src, i) => (
                <div
                  key={i}
                  onClick={() => setZoom(src)}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all aspect-video bg-slate-100"
                >
                  <img
                    src={src}
                    alt={`note-img-${i}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                    <span>🔍</span>
                    <span>Click to Zoom</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team Lead Forward Action */}
      {canForward && (
        <div className="card bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-0 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📤</span>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Forward Note to Admin</h3>
              <p className="text-xs text-indigo-200">Escalate this employee note with optional review remarks</p>
            </div>
          </div>

          <textarea
            className="w-full rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm text-white placeholder-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
            rows="2"
            placeholder="Add a remark for the Admin (e.g. 'Reviewed by TL, verified client request')..."
            value={fwdMsg}
            onChange={(e) => setFwdMsg(e.target.value)}
          />

          <div className="flex justify-end">
            <button
              className="btn-success text-xs px-5"
              disabled={busy}
              onClick={forward}
            >
              {busy ? 'Forwarding...' : '🚀 Forward to Admin'}
            </button>
          </div>
        </div>
      )}

      {/* History Timeline */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="text-lg">🔗</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Audit History</h3>
        </div>

        <ol className="relative border-l-2 border-slate-200 ml-3 space-y-4 my-2">
          {data.events?.map((e) => (
            <li key={e.id} className="ml-4">
              <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-white"></div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">
                    {e.actor_name}{' '}
                    <span className="font-normal text-slate-500">({roleLabel(e.actor_role)})</span>
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                    {e.action}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{new Date(e.created_at).toLocaleString()}</p>
                {e.message && (
                  <div className="mt-1.5 p-2 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700 italic">
                    "{e.message}"
                  </div>
                )}
              </div>
            </li>
          ))}

          {(!data.events || data.events.length === 0) && (
            <li className="ml-4 text-xs text-slate-400">No events logged</li>
          )}
        </ol>
      </div>

      {/* Lightbox Zoom Overlay */}
      {zoom && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all"
          onClick={() => setZoom(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setZoom(null)}
              className="absolute -top-4 -right-4 bg-white text-slate-800 w-8 h-8 rounded-full font-bold shadow-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
            <img
              src={zoom}
              alt="fullscreen preview"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain ring-1 ring-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
