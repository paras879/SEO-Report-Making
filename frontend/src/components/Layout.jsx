import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import api from '../api/client';

const ROLE_LABEL = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  team_lead: 'Team Lead',
  employee: 'Employee',
  developer: 'Developer',
  designer: 'Editor',
  editor: 'Editor',
  supervisor: 'Supervisor',
};

// role -> menu items
function menuFor(role) {
  const m = [{ to: '/', label: 'Dashboard', icon: '📊' }];

  if (role === 'supervisor') {
    m.push({ to: '/supervisor', label: 'Supervisor Hub', icon: '👁️' });
    m.push({ to: '/reports', label: 'All Reports', icon: '📄' });
    m.push({ to: '/dev-requests', label: 'Dev Requests', icon: '🛠️' });
    m.push({ to: '/design-requests', label: 'Editor Requests', icon: '🎨' });
  } else if (role === 'developer') {
    m.push({ to: '/dev-requests', label: 'Dev Requests', icon: '🛠️' });
    m.push({ to: '/chat', label: 'Chat', icon: '💬' });
    return m;
  } else if (role === 'designer' || role === 'editor') {
    m.push({ to: '/design-requests', label: 'Editor Tasks', icon: '🎨' });
    m.push({ to: '/chat', label: 'Chat', icon: '💬' });
    return m;
  } else if (role === 'super_admin') {
    m.push({ to: '/supervisor', label: 'Supervisor Hub', icon: '👁️' });
    m.push({ to: '/users', label: 'Users', icon: '👥' });
    m.push({ to: '/teams', label: 'Teams', icon: '🗂️' });
    m.push({ to: '/reports', label: 'All Reports', icon: '📄' });
    m.push({ to: '/dev-requests', label: 'Dev Requests', icon: '🛠️' });
    m.push({ to: '/design-requests', label: 'Editor Requests', icon: '🎨' });
    m.push({ to: '/audit', label: 'Audit Logs', icon: '🛡️' });
  } else if (role === 'admin') {
    m.push({ to: '/supervisor', label: 'Supervisor Hub', icon: '👁️' });
    m.push({ to: '/users', label: 'Users', icon: '👥' });
    m.push({ to: '/teams', label: 'Teams', icon: '🗂️' });
    m.push({ to: '/reports', label: 'Forwarded Reports', icon: '📄' });
    m.push({ to: '/dev-requests', label: 'Dev Requests', icon: '🛠️' });
    m.push({ to: '/design-requests', label: 'Editor Requests', icon: '🎨' });
  } else if (role === 'team_lead') {
    m.push({ to: '/teams', label: 'My Team', icon: '🗂️' });
    m.push({ to: '/reports', label: 'Team Reports', icon: '📄' });
    m.push({ to: '/dev-requests', label: 'Dev Requests', icon: '🛠️' });
    m.push({ to: '/design-requests', label: 'Editor Requests', icon: '🎨' });
  } else {
    m.push({ to: '/reports', label: 'My Reports', icon: '📄' });
    m.push({ to: '/reports/new', label: 'New Report', icon: '➕' });
    m.push({ to: '/dev-requests', label: 'Dev Requests', icon: '🛠️' });
    m.push({ to: '/design-requests', label: 'Editor Requests', icon: '🎨' });
  }
  // Notes + Chat sabke liye
  m.push({ to: '/notes', label: role === 'employee' ? 'My Notes' : 'Notes', icon: '📝' });
  m.push({ to: '/chat', label: 'Chat', icon: '💬' });
  return m;
}

function SidebarInner({ user, menu, location, chatUnread, handleLogout, onClose, isDrawer }) {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Brand Header */}
      <div className="px-3.5 sm:px-5 py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white font-extrabold text-sm shadow-glow shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-base text-white tracking-tight leading-none truncate">SEO Report</h1>
            <span className="text-[9px] sm:text-[10px] font-semibold text-brand-400 uppercase tracking-wider block truncate mt-0.5">Enterprise Hub</span>
          </div>
        </div>
        {isDrawer && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors shrink-0 ml-1"
            aria-label="Close Menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* User Card */}
      <div className="px-3 py-3 mx-2 my-2.5 sm:mx-3 sm:my-3 rounded-xl bg-slate-900/90 border border-slate-800/90 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-brand-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-sm">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-xs sm:text-sm text-white truncate leading-tight">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">{ROLE_LABEL[user.role]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 sm:px-3 py-1.5 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">Navigation</div>
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            className={({ isActive }) => {
              const isSelected = isActive && !(item.to === '/reports' && location.pathname.startsWith('/reports/new'));
              return `flex items-center gap-2.5 rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-150 ${
                isSelected
                  ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/90'
              }`;
            }}
          >
            <span className="text-sm sm:text-base shrink-0">{item.icon}</span>
            <span className="flex-1 tracking-tight truncate">{item.label}</span>
            {item.to === '/chat' && chatUnread > 0 && (
              <span className="bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 flex items-center justify-center shadow-sm shrink-0">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-3 px-2 pb-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">Account</div>
        <NavLink
          to="/change-password"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/90'
            }`
          }
        >
          <span className="text-sm sm:text-base shrink-0">🔑</span>
          <span className="tracking-tight truncate">Change Password</span>
        </NavLink>
      </nav>

      {/* Logout at bottom */}
      <div className="p-2 sm:p-3 border-t border-slate-800/80 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
        >
          <span className="text-sm sm:text-base shrink-0">🚪</span>
          <span className="tracking-tight truncate">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const menu = menuFor(user.role);

  useEffect(() => {
    const load = () => api.get('/chat/unread-count').then((r) => setChatUnread(r.data.count || 0)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile & Tablet top bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 text-white px-4 py-3.5 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white" aria-label="Toggle Menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              S
            </div>
            <span className="font-bold text-sm tracking-tight">SEO Report</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>

      {/* Mobile & Tablet Slidebar Drawer - EXACTLY HALF (w-1/2) with backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop covering the whole screen - click closes the drawer */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Half Screen Sidebar Panel (w-1/2 on Mobile and Tablet) */}
          <aside className="relative w-1/2 h-full bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/80 shadow-2xl z-10 animate-drawer-in">
            <SidebarInner
              user={user}
              menu={menu}
              location={location}
              chatUnread={chatUnread}
              handleLogout={handleLogout}
              onClose={() => setOpen(false)}
              isDrawer={true}
            />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar - Sticky & Fixed on scroll (1024px+) */}
      <aside className="hidden lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:flex lg:flex-col lg:w-64 bg-slate-950 text-slate-300 border-r border-slate-800/80 shadow-none z-30">
        <SidebarInner
          user={user}
          menu={menu}
          location={location}
          chatUnread={chatUnread}
          handleLogout={handleLogout}
          onClose={() => setOpen(false)}
          isDrawer={false}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Desktop top bar with breadcrumb & notification */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="text-slate-400">Workspace</span>
            <span>/</span>
            <span className="text-brand-600 capitalize">{ROLE_LABEL[user.role]} View</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>System Live</span>
            </div>
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full min-w-0">{children}</main>
      </div>
    </div>
  );
}

