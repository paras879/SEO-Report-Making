import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { PRIORITY_OPTIONS } from '../constants';

export default function DevRequestForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [sites, setSites] = useState([{ name: '', urls: [''] }]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const addSite = () => setSites([...sites, { name: '', urls: [''] }]);
  const removeSite = (si) => setSites(sites.filter((_, i) => i !== si));
  const setSiteName = (si, val) => setSites(sites.map((s, i) => (i === si ? { ...s, name: val } : s)));
  const addUrl = (si) => setSites(sites.map((s, i) => (i === si ? { ...s, urls: [...s.urls, ''] } : s)));
  const removeUrl = (si, ui) => setSites(sites.map((s, i) => (i === si ? { ...s, urls: s.urls.filter((_, j) => j !== ui) } : s)));
  const setUrl = (si, ui, val) => setSites(sites.map((s, i) => (i === si ? { ...s, urls: s.urls.map((u, j) => (j === ui ? val : u)) } : s)));

  const submit = async () => {
    setErr('');
    if (!title.trim()) return setErr('Please add a short title for the problem');
    const cleaned = sites
      .map((s) => ({ name: s.name.trim(), urls: s.urls.map((u) => u.trim()).filter(Boolean) }))
      .filter((s) => s.name || s.urls.length > 0);
    if (cleaned.length === 0) return setErr('Add at least one site (name or URL)');

    setSaving(true);
    try {
      const { data } = await api.post('/dev-requests', { title, description, priority, sites: cleaned });
      navigate(`/dev-requests/${data.request.id}`);
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.errors?.[0]?.message || 'Failed to submit request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card"
        >
          <span>←</span><span>Back</span>
        </button>
        <span className="text-xs font-semibold text-slate-400">New Developer Request</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Raise a Developer Request</h1>
        <p className="text-xs text-slate-500 mt-1">
          Facing a technical / site issue (site not opening, error, etc.)? Report it here — it goes to your Team Lead, who forwards it to a Developer.
        </p>
      </div>

      {err && <div className="alert-error"><span>⚠️</span><span>{err}</span></div>}

      {/* Section 1: Problem details */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">01</div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Problem Details</h2>
            <p className="text-[11px] text-slate-400">Describe the issue clearly</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Problem Title *</label>
            <input className="input font-semibold" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Client site not loading / 500 error on checkout" />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} Priority</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="label">Describe the problem</label>
            <textarea className="input min-h-[100px]" rows="3" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What is happening, since when, any error message, what you already tried..." />
          </div>
        </div>
      </div>

      {/* Section 2: Sites & URLs */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">02</div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Affected Sites & URLs</h2>
              <p className="text-[11px] text-slate-400">Add one or more sites — each can have multiple URLs</p>
            </div>
          </div>
          <button type="button" onClick={addSite} className="btn-secondary text-xs">+ Add Site</button>
        </div>

        <div className="space-y-4">
          {sites.map((s, si) => (
            <div key={si} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label">Site {si + 1} Name</label>
                  <input className="input" value={s.name} onChange={(e) => setSiteName(si, e.target.value)}
                    placeholder="e.g. Apex Health Solutions" />
                </div>
                {sites.length > 1 && (
                  <button type="button" onClick={() => removeSite(si)}
                    className="mb-0.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 px-3 py-2 rounded-xl transition-all">
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="label">URLs</label>
                {s.urls.map((u, ui) => (
                  <div key={ui} className="flex items-center gap-2">
                    <input className="input flex-1" value={u} onChange={(e) => setUrl(si, ui, e.target.value)}
                      placeholder="https://example.com/page" />
                    {s.urls.length > 1 && (
                      <button type="button" onClick={() => removeUrl(si, ui)}
                        className="shrink-0 w-9 h-9 rounded-lg text-rose-500 hover:bg-rose-50 border border-slate-200 flex items-center justify-center" title="Remove URL">✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addUrl(si)} className="text-xs font-bold text-brand-600 hover:underline">+ Add another URL</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Ready to send?</p>
          <p>This request will go straight to your Team Lead.</p>
        </div>
        <button type="button" className="btn-primary w-full sm:w-auto text-xs" disabled={saving} onClick={submit}>
          {saving ? 'Sending...' : '🚀 Submit to Team Lead'}
        </button>
      </div>
    </div>
  );
}
