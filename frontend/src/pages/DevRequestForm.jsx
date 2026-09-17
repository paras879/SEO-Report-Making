import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { PRIORITY_OPTIONS, DEV_CATEGORIES } from '../constants';

export default function DevRequestForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [clientName, setClientName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [sites, setSites] = useState([{ name: '', urls: [''] }]);
  const [credentialsNote, setCredentialsNote] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const addSite = () => setSites([...sites, { name: '', urls: [''] }]);
  const removeSite = (si) => setSites(sites.filter((_, i) => i !== si));
  const setSiteName = (si, val) => setSites(sites.map((s, i) => (i === si ? { ...s, name: val } : s)));
  const addUrl = (si) => setSites(sites.map((s, i) => (i === si ? { ...s, urls: [...s.urls, ''] } : s)));
  const removeUrl = (si, ui) => setSites(sites.map((s, i) => (i === si ? { ...s, urls: s.urls.filter((_, j) => j !== ui) } : s)));
  const setUrl = (si, ui, val) => setSites(sites.map((s, i) => (i === si ? { ...s, urls: s.urls.map((u, j) => (j === ui ? val : u)) } : s)));

  // Handle File / Screenshot Upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setErr('Image size should be less than 5MB');
        continue;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachments((prev) => [
          ...prev,
          { name: file.name, url: ev.target.result, type: file.type, size: file.size },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Listen for Ctrl+V paste (screenshots)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (!blob) continue;
          const reader = new FileReader();
          reader.onload = (ev) => {
            setAttachments((prev) => [
              ...prev,
              { name: `Screenshot-${new Date().toLocaleTimeString().replace(/:/g, '')}.png`, url: ev.target.result, type: blob.type, size: blob.size },
            ]);
          };
          reader.readAsDataURL(blob);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const removeAttachment = (idx) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setErr('');
    if (!title.trim()) return setErr('Please add a short title for the problem');
    const cleaned = sites
      .map((s) => ({ name: s.name.trim(), urls: s.urls.map((u) => u.trim()).filter(Boolean) }))
      .filter((s) => s.name || s.urls.length > 0);
    if (cleaned.length === 0) return setErr('Add at least one site (name or URL)');

    setSaving(true);
    try {
      const { data } = await api.post('/dev-requests', {
        title,
        category,
        client_name: clientName,
        due_date: dueDate || null,
        description,
        priority,
        sites: cleaned,
        credentials_note: credentialsNote,
        attachments,
      });
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

      {/* Section 1: Problem Category & Details */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">01</div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Problem Details & Category</h2>
            <p className="text-[11px] text-slate-400">Categorize and describe the issue clearly</p>
          </div>
        </div>

        {/* Category Picker */}
        <div>
          <label className="label">Select Issue Category *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1">
            {DEV_CATEGORIES.map((c) => {
              const selected = category === c.value;
              return (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selected
                      ? 'border-brand-500 bg-brand-50/80 ring-2 ring-brand-500/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xl">{c.icon}</div>
                  <p className="text-xs font-bold text-slate-900 mt-1 leading-tight">{c.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{c.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Problem Title *</label>
            <input
              className="input font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Client site not loading / 500 error on checkout"
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} Priority
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Client / Project Name (Optional)</label>
            <input
              className="input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Apex Dental Clinic"
            />
          </div>
          <div>
            <label className="label">Expected Target Date / Due Date (Optional)</label>
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="sm:col-span-3">
            <label className="label">Describe the problem</label>
            <textarea
              className="input min-h-[100px]"
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is happening, since when, any error message, what you already tried..."
            />
          </div>
        </div>
      </div>

      {/* Section 2: Screenshots & Visual Evidence */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">02</div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Screenshots & Attachments</h2>
              <p className="text-[11px] text-slate-400">Upload error screenshots or press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-[10px]">Ctrl+V</kbd> to paste directly</p>
            </div>
          </div>
        </div>

        {/* Upload drop area */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 cursor-pointer bg-slate-50/50 hover:bg-brand-50/30 transition-all text-center">
          <span className="text-3xl mb-1">📸</span>
          <p className="text-xs font-bold text-slate-700">Click to upload screenshot or press Ctrl + V anywhere</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Supports PNG, JPG, GIF up to 5MB</p>
          <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Previews */}
        {attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                <img src={att.url} alt={att.name} className="w-full h-28 object-cover" />
                <div className="p-2">
                  <p className="text-[11px] font-semibold text-slate-700 truncate">{att.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-rose-600 transition"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Affected Sites & URLs */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">03</div>
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
                  <input
                    className="input"
                    value={s.name}
                    onChange={(e) => setSiteName(si, e.target.value)}
                    placeholder="e.g. Apex Health Solutions"
                  />
                </div>
                {sites.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSite(si)}
                    className="mb-0.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 px-3 py-2 rounded-xl transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="label">URLs</label>
                {s.urls.map((u, ui) => (
                  <div key={ui} className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      value={u}
                      onChange={(e) => setUrl(si, ui, e.target.value)}
                      placeholder="https://example.com/page"
                    />
                    {s.urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUrl(si, ui)}
                        className="shrink-0 w-9 h-9 rounded-lg text-rose-500 hover:bg-rose-50 border border-slate-200 flex items-center justify-center"
                        title="Remove URL"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addUrl(si)} className="text-xs font-bold text-brand-600 hover:underline">
                  + Add another URL
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Confidential Access Notes (Optional) */}
      <div className="card space-y-3">
        <button
          type="button"
          onClick={() => setShowCreds(!showCreds)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">04</div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Confidential Access Notes (Optional)</h2>
              <p className="text-[11px] text-slate-400">cPanel, WordPress or Staging Logins (Only visible to assigned Dev & TL)</p>
            </div>
          </div>
          <span className="text-xs font-bold text-brand-600">{showCreds ? '▲ Hide' : '▼ Add Credentials'}</span>
        </button>

        {showCreds && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <textarea
              className="input font-mono text-xs min-h-[90px]"
              rows="3"
              value={credentialsNote}
              onChange={(e) => setCredentialsNote(e.target.value)}
              placeholder="e.g. WP Admin: https://example.com/wp-admin&#10;User: dev_temp&#10;Pass: ******"
            />
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <span>🔒</span><span>Credentials entered here are only accessible by your Team Lead and the assigned Developer.</span>
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Ready to send?</p>
          <p>This request will go straight to your Team Lead with priority: <b className="capitalize text-slate-800">{priority}</b>.</p>
        </div>
        <button type="button" className="btn-primary w-full sm:w-auto text-xs" disabled={saving} onClick={submit}>
          {saving ? 'Sending...' : '🚀 Submit to Team Lead'}
        </button>
      </div>
    </div>
  );
}

