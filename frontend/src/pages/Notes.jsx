import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../constants';

const TITLES = {
  super_admin: 'All Notes', admin: 'Notes from Team Leads',
  team_lead: 'Notes', employee: 'My Notes',
};

const NOTE_STATUS = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  sent_to_tl: { label: 'Sent to Team Lead', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  forwarded_to_admin: { label: 'Forwarded to Admin', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
};

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [err, setErr] = useState('');
  const canCompose = ['employee', 'team_lead'].includes(user.role);

  const load = () => {
    api.get('/notes').then((r) => setNotes(r.data.notes || [])).catch((e) => setErr(e.response?.data?.message || 'Failed'));
  };

  useEffect(() => {
    load();
  }, []);

  const deleteNote = async (e, noteId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this note from your view?')) return;
    try {
      await api.delete(`/notes/${noteId}`);
      setNotes((prev) => prev.filter((item) => item.id !== noteId));
    } catch (err) {
      setErr(err.response?.data?.message || 'Failed to delete note');
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{TITLES[user.role]}</h1>
          <p className="text-xs text-slate-500 mt-1">Free-form work notes, blocker discussions, and pasted screenshots</p>
        </div>
        {canCompose && (
          <Link to="/notes/new" className="btn-primary">
            <span>✍️</span>
            <span>Write New Note</span>
          </Link>
        )}
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Full-width Notes Stack */}
      <div className="space-y-4 w-full">
        {notes.map((n) => {
          const st = NOTE_STATUS[n.status] || { label: n.status, cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
          return (
            <Link
              to={`/notes/${n.id}`}
              key={n.id}
              className="card card-interactive p-5 md:p-6 w-full flex flex-col md:flex-row md:items-center justify-between gap-5 group transition-all"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-extrabold text-base md:text-lg text-slate-900 group-hover:text-brand-600 transition-colors">
                    {n.title || 'Untitled Note'}
                  </h3>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold border ${st.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed font-normal">
                  {n.preview || 'No text snippet provided in this note.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                  {user.role !== 'employee' && (
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      👤 {n.author_name} ({roleLabel(n.author_role)})
                    </span>
                  )}
                  {n.image_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 font-semibold text-[11px]">
                      🖼️ {n.image_count} {n.image_count === 1 ? 'image' : 'images'}
                    </span>
                  )}
                  <span>📅 {new Date(n.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 bg-brand-50 group-hover:bg-brand-600 group-hover:text-white px-4 py-2 rounded-xl transition-all shadow-sm">
                  <span>Open Note</span>
                  <span>➔</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => deleteNote(e, n.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white px-3.5 py-2 rounded-xl transition-all shadow-sm"
                  title="Delete this note"
                >
                  <span>🗑️</span>
                  <span>Delete</span>
                </button>
              </div>
            </Link>
          );
        })}

        {notes.length === 0 && (
          <div className="card p-12 text-center text-slate-400 w-full">
            <span className="text-4xl block mb-2">📝</span>
            <p className="text-base font-semibold text-slate-600">No notes found</p>
            <p className="text-xs text-slate-400 mt-1">Start writing notes with pasted screenshots for quick review</p>
          </div>
        )}
      </div>
    </div>
  );
}
