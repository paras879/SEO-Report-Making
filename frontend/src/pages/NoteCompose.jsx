import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import NotesEditor from '../components/NotesEditor';

export default function NoteCompose() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState({ text: '', images: [] });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const target = user.role === 'employee' ? 'Team Lead' : 'Admin';

  const save = async (send) => {
    setErr('');
    if (!content.text.trim() && content.images.length === 0) {
      return setErr('Please write something or attach an image before sending.');
    }
    setBusy(true);
    try {
      const { data } = await api.post('/notes', { title, content, send });
      navigate(`/notes/${data.note.id}`);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to submit note');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/notes')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card"
        >
          <span>←</span>
          <span>Back to Notes</span>
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700">
          Target Recipient: {target}
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Compose Quick Note
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Directly send updates, queries, or screenshots to your {target} without filling a full report.
        </p>
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="card space-y-5">
        <div>
          <label className="label">Note Subject / Title (Optional)</label>
          <input
            className="input font-semibold"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Quick question about ranking dropped on Page 3"
          />
        </div>

        <div>
          <label className="label">Note Body & Attachments *</label>
          <NotesEditor value={content} onChange={setContent} />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>

          <button
            className="btn-primary text-xs px-6"
            disabled={busy}
            onClick={() => save(true)}
          >
            {busy ? 'Sending...' : `📤 Send Note to ${target}`}
          </button>
        </div>
      </div>
    </div>
  );
}
