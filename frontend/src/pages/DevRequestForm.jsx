import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { PRIORITY_OPTIONS, DEV_CATEGORIES, DEFAULT_WEBSITES } from '../constants';

function SearchableSiteInput({ value, onChange, onSelectUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = DEFAULT_WEBSITES.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="relative">
        <input
          className="input text-xs pr-8 font-semibold bg-white"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search or select site name (e.g. Apex Health Solutions)..."
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700"
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
            <div className="p-2 bg-slate-50 sticky top-0 border-b border-slate-100">
              <input
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="🔍 Search website name or URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {filtered.map((w, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(w.name);
                  if (onSelectUrl && w.url) onSelectUrl(w.url);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-brand-50/80 transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-brand-700">{w.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{w.url}</p>
                </div>
                <span className="text-[10px] text-brand-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Select ➔
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching site. Click outside to use custom site name.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function DevRequestForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('hosting_server');
  const [clientName, setClientName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('high');
  const [sites, setSites] = useState([{ name: '', urls: [''] }]);
  const [credentialsNote, setCredentialsNote] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [selectedDeveloper, setSelectedDeveloper] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/dev-requests/developers')
      .then((r) => setDevelopers(r.data.developers || []))
      .catch(() => {});
  }, []);

  const activeCategoryMeta = DEV_CATEGORIES.find((c) => c.value === category) || DEV_CATEGORIES[0];
  const selectedDevObj = selectedDeveloper === 'all'
    ? { name: 'All Developers (Whole Dev Team)', username: 'all_devs', role: 'ALL' }
    : developers.find((d) => String(d.id) === String(selectedDeveloper));

  const handleCategorySelect = (catValue) => {
    setCategory(catValue);
    const catMeta = DEV_CATEGORIES.find((c) => c.value === catValue);
    if (catMeta && catMeta.defaultPriority) {
      setPriority(catMeta.defaultPriority);
    }
  };

  const applyCategoryTemplate = () => {
    if (activeCategoryMeta?.descPlaceholder) {
      setDescription((prev) => (prev ? `${prev}\n\n${activeCategoryMeta.descPlaceholder}` : activeCategoryMeta.descPlaceholder));
    }
  };

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
    if (!selectedDeveloper) return setErr('Please select a Developer or "All Developers" before submitting this request.');

    setSaving(true);
    try {
      const { data } = await api.post('/dev-requests', {
        title,
        category,
        client_name: clientName,
        due_date: dueDate || null,
        description,
        priority,
        developer_id: selectedDeveloper,
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
    <div className="w-full space-y-6 pb-12 animate-fade-in">
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
          Facing a technical / site issue (site not opening, error, etc.)? Select a Developer or send to All Developers directly.
        </p>
      </div>

      {err && <div className="alert-error"><span>⚠️</span><span>{err}</span></div>}

      {/* Section 1: Problem Category & Details */}
      <div className="card space-y-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">01</div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Problem Details & Category</h2>
            <p className="text-[11px] text-slate-400">Select a category — title, priority and questions will adapt automatically</p>
          </div>
        </div>

        {/* Category Picker */}
        <div>
          <label className="label text-xs font-bold text-slate-700">Select Issue Category *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1.5">
            {DEV_CATEGORIES.map((c) => {
              const selected = category === c.value;
              return (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => handleCategorySelect(c.value)}
                  className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    selected
                      ? 'border-brand-500 bg-brand-50/90 ring-2 ring-brand-500/25 shadow-sm transform scale-[1.02]'
                      : 'border-slate-200/90 hover:border-brand-300 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-600 animate-ping"></span>
                  )}
                  <div className="text-2xl group-hover:scale-110 transition-transform">{c.icon}</div>
                  <p className={`text-xs font-bold mt-1.5 leading-tight ${selected ? 'text-brand-900' : 'text-slate-800'}`}>
                    {c.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{c.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Dynamic Category Tip Banner */}
          {activeCategoryMeta?.tip && (
            <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-brand-50/70 via-indigo-50/50 to-brand-50/70 border border-brand-200/80 text-xs text-brand-900 flex items-center justify-between gap-3 animate-fade-in">
              <span className="font-semibold">{activeCategoryMeta.tip}</span>
              <button
                type="button"
                onClick={applyCategoryTemplate}
                className="text-[11px] font-bold text-brand-700 hover:text-brand-900 bg-white hover:bg-brand-100 border border-brand-300 px-2.5 py-1 rounded-lg transition-all shrink-0 shadow-sm"
              >
                📋 Load Template
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="sm:col-span-2">
            <label className="label text-xs font-bold text-slate-700">Problem Title *</label>
            <input
              className="input font-semibold text-xs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={activeCategoryMeta?.titlePlaceholder || "e.g. Client site not loading / 500 error"}
            />
          </div>
          <div>
            <label className="label text-xs font-bold text-slate-700">Priority</label>
            <select className="input text-xs" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} Priority
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs font-bold text-slate-700">Client / Project Name (Optional)</label>
            <input
              className="input text-xs"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Apex Dental Clinic"
            />
          </div>
          <div>
            <label className="label text-xs font-bold text-slate-700">Expected Target Date / Due Date (Optional)</label>
            <input
              type="date"
              className="input text-xs"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="label text-xs font-bold text-slate-700 mb-0">Describe the Problem *</label>
              <button
                type="button"
                onClick={applyCategoryTemplate}
                className="text-[11px] font-bold text-brand-600 hover:underline"
              >
                + Insert {activeCategoryMeta?.label} questions template
              </button>
            </div>
            <textarea
              className="input min-h-[120px] text-xs leading-relaxed"
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={activeCategoryMeta?.descPlaceholder || "What is happening, since when, any error message, what you already tried..."}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Screenshots & Visual Evidence */}
      <div className="card space-y-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm">
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

      {/* Section 3: Affected Sites & URLs with Searchable Dropdown */}
      <div className="card space-y-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">03</div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Affected Sites & URLs</h2>
              <p className="text-[11px] text-slate-400">Search/select from website list or type custom website name</p>
            </div>
          </div>
          <button type="button" onClick={addSite} className="btn-secondary text-xs">+ Add Site</button>
        </div>

        <div className="space-y-4">
          {sites.map((s, si) => (
            <div key={si} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label text-xs font-bold text-slate-700">Site {si + 1} Name (Searchable Website Dropdown)</label>
                  <SearchableSiteInput
                    value={s.name}
                    onChange={(val) => setSiteName(si, val)}
                    onSelectUrl={(url) => {
                      if (s.urls.length === 1 && !s.urls[0]) {
                        setUrl(si, 0, url);
                      }
                    }}
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
                <label className="label text-xs font-bold text-slate-700">URLs</label>
                {s.urls.map((u, ui) => (
                  <div key={ui} className="flex items-center gap-2">
                    <input
                      className="input flex-1 text-xs"
                      value={u}
                      onChange={(e) => setUrl(si, ui, e.target.value)}
                      placeholder="https://example.com/page"
                    />
                    {s.urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUrl(si, ui)}
                        className="shrink-0 w-9 h-9 rounded-lg text-rose-500 hover:bg-rose-50 border border-slate-200 flex items-center justify-center text-xs"
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
      <div className="card space-y-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm">
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

      {/* Section 5: Select Developer / Assignee (Mandatory) */}
      <div className="card space-y-3 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-200/90 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">05</div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-950">
                Select Developer / Assignee <span className="text-rose-500">*</span>
              </h2>
              <p className="text-[11px] text-indigo-600">Assign a specific developer or choose "All Developers" to send to whole dev team.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-white px-3 py-1 rounded-xl border border-indigo-200 shadow-xs">
            {developers.length} Developer{developers.length !== 1 ? 's' : ''} Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {/* Card Option 1: ALL DEVELOPERS */}
          <button
            type="button"
            onClick={() => { setSelectedDeveloper('all'); setErr(''); }}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
              selectedDeveloper === 'all'
                ? 'border-indigo-600 bg-white text-indigo-950 ring-2 ring-indigo-500/30 shadow-md font-bold'
                : 'border-indigo-200/80 hover:border-indigo-300 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 hover:bg-white text-slate-800'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-brand-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              👥
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-xs text-slate-900 truncate">All Developers (Whole Team)</p>
                {selectedDeveloper === 'all' && <span className="text-indigo-600 font-bold text-xs shrink-0">✓</span>}
              </div>
              <p className="text-[10px] text-indigo-600 font-mono font-bold truncate">@all_devs • Send to all {developers.length} devs</p>
            </div>
          </button>

          {/* Specific Developer Cards */}
          {developers.map((d) => {
            const isSel = String(d.id) === String(selectedDeveloper);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => { setSelectedDeveloper(String(d.id)); setErr(''); }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  isSel
                    ? 'border-indigo-600 bg-white text-indigo-950 ring-2 ring-indigo-500/30 shadow-md font-bold'
                    : 'border-indigo-100 hover:border-indigo-300 bg-white/80 hover:bg-white text-slate-800'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  👨‍💻
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-slate-900 truncate">{d.name}</p>
                    {isSel && <span className="text-indigo-600 font-bold text-xs shrink-0">✓</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono truncate">@{d.username} • [{d.role?.toUpperCase() || 'DEVELOPER'}]</p>
                </div>
              </button>
            );
          })}
        </div>

        {!selectedDeveloper && (
          <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1.5 mt-2">
            <span>⚠️</span> You MUST select a developer or "All Developers" before submitting this request.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Ready to send?</p>
          <p>
            This request will be sent {selectedDevObj ? `directly to ${selectedDevObj.name}` : 'to the Developer team'} with priority: <b className="capitalize text-slate-800">{priority}</b>.
          </p>
        </div>
        <button
          type="button"
          className={`w-full sm:w-auto text-xs py-2.5 px-6 font-bold shadow-md rounded-xl transition-all flex items-center justify-center gap-2 ${
            selectedDeveloper
              ? 'btn-primary'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
          }`}
          disabled={saving || !selectedDeveloper}
          onClick={submit}
        >
          {saving
            ? 'Sending...'
            : selectedDevObj
            ? `🚀 Submit to (${selectedDevObj.name})`
            : '⚠️ Select a Developer First'}
        </button>
      </div>
    </div>
  );
}
