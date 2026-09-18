import { useState } from 'react';
import { DEFAULT_WEBSITES } from '../constants';

export default function SearchableSiteInput({
  value,
  onChange,
  onSelectUrl,
  placeholder = 'Search or select site name (e.g. Apex Health Solutions)...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Load user saved custom websites from localStorage
  const getStoredCustomWebsites = () => {
    try {
      const stored = localStorage.getItem('custom_seo_websites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const allWebsites = [...getStoredCustomWebsites(), ...DEFAULT_WEBSITES];

  const filtered = allWebsites.filter((w) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return w.name.toLowerCase().includes(q) || (w.url && w.url.toLowerCase().includes(q));
  });

  const handleSavePastedWebsites = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const newSites = lines.map((line) => {
      let name = line;
      let url = '';
      if (line.startsWith('http://') || line.startsWith('https://')) {
        try {
          const parsed = new URL(line);
          name = parsed.hostname.replace(/^www\./, '');
          url = line;
        } catch {
          name = line;
        }
      }
      return { name, url };
    });

    const existing = getStoredCustomWebsites();
    const updated = [...newSites, ...existing];
    try {
      localStorage.setItem('custom_seo_websites', JSON.stringify(updated));
    } catch {}
    setPasteText('');
    setShowPasteModal(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          className="input text-xs pr-8 font-semibold bg-white w-full"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
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
          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
            <div className="p-2 bg-slate-50 sticky top-0 border-b border-slate-100 flex items-center gap-2">
              <input
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="🔍 Type to search 70+ websites..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="shrink-0 text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-1.5 rounded-lg hover:bg-brand-100 transition whitespace-nowrap"
                title="Paste / Bulk Import Websites"
              >
                📋 + Import Sites
              </button>
            </div>
            {filtered.map((w, idx) => {
              const displayUrl = w.url || w.name;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange(displayUrl);
                    if (onSelectUrl && w.url) onSelectUrl(w.url);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-brand-50/80 transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 font-mono group-hover:text-brand-700 truncate">{displayUrl}</p>
                  </div>
                  <span className="text-[10px] text-brand-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                    Select ➔
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching site. Click "+ Import Sites" or type custom site name.
              </div>
            )}
          </div>
        </>
      )}

      {/* Bulk Import Websites Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">📋 Paste / Import Website List</h3>
              <button type="button" onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Paste your list of website names or URLs below (one per line). They will be added to your searchable dropdown list.
            </p>
            <textarea
              className="input font-mono text-xs min-h-[140px] w-full p-3 border border-slate-200 rounded-xl"
              rows="6"
              placeholder="e.g.&#10;https://myclient1.com&#10;Apex Dental Care&#10;https://myclient2.com"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowPasteModal(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleSavePastedWebsites} className="px-4 py-1.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700">📥 Save to Dropdown List</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
