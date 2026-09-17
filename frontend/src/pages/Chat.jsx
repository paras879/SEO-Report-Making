import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../constants';

const ROLE_THEMES = {
  super_admin: {
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    avatar: 'from-purple-600 to-indigo-700 text-white',
    dot: 'bg-purple-500',
    tag: 'Super Admin',
  },
  admin: {
    badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    avatar: 'from-indigo-600 to-blue-700 text-white',
    dot: 'bg-indigo-500',
    tag: 'Admin',
  },
  team_lead: {
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    avatar: 'from-sky-500 to-blue-600 text-white',
    dot: 'bg-sky-500',
    tag: 'Team Lead',
  },
  developer: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    avatar: 'from-amber-500 to-orange-600 text-white',
    dot: 'bg-amber-500',
    tag: 'Developer',
  },
  employee: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    avatar: 'from-emerald-500 to-teal-600 text-white',
    dot: 'bg-emerald-500',
    tag: 'Employee',
  },
};

const QUICK_EMOJIS = ['👍', '🚀', '✅', '🔥', '🙏', '⚠️', '❤️', '💡'];

function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
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
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef(null);
  const activeIdRef = useRef(null);

  const loadContacts = () =>
    api
      .get('/chat/contacts')
      .then((r) => setContacts(r.data.contacts || []))
      .catch(() => {});

  const loadMessages = (id) =>
    api
      .get(`/chat/${id}/messages`)
      .then((r) => {
        if (activeIdRef.current === id) setMessages(r.data.messages || []);
      })
      .catch((e) => setErr(e.response?.data?.message || 'Failed'));

  // contacts poll
  useEffect(() => {
    loadContacts();
    const t = setInterval(loadContacts, 6000);
    return () => clearInterval(t);
  }, []);

  // conversation poll
  useEffect(() => {
    activeIdRef.current = active?.id || null;
    if (!active) return;
    loadMessages(active.id);
    const t = setInterval(() => loadMessages(active.id), 2500);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openContact = (c) => {
    setActive(c);
    setMessages([]);
    setErr('');
  };

  const send = async (textToSend) => {
    const body = (textToSend || input).trim();
    if (!body || !active) return;
    setInput('');
    try {
      await api.post(`/chat/${active.id}`, { body });
      loadMessages(active.id);
      loadContacts();
    } catch (e) {
      setErr(e.response?.data?.message || 'Send failed');
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const isAdmin = ['admin', 'super_admin'].includes(user.role);

  const filtered = contacts.filter((c) => {
    if (search && !`${c.name} ${c.username}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleTab !== 'all') {
      if (roleTab === 'team_lead' && c.role !== 'team_lead') return false;
      if (roleTab === 'employee' && c.role !== 'employee') return false;
      if (roleTab === 'developer' && c.role !== 'developer') return false;
      if (roleTab === 'admin' && c.role !== 'admin') return false;
    }
    return true;
  });

  const totalUnread = contacts.reduce((acc, c) => acc + (c.unread || 0), 0);

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  for (const m of messages) {
    const dateStr = m.created_at ? new Date(m.created_at).toDateString() : '';
    if (dateStr !== lastDate) {
      groupedMessages.push({ isDate: true, date: m.created_at, key: `date-${dateStr}` });
      lastDate = dateStr;
    }
    groupedMessages.push(m);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Direct Messaging</h1>
            {totalUnread > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white shadow-sm animate-pulse">
                {totalUnread} new
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Real-time encrypted 1-on-1 team & campaign discussions</p>
        </div>

        {active && (
          <button
            onClick={() => setActive(null)}
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl transition"
          >
            <span>✕</span>
            <span>Close Chat</span>
          </button>
        )}
      </div>

      {err && <div className="alert-error"><span>⚠️</span><span>{err}</span></div>}

      {/* Main Container */}
      <div className="flex h-[calc(100vh-12.5rem)] min-h-[540px] rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 bg-white">
        {/* ========================================================================= */}
        {/* CONTACTS SIDEBAR */}
        {/* ========================================================================= */}
        <div
          className={`${
            active ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-88 lg:w-96 border-r border-slate-200/80 bg-slate-50/50`}
        >
          {/* Sidebar Top Search & Filters */}
          <div className="p-4 bg-white border-b border-slate-100 space-y-3">
            <div className="relative">
              <input
                className="input py-2.5 pl-9 pr-8 text-xs font-medium bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                placeholder="Search colleagues by name or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-3 text-xs text-slate-400">🔍</span>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs w-5 h-5 flex items-center justify-center rounded-full bg-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            {isAdmin && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {[
                  ['all', 'All'],
                  ['team_lead', 'Team Leads'],
                  ['employee', 'Employees'],
                  ['developer', 'Developers'],
                  ['admin', 'Admins'],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setRoleTab(k)}
                    className={`px-3 py-1.5 rounded-xl font-bold tracking-tight whitespace-nowrap transition-all ${
                      roleTab === k
                        ? 'bg-slate-900 text-white shadow-sm scale-102'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
            {filtered.map((c) => {
              const isActive = active?.id === c.id;
              const theme = ROLE_THEMES[c.role] || ROLE_THEMES.employee;

              return (
                <button
                  key={c.id}
                  onClick={() => openContact(c)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all relative group ${
                    isActive
                      ? 'bg-brand-50/90 border-l-4 border-brand-600'
                      : 'hover:bg-white/80'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${theme.avatar} flex items-center justify-center text-xs font-extrabold shadow-sm tracking-wider`}
                    >
                      {initials(c.name)}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${theme.dot}`}
                      title={`${roleLabel(c.role)}`}
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p
                        className={`text-sm truncate ${
                          isActive ? 'font-extrabold text-brand-950' : 'font-bold text-slate-800'
                        }`}
                      >
                        {c.name}
                      </p>
                      {c.last_at && (
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          {formatMessageTime(c.last_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p
                        className={`text-xs truncate ${
                          c.unread > 0 ? 'font-bold text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {c.last_message ? (
                          <span>{c.last_message}</span>
                        ) : (
                          <span className="italic text-slate-400">No messages yet</span>
                        )}
                      </p>
                      {c.unread > 0 ? (
                        <span className="bg-brand-600 text-white text-[10px] font-extrabold rounded-full min-w-[20px] h-[20px] px-1.5 flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                          {c.unread}
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border shrink-0 ${theme.badge}`}
                        >
                          {theme.tag}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 px-4 text-slate-400 space-y-2">
                <span className="text-3xl block">🔍</span>
                <p className="text-xs font-bold text-slate-600">No conversations found</p>
                <p className="text-[11px] text-slate-400">Try a different search term or filter tab</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONVERSATION PANE */}
        {/* ========================================================================= */}
        <div className={`${active ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-slate-50/50 relative`}>
          {!active ? (
            /* Rich Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-white via-slate-50/60 to-slate-100/70">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center text-4xl shadow-xl shadow-brand-500/20 transform hover:scale-105 transition-transform duration-300">
                  💬
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-emerald-500 border-3 border-white text-white flex items-center justify-center text-xs font-bold shadow-md">
                  ✓
                </div>
              </div>

              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Direct Messaging Hub
              </h2>
              <p className="text-xs text-slate-500 mt-2 max-w-md leading-relaxed">
                Connect instantly with your team leads, employees, developers, and administrators. Fast, secure, and organized project communications.
              </p>

              {/* Quick Contact Chips */}
              {contacts.length > 0 && (
                <div className="mt-8 max-w-lg w-full">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Quick Start Conversation
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {contacts.slice(0, 5).map((c) => {
                      const theme = ROLE_THEMES[c.role] || ROLE_THEMES.employee;
                      return (
                        <button
                          key={c.id}
                          onClick={() => openContact(c)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white hover:bg-slate-100/80 border border-slate-200/80 shadow-sm hover:shadow-md transition-all text-left group"
                        >
                          <div
                            className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${theme.avatar} flex items-center justify-center text-[9px] font-bold text-white`}
                          >
                            {initials(c.name)}
                          </div>
                          <span className="text-xs font-bold text-slate-800 group-hover:text-brand-600 truncate max-w-[100px]">
                            {c.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-8 flex items-center gap-2 text-[11px] text-slate-400 bg-white/80 border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-xs">
                <span>🔒</span>
                <span>Messages are private and visible only to participants</span>
              </div>
            </div>
          ) : (
            /* Active Conversation View */
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200/80 shadow-xs z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    className="md:hidden text-slate-600 hover:text-slate-900 p-1.5 -ml-1 rounded-xl bg-slate-100 hover:bg-slate-200 transition text-xs font-bold"
                    onClick={() => setActive(null)}
                  >
                    ← Back
                  </button>

                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${(ROLE_THEMES[active.role] || ROLE_THEMES.employee).avatar} text-white flex items-center justify-center text-xs font-extrabold shadow-sm`}
                    >
                      {initials(active.name)}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${(ROLE_THEMES[active.role] || ROLE_THEMES.employee).dot}`}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="font-extrabold text-sm text-slate-900 leading-tight truncate">
                      {active.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${(ROLE_THEMES[active.role] || ROLE_THEMES.employee).badge}`}
                      >
                        {roleLabel(active.role)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono truncate">
                        @{active.username}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {messages.length} message{messages.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {groupedMessages.map((item) => {
                  if (item.isDate) {
                    return (
                      <div key={item.key} className="flex justify-center my-4">
                        <span className="bg-slate-200/80 backdrop-blur-xs text-slate-600 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                          {formatDateHeader(item.date)}
                        </span>
                      </div>
                    );
                  }

                  const m = item;
                  const mine = m.sender_id === user.id;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2.5 group ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!mine && (
                        <div
                          className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${(ROLE_THEMES[active.role] || ROLE_THEMES.employee).avatar} text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm shrink-0 mb-1`}
                        >
                          {initials(active.name)}
                        </div>
                      )}

                      <div
                        className={`relative min-w-[140px] max-w-[85%] md:max-w-[75%] rounded-2xl px-4.5 py-3 shadow-sm transition-all ${
                          mine
                            ? 'bg-gradient-to-r from-brand-600 via-brand-600 to-indigo-600 text-white rounded-br-sm shadow-brand-700/15'
                            : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-sm shadow-slate-200/50'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-normal select-text pr-1">
                          {m.body}
                        </p>

                        <div
                          className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 font-medium ${
                            mine ? 'text-brand-100/90' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatMessageTime(m.created_at)}</span>
                          {mine && (
                            <span title="Delivered" className="text-[11px] font-bold tracking-tighter text-cyan-200">
                              ✓✓
                            </span>
                          )}
                        </div>

                        {/* Copy button on hover */}
                        <button
                          onClick={() => handleCopyText(m.body, m.id)}
                          className={`absolute top-2 ${
                            mine ? '-left-8' : '-right-8'
                          } opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 text-[11px] shadow-sm transition-all`}
                          title="Copy message"
                        >
                          {copiedId === m.id ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {messages.length === 0 && (
                  <div className="text-center text-slate-400 text-xs py-16 space-y-2">
                    <span className="text-4xl block animate-bounce">👋</span>
                    <p className="font-extrabold text-slate-700 text-sm">Say hello to {active.name}!</p>
                    <p className="text-slate-400 text-xs">This is the start of your direct conversation.</p>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick Emojis Bar */}
              <div className="px-4 py-1.5 bg-slate-50/80 border-t border-slate-200/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[11px] text-slate-400 font-bold mr-1">Quick:</span>
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => send(emoji)}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200/80 border border-slate-200/70 text-sm flex items-center justify-center transition-transform hover:scale-115 shadow-2xs"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Message Input Bar */}
              <div className="p-3.5 bg-white border-t border-slate-200/80 flex items-center gap-2">
                <input
                  className="input flex-1 py-3 px-4 text-sm bg-slate-50/70 border-slate-200 focus:bg-white transition-all rounded-2xl"
                  placeholder={`Write a message to ${active.name}... (Press Enter to send)`}
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
                  type="button"
                  className="btn-primary py-3 px-5 shrink-0 rounded-2xl font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/20 hover:shadow-brand-500/30 transition-all hover:scale-102"
                  disabled={!input.trim()}
                  onClick={() => send()}
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

