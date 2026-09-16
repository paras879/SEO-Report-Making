import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import NotesEditor from '../components/NotesEditor';

const CATEGORY_OPTIONS = [
  { id: 'general', label: 'General Note', icon: '📄', color: 'slate' },
  { id: 'blocker', label: 'Blocker / Issue', icon: '🚨', color: 'rose' },
  { id: 'task', label: 'Checklist / Tasks', icon: '🎯', color: 'blue' },
  { id: 'idea', label: 'Strategy / Idea', icon: '💡', color: 'purple' },
  { id: 'audit', label: 'Technical Audit', icon: '🔍', color: 'emerald' },
];

const TEMPLATES = [
  {
    name: '🚨 SEO Blocker',
    category: 'blocker',
    title: 'Urgent: Blocker on [Page / Client]',
    text: `**Target Page / URL:** https://example.com/\n**Issue Description:** Indexing dropped / 404 crawl issue observed.\n**Impact:** Keywords affected.\n**Action Needed from Team Lead:** Please review and advise fix.`,
  },
  {
    name: '🎯 On-Page Checklist',
    category: 'task',
    title: 'On-Page Optimization Checklist',
    text: `Daily SEO Checklist:\n- [ ] Meta Title & Description optimized (<60 & <155 chars)\n- [ ] H1, H2, H3 heading tags structured\n- [ ] Target keywords naturally included in first 100 words\n- [ ] Internal linking to money pages added\n- [ ] Image ALT tags optimized\n- [ ] URL slug clean and descriptive`,
  },
  {
    name: '💡 Keyword Opportunity',
    category: 'idea',
    title: 'New Keyword & Content Opportunity for [Client]',
    text: `**Target Client / Campaign:** \n**New Keyword Idea:** \n**Search Intent:** Commercial / Informational\n**Recommended Strategy:** Publish dedicated blog post and build 3 contextual backlinks.`,
  },
];

const NOTE_DRAFT_KEY = 'seo_note_compose_draft_v1';

export default function NoteCompose() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [content, setContent] = useState({ text: '', images: [] });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const target = user.role === 'employee' ? 'Team Lead' : 'Admin';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Restore draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTE_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.content?.text) {
          setTitle(parsed.title || '');
          setCategory(parsed.category || 'general');
          setContent(parsed.content || { text: '', images: [] });
          showToast('💾 Restored unsaved note draft.');
        }
      }
    } catch {}
  }, []);

  // Save draft on edit
  useEffect(() => {
    if (title || content.text) {
      localStorage.setItem(NOTE_DRAFT_KEY, JSON.stringify({ title, category, content }));
    }
  }, [title, category, content]);

  const applyTemplate = (t) => {
    setTitle(t.title);
    setCategory(t.category);
    setContent((prev) => ({
      ...prev,
      text: t.text,
    }));
    showToast(`⚡ Applied "${t.name}" template!`);
  };

  const save = async (send) => {
    setErr('');
    if (!content.text.trim() && content.images.length === 0) {
      return setErr('Please write something or attach an image before sending.');
    }
    setBusy(true);
    try {
      const payloadContent = {
        ...content,
        category,
      };
      const { data } = await api.post('/notes', { title, content: payloadContent, send });
      localStorage.removeItem(NOTE_DRAFT_KEY);
      navigate(`/notes/${data.note.id}`);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to submit note');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/notes')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card"
        >
          <span>←</span>
          <span>Back to Notes</span>
        </button>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
          Target Recipient: <strong>{target}</strong>
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Compose Quick Note
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Capture checklists, document technical blockers with screenshots, or propose strategy ideas to your {target}.
        </p>
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Quick Templates Ribbon */}
      <div className="card p-4 space-y-2 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-purple-50/20 border-slate-200/80">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>⚡</span>
          <span>Quick Note Templates (1-Click Fill)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => applyTemplate(t)}
              className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100/80 border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm transition-all hover:scale-105"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div className="card space-y-5">
        {/* Category Picker */}
        <div>
          <label className="label">Select Note Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {CATEGORY_OPTIONS.map((c) => {
              const isSelected = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 justify-center ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="label">Note Subject / Title</label>
          <input
            className="input font-semibold"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Broken canonical tags discovered on /services"
          />
        </div>

        {/* Note Body & Paste Editor */}
        <div>
          <label className="label">Note Body & Screenshots (Press Ctrl + V to Paste Screenshots)</label>
          <NotesEditor value={content} onChange={setContent} />
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy}
              onClick={() => save(false)}
            >
              {busy ? 'Saving...' : '💾 Save as Draft'}
            </button>

            <button
              className="btn-primary text-xs px-6 shadow-md"
              disabled={busy}
              onClick={() => save(true)}
            >
              {busy ? 'Sending...' : `📤 Send Note to ${target}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
