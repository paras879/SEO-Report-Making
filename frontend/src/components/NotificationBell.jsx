import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function sanitizeEnglish(msg = '') {
  if (!msg) return '';
  return msg
    .replace(/ne ek note admin ko forward kiya/gi, 'forwarded a note to admin')
    .replace(/ne ek note bheja/gi, 'sent a note')
    .replace(/ne report submit kiya/gi, 'submitted a report')
    .replace(/ne report approve kiya/gi, 'approved the report')
    .replace(/ne report reject kiya/gi, 'returned the report');
}

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = () => {
    api.get('/notifications').then((r) => {
      setItems(r.data.notifications || []);
      setUnread(r.data.unread || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // 30s auto-refresh
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const openItem = async (n) => {
    try {
      if (!n.is_read) await api.patch(`/notifications/${n.id}/read`);
    } catch (e) {
      /* ignore */
    }
    setOpen(false);
    load();
    if (n.related_report_id) navigate(`/reports/${n.related_report_id}`);
  };

  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      load();
    } catch (e) {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-sm ring-2 ring-white animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] sm:w-[440px] md:w-[460px] max-w-[94vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">Notifications</span>
              {unread > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-slate-400">
                <span className="text-3xl mb-2">🔕</span>
                <p className="text-xs font-semibold text-slate-600">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">We'll alert you whenever reports, notes, or reviews require your attention</p>
              </div>
            )}

            {items.map((n) => {
              const displayMsg = sanitizeEnglish(n.message);
              return (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors flex items-start gap-3.5 ${
                    n.is_read ? 'bg-white' : 'bg-brand-50/40'
                  }`}
                >
                  <div className="pt-1.5 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-brand-500 shadow-sm ring-2 ring-brand-200'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs ${n.is_read ? 'font-semibold text-slate-700' : 'font-extrabold text-slate-900'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                        {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {displayMsg && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2 font-normal">
                        {displayMsg}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
