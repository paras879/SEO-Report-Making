import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../constants';

const ROLE_DOT = {
  super_admin: 'bg-purple-500', admin: 'bg-indigo-500',
  team_lead: 'bg-blue-500', employee: 'bg-emerald-500',
};

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function Chat() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleTab, setRoleTab] = useState('all');
  const [err, setErr] = useState('');
  const bottomRef = useRef(null);
  const activeIdRef = useRef(null);

  const loadContacts = () => api.get('/chat/contacts').then((r) => setContacts(r.data.contacts || [])).catch(() => {});
  const loadMessages = (id) => api.get(`/chat/${id}/messages`).then((r) => {
    if (activeIdRef.current === id) setMessages(r.data.messages || []);
  }).catch((e) => setErr(e.response?.data?.message || 'Failed'));

  // contacts poll
  useEffect(() => {
    loadContacts();
    const t = setInterval(loadContacts, 8000);
    return () => clearInterval(t);
  }, []);

  // conversation poll
  useEffect(() => {
    activeIdRef.current = active?.id || null;
    if (!active) return;
    loadMessages(active.id);
    const t = setInterval(() => loadMessages(active.id), 3000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openContact = (c) => { setActive(c); setMessages([]); setErr(''); };

  const send = async () => {
    const body = input.trim();
    if (!body || !active) return;
    setInput('');
    try {
      await api.post(`/chat/${active.id}`, { body });
      loadMessages(active.id);
      loadContacts();
    } catch (e) { setErr(e.response?.data?.message || 'Send failed'); }
  };

  const isAdmin = ['admin', 'super_admin'].includes(user.role);
  const filtered = contacts.filter((c) => {
    if (search && !(`${c.name} ${c.username}`.toLowerCase().includes(search.toLowerCase()))) return false;
    if (isAdmin && roleTab !== 'all') {
      if (roleTab === 'team_lead' && c.role !== 'team_lead') return false;
      if (roleTab === 'employee' && c.role !== 'employee') return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Direct Messaging</h1>
        <p className="text-xs text-slate-500 mt-0.5">Secure 1-on-1 team and client campaign discussions</p>
      </div>
      {err && <div className="alert-error">{err}</div>}

      <div className="flex h-[calc(100vh-12rem)] min-h-[480px] card p-0 overflow-hidden shadow-card-hover border border-slate-200/90">
        {/* ---- Contacts pane ---- */}
        <div className={`${active ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-slate-200/80 bg-white`}>
          <div className="p-3.5 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <input
                className="input py-2 pl-9 text-xs"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            </div>
            {isAdmin && (
              <div className="flex gap-1.5 text-xs">
                {[['all', 'All'], ['team_lead', 'Team Leads'], ['employee', 'Employees']].map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setRoleTab(k)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold tracking-tight transition-colors ${
                      roleTab === k
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filtered.map((c) => {
              const isActive = active?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => openContact(c)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 text-left transition-all ${
                    isActive ? 'bg-brand-50/70 border-l-4 border-brand-600' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-200/60 flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm">
                      {initials(c.name)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${ROLE_DOT[c.role] || 'bg-slate-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${isActive ? 'font-bold text-brand-900' : 'font-semibold text-slate-800'}`}>
                        {c.name}
                      </p>
                      {c.unread > 0 && (
                        <span className="bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center shrink-0 shadow-sm">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {c.last_message || roleLabel(c.role)}
                    </p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-10 px-4 text-slate-400">
                <span className="text-2xl block mb-1">💬</span>
                <p className="text-xs font-semibold">No contacts found</p>
              </div>
            )}
          </div>
        </div>

        {/* ---- Conversation pane ---- */}
        <div className={`${active ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-slate-50/70`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 shadow-card flex items-center justify-center text-2xl mb-3">
                💬
              </div>
              <h2 className="text-base font-bold text-slate-700">No conversation selected</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select a team member from the sidebar to view chat history and send messages
              </p>
            </div>
          ) : (
            <>
              {/* header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-3">
                  <button className="md:hidden text-slate-500 hover:text-slate-800 p-1" onClick={() => setActive(null)}>
                    ← Back
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {initials(active.name)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 leading-tight">{active.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-slate-500">{roleLabel(active.role)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* messages list */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                          mine
                            ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-br-none shadow-brand-900/10'
                            : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                        <p className={`text-[10px] mt-1 text-right font-medium ${mine ? 'text-brand-200' : 'text-slate-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center text-slate-400 text-xs py-12">
                    <span className="text-3xl block mb-2">👋</span>
                    <p className="font-semibold text-slate-600">No messages yet</p>
                    <p className="text-slate-400 mt-0.5">Send a message to start this discussion</p>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* input bar */}
              <div className="p-3.5 bg-white border-t border-slate-200/80 flex items-center gap-2">
                <input
                  className="input flex-1 py-2.5 px-4 text-sm"
                  placeholder={`Message ${active.name}...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button
                  className="btn-primary py-2.5 px-5 shrink-0"
                  disabled={!input.trim()}
                  onClick={send}
                >
                  <span>Send</span>
                  <span>🚀</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
