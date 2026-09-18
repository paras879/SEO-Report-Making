import { useState, useEffect } from 'react';

export default function DateRangeFilter({ onChange, className = '' }) {
  const [activeRange, setActiveRange] = useState('7d'); // 'today' | 'yesterday' | '7d' | '30d' | 'custom' | 'all'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    let from = '';
    let to = '';
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (activeRange === 'today') {
      from = todayStr;
      to = todayStr;
    } else if (activeRange === 'tomorrow') {
      const tm = new Date(now);
      tm.setDate(tm.getDate() + 1);
      const tmStr = tm.toISOString().slice(0, 10);
      from = tmStr;
      to = tmStr;
    } else if (activeRange === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      from = yStr;
      to = yStr;
    } else if (activeRange === '7d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      from = d.toISOString().slice(0, 10);
      to = todayStr;
    } else if (activeRange === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      from = d.toISOString().slice(0, 10);
      to = todayStr;
    } else if (activeRange === 'custom') {
      from = customFrom;
      to = customTo;
    }

    if (onChange) {
      onChange({ range: activeRange, from, to });
    }
  }, [activeRange, customFrom, customTo]);

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs font-semibold ${className}`}>
      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Date Filter:</span>
      <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
        {[
          { id: 'all', label: 'All Time' },
          { id: 'today', label: 'Today' },
          { id: 'tomorrow', label: 'Tomorrow' },
          { id: 'yesterday', label: 'Yesterday' },
          { id: '7d', label: '7 Days' },
          { id: '30d', label: '30 Days' },
          { id: 'custom', label: 'Custom' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveRange(tab.id)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeRange === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeRange === 'custom' && (
        <div className="flex items-center gap-2 animate-fade-in">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}
    </div>
  );
}
