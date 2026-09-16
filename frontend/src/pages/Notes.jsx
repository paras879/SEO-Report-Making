import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../constants';

const TITLES = {
  super_admin: 'All Workspace Notes',
  admin: 'Notes from Team Leads',
  team_lead: 'Team & Personal Notes',
  employee: 'My Notes & SEO Logs',
};

const NOTE_STATUS = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  sent_to_tl: { label: 'Sent to Team Lead', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  forwarded_to_admin: { label: 'Forwarded to Admin', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
};

const CATEGORIES = {
  all: { label: 'All Notes', icon: '📝', cls: 'border-slate-300 text-slate-700' },
  pinned: { label: 'Pinned', icon: '📌', cls: 'border-amber-400 text-amber-800 bg-amber-50' },
  blocker: { label: 'Blockers / Issues', icon: '🚨', cls: 'border-rose-400 text-rose-800 bg-rose-50' },
  task: { label: 'Daily Checklists', icon: '🎯', cls: 'border-blue-400 text-blue-800 bg-blue-50' },
  idea: { label: 'SEO Ideas & Strategy', icon: '💡', cls: 'border-purple-400 text-purple-800 bg-purple-50' },
  audit: { label: 'Audit Findings', icon: '🔍', cls: 'border-emerald-400 text-emerald-800 bg-emerald-50' },
  general: { label: 'General Notes', icon: '📄', cls: 'border-slate-300 text-slate-700 bg-slate-50' },
};

const PINNED_STORAGE_KEY = 'seo_pinned_notes_v1';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [pinnedIds, setPinnedIds] = useState([]);
  const [toast, setToast] = useState('');

  const canCompose = ['employee', 'team_lead'].includes(user.role);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Load pinned notes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      if (saved) setPinnedIds(JSON.parse(saved));
    } catch {}
  }, []);

  const togglePin = (e, noteId) => {
    e.preventDefault();
    e.stopPropagation();
    let updated;
    if (pinnedIds.includes(noteId)) {
      updated = pinnedIds.filter((id) => id !== noteId);
      showToast('📌 Note unpinned');
    } else {
      updated = [...pinnedIds, noteId];
      showToast('📌 Note pinned to top!');
    }
    setPinnedIds(updated);
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const copyNoteText = (e, note) => {
    e.preventDefault();
    e.stopPropagation();
    const textToCopy = `${note.title ? `${note.title}\n\n` : ''}${note.preview || ''}`;
    navigator.clipboard.writeText(textToCopy);
    showToast('📋 Note text copied to clipboard!');
  };

  const load = () => {
    api
      .get('/notes')
      .then((r) => setNotes(r.data.notes || []))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load notes'));
  };

  useEffect(() => {
    load();
  }, []);

  const deleteNote = async (e, noteId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.delete(`/notes/${noteId}`);
      setNotes((prev) => prev.filter((item) => item.id !== noteId));
      showToast('🗑️ Note deleted.');
    } catch (err) {
      setErr(err.response?.data?.message || 'Failed to delete note');
    }
  };

  // Filtered & Sorted notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = (n.title || '').toLowerCase().includes(q);
          const matchPreview = (n.preview || '').toLowerCase().includes(q);
          const matchAuthor = (n.author_name || '').toLowerCase().includes(q);
          if (!matchTitle && !matchPreview && !matchAuthor) return false;
        }

        // Category filter
        const cat = n.category || 'general';
        if (activeCategory === 'pinned') {
          if (!pinnedIds.includes(n.id)) return false;
        } else if (activeCategory !== 'all' && cat !== activeCategory) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all' && n.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aPinned = pinnedIds.includes(a.id);
        const bPinned = pinnedIds.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      });
  }, [notes, search, activeCategory, statusFilter, pinnedIds]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = notes.length;
    const pinned = notes.filter((n) => pinnedIds.includes(n.id)).length;
    const blockers = notes.filter((n) => n.category === 'blocker').length;
    const sent = notes.filter((n) => ['sent_to_tl', 'forwarded_to_admin'].includes(n.status)).length;
    return { total, pinned, blockers, sent };
  }, [notes, pinnedIds]);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider mb-1.5">
            <span>📝</span> Smart Workspace Notebook
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{TITLES[user.role]}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create checklists, report blockers with screenshots, and capture SEO strategy notes.
          </p>
        </div>
        {canCompose && (
          <Link to="/notes/new" className="btn-primary shadow-md shrink-0">
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

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Notes</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm">📁</div>
        </div>

        <div className="card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📌 Pinned</p>
            <p className="text-xl font-extrabold text-amber-600">{stats.pinned}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">📌</div>
        </div>

        <div className="card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">🚨 Blockers / Issues</p>
            <p className="text-xl font-extrabold text-rose-600">{stats.blockers}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm">🚨</div>
        </div>

        <div className="card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sent to Lead/Admin</p>
            <p className="text-xl font-extrabold text-emerald-600">{stats.sent}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">🚀</div>
        </div>
      </div>

      {/* Search, Filter Tabs & View Mode Controls */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search notes, keywords, authors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Controls: Status filter & View Switcher */}
          <div className="flex items-center justify-between w-full md:w-auto gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-xs py-1.5 font-semibold w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Drafts</option>
              <option value="sent_to_tl">Sent to Team Lead</option>
              <option value="forwarded_to_admin">Forwarded to Admin</option>
            </select>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Card Grid View"
              >
                🔲 Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Compact List View"
              >
                ☰ List
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          {Object.entries(CATEGORIES).map(([key, item]) => {
            const active = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200/80'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 && (
        <div className="card p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mx-auto text-slate-400">
            📝
          </div>
          <h3 className="font-bold text-base text-slate-800">No notes found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || activeCategory !== 'all' || statusFilter !== 'all'
              ? 'No notes match your current filters. Try changing search or clearing category.'
              : 'You have not written any notes yet. Write a quick note to capture ideas or report blockers!'}
          </p>
          {canCompose && (
            <Link to="/notes/new" className="btn-primary text-xs inline-flex items-center gap-1.5 mt-2">
              <span>✍️</span>
              <span>Write Your First Note</span>
            </Link>
          )}
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && filteredNotes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((n) => {
            const isPinned = pinnedIds.includes(n.id);
            const st = NOTE_STATUS[n.status] || { label: n.status, cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
            const cat = CATEGORIES[n.category] || CATEGORIES.general;

            return (
              <div
                key={n.id}
                className={`card p-5 flex flex-col justify-between gap-4 group transition-all duration-200 hover:shadow-card-hover relative ${
                  isPinned ? 'border-amber-300 ring-1 ring-amber-300/50 bg-amber-50/20' : ''
                }`}
              >
                <div className="space-y-2.5">
                  {/* Card Header: Category & Pin */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${cat.cls}`}>
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => togglePin(e, n.id)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          isPinned ? 'text-amber-600 bg-amber-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title={isPinned ? 'Unpin note' : 'Pin note to top'}
                      >
                        📌
                      </button>

                      <button
                        type="button"
                        onClick={(e) => copyNoteText(e, n)}
                        className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Copy note text"
                      >
                        📋
                      </button>

                      <button
                        type="button"
                        onClick={(e) => deleteNote(e, n.id)}
                        className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete note"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <Link to={`/notes/${n.id}`} className="block group-hover:text-brand-600">
                    <h3 className="font-extrabold text-base text-slate-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
                      {n.title || 'Untitled Note'}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-normal">
                    {n.preview || 'No text content provided.'}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>

                    {n.image_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                        🖼️ {n.image_count}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/notes/${n.id}`}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <span>View</span>
                    <span>➔</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && filteredNotes.length > 0 && (
        <div className="space-y-3">
          {filteredNotes.map((n) => {
            const isPinned = pinnedIds.includes(n.id);
            const st = NOTE_STATUS[n.status] || { label: n.status, cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
            const cat = CATEGORIES[n.category] || CATEGORIES.general;

            return (
              <div
                key={n.id}
                className={`card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all hover:shadow-card-hover ${
                  isPinned ? 'border-amber-300 ring-1 ring-amber-300/40 bg-amber-50/10' : ''
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPinned && <span className="text-xs text-amber-600 font-bold">📌 Pinned</span>}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.cls}`}>
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>

                  <Link to={`/notes/${n.id}`}>
                    <h3 className="font-bold text-sm md:text-base text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                      {n.title || 'Untitled Note'}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-500 line-clamp-1">
                    {n.preview || 'No text preview available.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => togglePin(e, n.id)}
                    className={`p-2 rounded-xl text-xs font-semibold border transition-colors ${
                      isPinned ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={isPinned ? 'Unpin' : 'Pin'}
                  >
                    📌
                  </button>

                  <button
                    type="button"
                    onClick={(e) => copyNoteText(e, n)}
                    className="p-2 rounded-xl text-xs font-semibold bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
                    title="Copy Text"
                  >
                    📋
                  </button>

                  <Link
                    to={`/notes/${n.id}`}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <span>Open</span>
                    <span>➔</span>
                  </Link>

                  <button
                    type="button"
                    onClick={(e) => deleteNote(e, n.id)}
                    className="p-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-100 transition-colors"
                    title="Delete Note"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
