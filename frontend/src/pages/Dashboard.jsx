import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DEV_STATUS_MAP, devCategoryLabel } from '../constants';

function StatCard({ label, value, color = 'brand', icon = '📊', subtitle, to, badge }) {
  const themes = {
    brand: {
      gradient: 'from-blue-600 to-indigo-600',
      text: 'text-brand-600',
      badge: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    emerald: {
      gradient: 'from-emerald-600 to-teal-600',
      text: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    amber: {
      gradient: 'from-amber-500 to-orange-500',
      text: 'text-amber-600',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    indigo: {
      gradient: 'from-indigo-600 to-purple-600',
      text: 'text-indigo-600',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    rose: {
      gradient: 'from-rose-500 to-pink-600',
      text: 'text-rose-600',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    slate: {
      gradient: 'from-slate-700 to-slate-900',
      text: 'text-slate-800',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  };
  const t = themes[color] || themes.brand;

  const content = (
    <div className="card p-5 bg-white border border-slate-200/90 hover:border-brand-300 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group rounded-2xl flex flex-col justify-between h-full">
      {/* Top Accent Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${t.gradient}`} />

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            {label}
          </span>
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${t.gradient} text-white flex items-center justify-center text-sm font-bold shadow-sm group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {value ?? 0}
          </p>
          {badge && (
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${t.badge}`}>
              {badge}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] font-medium text-slate-400">
          {subtitle || 'Real-time metrics'}
        </span>
        {to && (
          <span className="text-brand-600 font-bold text-[11px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            View ➔
          </span>
        )}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

const STATUS_LABEL = {
  draft: 'Draft (Working)',
  submitted: 'Submitted (TL Review)',
  tl_rejected: 'Returned by TL',
  forwarded: 'Forwarded (Admin Review)',
  admin_rejected: 'Returned by Admin',
  admin_approved: 'Approved & Active',
};

const STATUS_COLOR = {
  draft: 'from-slate-400 to-slate-500',
  submitted: 'from-blue-500 to-indigo-600',
  tl_rejected: 'from-amber-500 to-orange-500',
  forwarded: 'from-indigo-500 to-purple-600',
  admin_rejected: 'from-rose-500 to-red-600',
  admin_approved: 'from-emerald-500 to-teal-600',
};

function StatusChart({ data, rangeLabel }) {
  const total = data.reduce((acc, d) => acc + (parseInt(d.count, 10) || 0), 0);
  const max = Math.max(1, ...data.map((d) => d.count));

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl mb-2.5">
          📋
        </div>
        <p className="text-xs font-bold text-slate-700">No report status data for {rangeLabel}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
          Reports created in this selected date filter will automatically visualize their lifecycle distribution here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pt-1">
      {data.map((d) => {
        const count = parseInt(d.count, 10) || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={d.status} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 truncate max-w-[200px]">
                {STATUS_LABEL[d.status] || d.status}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900">{count}</span>
                <span className="text-[10px] font-semibold text-slate-400">({pct}%)</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${
                  STATUS_COLOR[d.status] || 'from-brand-500 to-indigo-600'
                } transition-all duration-500`}
                style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ data, rangeLabel }) {
  const total = data.reduce((acc, d) => acc + (parseInt(d.count, 10) || 0), 0);
  const max = Math.max(1, ...data.map((d) => d.count));

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl mb-2.5">
          📈
        </div>
        <p className="text-xs font-bold text-slate-700">No activity for {rangeLabel}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
          Daily SEO campaign progress and submitted logs will show live volume spikes here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-2 md:gap-3 h-40 pt-4 overflow-x-auto">
      {data.map((d) => {
        const count = parseInt(d.count, 10) || 0;
        const heightPct = (count / max) * 100;
        return (
          <div key={d.day} className="flex-1 min-w-[28px] flex flex-col items-center justify-end h-full group">
            <span className="text-[11px] font-extrabold text-slate-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {count}
            </span>
            <div
              className="w-full bg-gradient-to-t from-brand-600 to-indigo-500 rounded-xl group-hover:from-brand-500 group-hover:to-cyan-500 transition-all duration-300 shadow-sm"
              style={{ height: `${heightPct}%`, minHeight: count ? '8px' : '4px' }}
            />
            <span className="text-[10px] font-bold text-slate-400 mt-2 whitespace-nowrap">
              {d.day?.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [s, setS] = useState({});
  const [recentReports, setRecentReports] = useState([]);
  const [charts, setCharts] = useState({ byStatus: [], last7: [] });
  const [err, setErr] = useState('');
  const [hasTodayReport, setHasTodayReport] = useState(true);
  const [streakDays, setStreakDays] = useState(0);

  // Time & Date Filter State
  const [dateRange, setDateRange] = useState('7d'); // 'today', 'yesterday', '7d', '30d', 'custom'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loadingCharts, setLoadingCharts] = useState(false);

  // Quick Developer Ticket Status Update Modal state
  const [devModalTicket, setDevModalTicket] = useState(null);
  const [devModalAction, setDevModalAction] = useState(''); // 'qa' or 'resolve'
  const [devModalMsg, setDevModalMsg] = useState('');
  const [devModalSubmitting, setDevModalSubmitting] = useState(false);

  // Formatted date string
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Compute active range label for charts
  const rangeLabel = useMemo(() => {
    if (dateRange === 'today') return 'Today';
    if (dateRange === 'yesterday') return 'Yesterday';
    if (dateRange === '7d') return 'Past 7 Days';
    if (dateRange === '30d') return 'Past 30 Days';
    if (dateRange === 'custom') {
      if (customFrom && customTo) return `${customFrom} to ${customTo}`;
      return 'Custom Range';
    }
    return 'All Time';
  }, [dateRange, customFrom, customTo]);

  // Load initial Stats & Employee details
  const loadStats = () => {
    api.get('/dashboard/stats')
      .then((r) => {
        setS(r.data.summary || {});
        if (r.data.recent_reports) setRecentReports(r.data.recent_reports);
      })
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load dashboard metrics'));
  };

  useEffect(() => {
    loadStats();

    if (user.role === 'employee') {
      api.get('/reports', { params: { limit: 14 } }).then((r) => {
        const reports = r.data.reports || [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayExists = reports.some((rep) => rep.report_date?.slice(0, 10) === todayStr);
        setHasTodayReport(todayExists);

        const uniqueDates = new Set(reports.map((rep) => rep.report_date?.slice(0, 10)).filter(Boolean));
        setStreakDays(uniqueDates.size);
      }).catch(() => {});
    }
  }, [user.role]);

  const openDevModal = (ticket, action) => {
    setDevModalTicket(ticket);
    setDevModalAction(action);
    setDevModalMsg('');
  };

  const closeDevModal = () => {
    setDevModalTicket(null);
    setDevModalAction('');
    setDevModalMsg('');
  };

  const handleDevQuickStatus = async (ticketId, action, messageText = '') => {
    try {
      const endpoint = user.role === 'designer' ? '/design-requests' : '/dev-requests';
      if (action === 'start') {
        await api.post(`${endpoint}/${ticketId}/start-progress`);
      } else if (action === 'qa') {
        await api.post(`${endpoint}/${ticketId}/submit-qa`, { message: messageText || 'Submitted work for QA review.' });
      } else if (action === 'resolve') {
        await api.post(`${endpoint}/${ticketId}/resolve`, { message: messageText || 'Completed task.' });
      }
      closeDevModal();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request status');
    }
  };

  const handleDevModalSubmit = async (e) => {
    e.preventDefault();
    if (!devModalMsg.trim()) {
      alert('Please enter a brief note for the employee');
      return;
    }
    setDevModalSubmitting(true);
    await handleDevQuickStatus(devModalTicket.id, devModalAction, devModalMsg.trim());
    setDevModalSubmitting(false);
  };

  // Load Charts with active date filter
  const loadCharts = () => {
    setLoadingCharts(true);
    const params = { range: dateRange };
    if (dateRange === 'custom') {
      if (!customFrom || !customTo) {
        setLoadingCharts(false);
        return;
      }
      params.from = customFrom;
      params.to = customTo;
    }
    api.get('/dashboard/charts', { params })
      .then((r) => {
        setCharts({
          byStatus: r.data.byStatus || [],
          last7: r.data.trend || r.data.last7 || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoadingCharts(false));
  };

  useEffect(() => {
    loadCharts();
  }, [dateRange, customFrom, customTo]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner Hero */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        {/* Ambient background blur circles */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-brand-300 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-sm border border-white/10">
                {user.role === 'employee'
                  ? '🚀 SEO Specialist Workspace'
                  : user.role === 'developer'
                  ? '💻 Developer Engineering Hub'
                  : user.role === 'designer' || user.role === 'editor'
                  ? '✍️ Editor Visuals Hub'
                  : user.role === 'supervisor'
                  ? '👁️ Supervisor Command Workspace'
                  : '✨ Enterprise Workspace'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Live System</span>
              </span>
              {user.role === 'employee' && streakDays > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-[11px] font-extrabold border border-orange-500/30">
                  <span>🔥</span> {streakDays}-Day Reporting Streak
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Welcome back, {user.name}</span>
              <span className="inline-block animate-bounce">👋</span>
            </h1>

            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              {user.role === 'employee'
                ? 'Create, manage, and submit your daily SEO campaign logs, request developer bug fixes, and collaborate with your team lead.'
                : user.role === 'developer'
                ? 'Resolve technical requests, site speed, SSL, server bugs, and custom feature tasks assigned to you by employees & team leads.'
                : user.role === 'designer' || user.role === 'editor'
                ? 'Fulfill visual graphic requests, blog banners, infographics, video edits, and keyword assets assigned to you.'
                : user.role === 'supervisor'
                ? 'Monitor live team workload, inspect shared PDF/attachment files, review SEO campaign reports, track developer bug fixes and editor graphic tasks.'
                : 'Track real-time SEO operations, client report submissions, team squads, and developer requests in one hub.'}
            </p>

            <div className="pt-1 flex items-center gap-3 text-slate-400 text-xs font-semibold flex-wrap">
              <span>📅 {todayFormatted}</span>
              <span>•</span>
              <span className="capitalize text-brand-300 font-bold">Role: {user.role === 'designer' ? 'Editor' : user.role.replace('_', ' ')}</span>
              {s.team_name && (
                <>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">🗂️ Squad: {s.team_name}</span>
                </>
              )}
              {s.team_lead_name && (
                <>
                  <span>•</span>
                  <span className="text-indigo-300 font-bold">👑 Lead: {s.team_lead_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Action Buttons in Hero */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {user.role === 'supervisor' && (
              <>
                <Link
                  to="/supervisor"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 text-xs py-2.5 px-4 rounded-xl font-bold inline-flex items-center gap-1.5 transition-all"
                >
                  <span>👁️</span>
                  <span>Supervisor Hub</span>
                </Link>
                <Link
                  to="/reports"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-sm inline-flex items-center gap-1.5"
                >
                  <span>📄</span>
                  <span>All Reports</span>
                </Link>
                <Link
                  to="/dev-requests"
                  className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <span>🛠️</span>
                  <span>Dev Tickets</span>
                </Link>
                <Link
                  to="/design-requests"
                  className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <span>🎨</span>
                  <span>Editor Tasks</span>
                </Link>
              </>
            )}

            {user.role === 'employee' && (
              <>
                <Link
                  to="/reports/new"
                  className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-brand-500/25 font-bold inline-flex items-center gap-1.5"
                >
                  <span>➕</span>
                  <span>New SEO Report</span>
                </Link>
                <Link
                  to="/reports"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-sm inline-flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>My Reports</span>
                </Link>
              </>
            )}

            {user.role === 'developer' && (
              <>
                <Link
                  to="/dev-requests"
                  className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-brand-500/25 font-bold inline-flex items-center gap-1.5"
                >
                  <span>💻</span>
                  <span>Assigned Dev Tickets</span>
                </Link>
                <Link
                  to="/dev-requests?status=in_progress"
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-sm inline-flex items-center gap-1.5"
                >
                  <span>⚙️</span>
                  <span>In Progress Tasks</span>
                </Link>
              </>
            )}

            {(user.role === 'designer' || user.role === 'editor') && (
              <>
                <Link
                  to="/design-requests"
                  className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-brand-500/25 font-bold inline-flex items-center gap-1.5"
                >
                  <span>✍️</span>
                  <span>Assigned Editor Tasks</span>
                </Link>
                <Link
                  to="/design-requests?status=in_progress"
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-sm inline-flex items-center gap-1.5"
                >
                  <span>⚙️</span>
                  <span>In Progress Tasks</span>
                </Link>
              </>
            )}

            {['super_admin', 'admin'].includes(user.role) && (
              <>
                <Link
                  to="/supervisor"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg text-xs py-2.5 px-4 rounded-xl font-bold inline-flex items-center gap-1.5 transition-all"
                >
                  <span>👁️</span>
                  <span>Supervisor Hub</span>
                </Link>
                <Link
                  to="/reports"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-sm inline-flex items-center gap-1.5"
                >
                  <span>📬</span>
                  <span>Review Submissions</span>
                </Link>
                <Link
                  to="/users"
                  className="bg-brand-600 hover:bg-brand-700 text-white shadow-lg px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <span>👥</span>
                  <span>Manage Members</span>
                </Link>
              </>
            )}

            {user.role === 'team_lead' && (
              <Link
                to="/reports"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-sm inline-flex items-center gap-1.5"
              >
                <span>📑</span>
                <span>Review Team Reports</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Employee Today's Status Banner */}
      {user.role === 'employee' && (
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
          hasTodayReport
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-200'
            : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm shrink-0 ${
              hasTodayReport ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white animate-pulse'
            }`}>
              {hasTodayReport ? '✅' : '⏰'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900">
                  {hasTodayReport ? "Today's Daily Report Submitted!" : "Today's SEO Report is Pending Submission"}
                </h4>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  hasTodayReport ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200 text-amber-900'
                }`}>
                  {hasTodayReport ? 'Completed' : 'Action Required'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {hasTodayReport
                  ? "Great job! Your report has been logged and sent for Team Lead review. Keep up the high performance!"
                  : "You haven't submitted today's SEO report yet. Please log your keyword rankings, backlinks, and on-page work."}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {hasTodayReport ? (
              <Link
                to="/reports"
                className="text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-100 border border-emerald-300 px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>📋</span>
                <span>View Reports</span>
              </Link>
            ) : (
              <Link
                to="/reports/new"
                className="btn-primary text-xs py-2.5 px-5 font-bold shadow-md inline-flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Create Today's Report →</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {err && (
        <div className="alert-error flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{err}</span>
          </div>
          <button onClick={() => setErr('')} className="text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {user.role === 'supervisor' && (
          <>
            <StatCard label="Open Dev Tickets" value={s.open_dev_tickets} icon="🛠️" color="rose" subtitle="Active technical tasks" to="/dev-requests" badge="Dev Ops" />
            <StatCard label="Resolved Dev Fixes" value={s.resolved_dev_tickets} icon="🎉" color="emerald" subtitle="Completed technical fixes" to="/dev-requests" />
            <StatCard label="Open Editor Tasks" value={s.open_design_tickets} icon="🎨" color="amber" subtitle="Active graphic visual tasks" to="/design-requests" badge="Editor Ops" />
            <StatCard label="Completed Editor Visuals" value={s.resolved_design_tickets} icon="✅" color="emerald" subtitle="Finished graphics & banners" to="/design-requests" />
            <StatCard label="Total SEO Reports" value={s.total_reports} icon="📄" color="brand" subtitle="All campaign submissions" to="/reports" />
            <StatCard label="Pending TL Review" value={s.pending_tl} icon="⏳" color="amber" subtitle="Awaiting team lead review" to="/reports" />
            <StatCard label="Approved Reports" value={s.approved} icon="✅" color="indigo" subtitle="Verified and active" to="/reports" />
            <StatCard label="Supervisor Command Hub" value="Live" icon="👁️" color="indigo" subtitle="File hub & oversight" to="/supervisor" badge="Command Hub" />
          </>
        )}

        {user.role === 'super_admin' && (
          <>
            <StatCard label="Total Reports" value={s.total_reports} icon="📄" color="brand" subtitle="All-time created" to="/reports" />
            <StatCard label="Pending @ TL" value={s.pending_tl} icon="⏳" color="amber" subtitle="Awaiting team lead" to="/reports" badge="TL Queue" />
            <StatCard label="Pending @ Admin" value={s.pending_admin} icon="📬" color="indigo" subtitle="Needs admin review" to="/reports" badge="Admin Queue" />
            <StatCard label="Approved Reports" value={s.approved} icon="✅" color="emerald" subtitle="Passed review" to="/reports" />
            <StatCard label="Active Squads" value={s.teams} icon="🗂️" color="brand" subtitle="Organized teams" to="/teams" />
            <StatCard label="Open Dev Tickets" value={s.open_dev_tickets} icon="🛠️" color="rose" subtitle="Active technical tasks" to="/dev-requests" badge="Dev Ops" />
            <StatCard label="Team Leads" value={s.team_leads} icon="👑" color="indigo" subtitle="Squad leaders" to="/users" />
            <StatCard label="Developers" value={s.developers} icon="💻" color="emerald" subtitle="Technical team" to="/users" />
          </>
        )}

        {user.role === 'admin' && (
          <>
            <StatCard label="Pending Admin Review" value={s.pending_admin} icon="📬" color="amber" subtitle="Awaiting your approval" to="/reports" badge="Action Needed" />
            <StatCard label="Approved Reports" value={s.approved} icon="✅" color="emerald" subtitle="Verified and active" to="/reports" />
            <StatCard label="Active Squads" value={s.teams} icon="🗂️" color="indigo" subtitle="Campaign teams" to="/teams" />
            <StatCard label="Team Members" value={s.team_members} icon="👥" color="brand" subtitle="Staff & specialists" to="/users" />
            <StatCard label="Open Dev Tickets" value={s.open_dev_tickets} icon="🛠️" color="rose" subtitle="Technical blockers" to="/dev-requests" badge="Dev Ops" />
            <StatCard label="Resolved Dev Fixes" value={s.resolved_dev_tickets} icon="🎉" color="emerald" subtitle="Completed technical fixes" to="/dev-requests" />
          </>
        )}

        {user.role === 'team_lead' && (
          <>
            <StatCard label="Pending Squad Review" value={s.pending_review} icon="⏳" color="amber" subtitle="Awaiting your review" to="/reports" badge="Action Needed" />
            <StatCard label="Forwarded to Admin" value={s.forwarded} icon="⏩" color="indigo" subtitle="Sent for final sign-off" to="/reports" />
            <StatCard label="Approved by Admin" value={s.approved} icon="✅" color="emerald" subtitle="Completed reports" to="/reports" />
            <StatCard label="My Squad Members" value={s.my_employees} icon="👥" color="brand" subtitle="Assigned SEO staff" to="/teams" />
            <StatCard label="Open Dev Requests" value={s.open_dev_tickets} icon="🛠️" color="rose" subtitle="Squad dev tickets" to="/dev-requests" />
          </>
        )}

        {user.role === 'employee' && (
          <>
            <StatCard label="Total Reports" value={s.total} icon="📄" color="brand" subtitle="All submissions" to="/reports" />
            <StatCard label="In Review @ TL" value={s.submitted} icon="⏳" color="amber" subtitle="Pending TL sign-off" to="/reports" badge="In Review" />
            <StatCard label="Approved Reports" value={s.approved} icon="✅" color="emerald" subtitle="Verified & approved" to="/reports" badge="Passed" />
            <StatCard label="My Dev Tickets" value={s.open_dev_tickets} icon="🛠️" color="rose" subtitle="Requested fixes" to="/dev-requests" />
          </>
        )}

        {user.role === 'developer' && (
          <>
            <StatCard label="Assigned to Me" value={s.total_assigned} icon="💻" color="brand" subtitle="Total dev tickets" to="/dev-requests" />
            <StatCard label="In Progress" value={s.in_progress} icon="⚙️" color="amber" subtitle="Active working tasks" to="/dev-requests" badge="In Work" />
            <StatCard label="Under QA / Testing" value={s.under_qa} icon="🔍" color="indigo" subtitle="Submitted for review" to="/dev-requests" badge="Review" />
            <StatCard label="Resolved Fixes" value={s.resolved} icon="✅" color="emerald" subtitle="Fixed & closed" to="/dev-requests" badge="Fixed" />
          </>
        )}

        {user.role === 'designer' && (
          <>
            <StatCard label="Assigned to Me" value={s.total_assigned} icon="✍️" color="brand" subtitle="Total editor tasks" to="/design-requests" />
            <StatCard label="In Progress Visuals" value={s.in_progress} icon="🎨" color="amber" subtitle="Active graphic tasks" to="/design-requests" badge="In Work" />
            <StatCard label="Under Review / QA" value={s.under_qa} icon="🔍" color="indigo" subtitle="Submitted for review" to="/design-requests" badge="Review" />
            <StatCard label="Completed Visuals" value={s.resolved} icon="✅" color="emerald" subtitle="Approved & done" to="/design-requests" badge="Completed" />
          </>
        )}
      </div>

      {/* Employee Recent Reports Table (Shown if employee) */}
      {user.role === 'employee' && recentReports.length > 0 && (
        <div className="card p-0 overflow-hidden bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-0">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <span>📑</span>
                <span>My Recent Report Submissions</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Quick status overview of your latest campaign submissions</p>
            </div>
            <Link
              to="/reports"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-all"
            >
              View All Reports ➔
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-left">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Report Date</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Client / Target</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReports.map((r) => {
                  const statusBadges = {
                    draft: 'bg-slate-100 text-slate-700 border-slate-200',
                    submitted: 'bg-blue-50 text-blue-700 border-blue-200',
                    tl_rejected: 'bg-amber-50 text-amber-700 border-amber-200',
                    forwarded: 'bg-purple-50 text-purple-700 border-purple-200',
                    admin_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    admin_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
                  };
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800 text-xs">
                        📅 {r.report_date ? new Date(r.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <p className="font-bold text-slate-800">{r.client_name || r.title || 'SEO Campaign Log'}</p>
                        {r.website_url && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{r.website_url}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          statusBadges[r.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          <span>{STATUS_LABEL[r.status] || r.status}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/reports/${r.id}`}
                          className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1 rounded-lg transition-colors inline-block"
                        >
                          View Details ➔
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DEVELOPER WORKLOAD & ASSIGNED DEV TICKETS FEED */}
      {user.role === 'developer' && (
        <div className="card p-6 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 rounded-3xl shadow-xl text-white space-y-6 relative overflow-hidden">
          {/* Subtle Cyber Glow background accents */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-extrabold uppercase tracking-wider border border-brand-500/30">
                  ⚡ Engineering Workload
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  {recentReports.length} Active Tickets
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>💻</span>
                <span>My Active Developer Requests</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Technical tickets assigned to you. Update status directly or start work.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={loadStats}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔄</span> Refresh Feed
              </button>
              <Link
                to="/dev-requests"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>All Tickets ➔</span>
              </Link>
            </div>
          </div>

          {/* Ticket Grid */}
          {recentReports.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl mx-auto mb-3 text-emerald-400">
                🎉
              </div>
              <h3 className="text-sm font-black text-slate-200">All Caught Up! No Active Pending Tickets</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                You have no active developer requests waiting for work or QA. Great job keeping the queue clear!
              </p>
              <Link
                to="/dev-requests"
                className="mt-4 inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
              >
                Browse Ticket History ➔
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
              {recentReports.map((t) => {
                const statusInfo = DEV_STATUS_MAP[t.status] || { label: t.status, cls: 'bg-slate-800 text-slate-300 border-slate-700' };
                const priorityStyles = {
                  high: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                  low: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                };
                return (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-brand-500/50 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 group backdrop-blur-sm"
                  >
                    <div className="space-y-3">
                      {/* Category & Priority Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                          {devCategoryLabel(t.category)}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${priorityStyles[t.priority] || priorityStyles.medium}`}>
                          {t.priority || 'medium'}
                        </span>
                      </div>

                      {/* Ticket Title */}
                      <div>
                        <Link
                          to={`/dev-requests/${t.id}`}
                          className="font-extrabold text-sm text-slate-100 hover:text-brand-300 transition-colors line-clamp-2 leading-snug"
                        >
                          {t.title}
                        </Link>
                        {t.client_name && (
                          <p className="text-[11px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                            <span>🏢 Client:</span>
                            <span className="text-slate-300 font-bold">{t.client_name}</span>
                          </p>
                        )}
                      </div>

                      {/* Raised By Employee & Date */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>👤</span>
                          <span className="text-slate-300 font-semibold">{t.employee_name || 'Staff Member'}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill & Quick Action Bar */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        {['forwarded', 'reopened'].includes(t.status) && (
                          <button
                            onClick={() => handleDevQuickStatus(t.id, 'start')}
                            className="col-span-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>⚙️ Start Work</span>
                          </button>
                        )}

                        {t.status === 'in_progress' && (
                          <>
                            <button
                              onClick={() => openDevModal(t, 'qa')}
                              className="py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>🔍 Submit QA</span>
                            </button>
                            <button
                              onClick={() => openDevModal(t, 'resolve')}
                              className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>✅ Resolve</span>
                            </button>
                          </>
                        )}

                        {t.status === 'under_qa' && (
                          <button
                            onClick={() => openDevModal(t, 'resolve')}
                            className="col-span-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>✅ Mark as Resolved</span>
                          </button>
                        )}

                        {/* Details */}
                        <Link
                          to={`/dev-requests/${t.id}`}
                          className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] text-center transition-all border border-slate-700"
                        >
                          Details ➔
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EDITOR WORKLOAD & ASSIGNED DESIGN TICKETS FEED */}
      {user.role === 'designer' && (
        <div className="card p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl shadow-xl text-white space-y-6 relative overflow-hidden">
          {/* Subtle Cyber Glow background accents */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase tracking-wider border border-purple-500/30">
                  ✍️ Editor Workload
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  {recentReports.length} Active Tasks
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>🎨</span>
                <span>My Active Editor Requests & Visuals</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Graphic, banner, and video tasks assigned to you. Update status directly or start work.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={loadStats}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔄</span> Refresh Feed
              </button>
              <Link
                to="/design-requests"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>All Editor Tasks ➔</span>
              </Link>
            </div>
          </div>

          {/* Ticket Grid */}
          {recentReports.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl mx-auto mb-3 text-emerald-400">
                🎉
              </div>
              <h3 className="text-sm font-black text-slate-200">All Caught Up! No Active Pending Editor Tasks</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                You have no active graphic visual requests waiting for work or review. Great job keeping the queue clear!
              </p>
              <Link
                to="/design-requests"
                className="mt-4 inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
              >
                Browse Editor Task History ➔
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
              {recentReports.map((t) => {
                const priorityStyles = {
                  urgent: 'bg-red-500/20 text-red-300 border-red-500/30 font-black',
                  high: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                  low: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                };
                return (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 group backdrop-blur-sm"
                  >
                    <div className="space-y-3">
                      {/* Category & Priority Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-800 text-purple-300 border border-slate-700 flex items-center gap-1.5">
                          ✍️ {t.category || 'Graphic Request'}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${priorityStyles[t.priority] || priorityStyles.medium}`}>
                          {t.priority || 'medium'}
                        </span>
                      </div>

                      {/* Ticket Title */}
                      <div>
                        <Link
                          to={`/design-requests/${t.id}`}
                          className="font-extrabold text-sm text-slate-100 hover:text-brand-300 transition-colors line-clamp-2 leading-snug"
                        >
                          {t.title || `${t.category} Visual`}
                        </Link>
                        {t.client_name && (
                          <p className="text-[11px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                            <span>🏢 Client:</span>
                            <span className="text-slate-300 font-bold">{t.client_name}</span>
                          </p>
                        )}
                        {t.blog_category && (
                          <p className="text-[10px] font-semibold text-indigo-400 mt-1">
                            Sub-Category: {t.blog_category}
                          </p>
                        )}
                      </div>

                      {/* Raised By Employee & Date */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>👤</span>
                          <span className="text-slate-300 font-semibold">{t.employee_name || 'Staff Member'}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill & Quick Action Bar */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                          {t.status}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        {['forwarded', 'reopened'].includes(t.status) && (
                          <button
                            onClick={() => handleDevQuickStatus(t.id, 'start')}
                            className="col-span-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>🎨 Start Work</span>
                          </button>
                        )}

                        {t.status === 'in_progress' && (
                          <>
                            <button
                              onClick={() => openDevModal(t, 'qa')}
                              className="py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>🔍 Submit QA</span>
                            </button>
                            <button
                              onClick={() => openDevModal(t, 'resolve')}
                              className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>✅ Resolve</span>
                            </button>
                          </>
                        )}

                        {t.status === 'under_qa' && (
                          <button
                            onClick={() => openDevModal(t, 'resolve')}
                            className="col-span-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>✅ Mark Completed</span>
                          </button>
                        )}

                        {/* Details */}
                        <Link
                          to={`/design-requests/${t.id}`}
                          className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] text-center transition-all border border-slate-700"
                        >
                          Details ➔
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DATE & TIME FILTER TOOLBAR */}
      <div className="card p-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-bold">
            📅
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900">Analytics Time Filter</h3>
            <p className="text-[11px] text-slate-400">Filter reports distribution and timeline by date</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' },
              { key: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setDateRange(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateRange === p.key
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers when 'custom' is active */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input
                type="date"
                className="input py-1 px-2.5 text-xs rounded-xl bg-slate-50 border-slate-200 w-36"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                className="input py-1 px-2.5 text-xs rounded-xl bg-slate-50 border-slate-200 w-36"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}

          {loadingCharts && (
            <span className="text-xs font-bold text-brand-600 animate-pulse">
              Loading...
            </span>
          )}
        </div>
      </div>

      {/* Charts & Analytics Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports Status Distribution */}
        <div className="card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <span>📊</span>
                <span>Reports Status Distribution</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Showing status breakdown for: <strong className="text-slate-700">{rangeLabel}</strong></p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {rangeLabel}
            </span>
          </div>
          <StatusChart data={charts.byStatus} rangeLabel={rangeLabel} />
        </div>

        {/* Trend Volume Chart */}
        <div className="card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <span>📈</span>
                <span>Submission Volume Trend</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily activity counts for: <strong className="text-slate-700">{rangeLabel}</strong></p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {rangeLabel}
            </span>
          </div>
          <TrendChart data={charts.last7} rangeLabel={rangeLabel} />
        </div>
      </div>

      {/* Quick Navigation Hub & Shortcuts (Tailored per role) */}
      <div className="card p-6 bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200/90 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
              <span>⚡</span>
              <span>Quick Command Center</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Fast shortcuts to essential tools and daily workflows</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {user.role === 'employee' ? (
            <>
              <Link
                to="/reports/new"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  ➕
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  Submit New Report
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Log today's keyword work, backlink submissions, and SEO progress.</p>
              </Link>

              <Link
                to="/reports"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  📋
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  My Report History
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">View all past submissions, review TL feedback, and export records.</p>
              </Link>

              <Link
                to="/dev-requests"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  🛠️
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  Request Developer Fix
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Submit technical tickets for site speed, DNS, hosting, or schema errors.</p>
              </Link>

            </>
          ) : user.role === 'developer' ? (
            <>
              <Link
                to="/dev-requests"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  💻
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  Assigned Dev Tickets
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Manage all assigned developer tasks, update status, and review QA.</p>
              </Link>

              <Link
                to="/dev-requests?status=in_progress"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  ⚙️
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  In-Progress Tasks
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Jump straight to your active development workload and code fixes.</p>
              </Link>

              <Link
                to="/dev-requests?status=under_qa"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  🔍
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  QA Review Queue
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Review tickets submitted for employee testing and verification.</p>
              </Link>

            </>
          ) : user.role === 'designer' ? (
            <>
              <Link
                to="/design-requests"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  ✍️
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  Assigned Editor Tasks
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Manage all graphic visuals, blog banners, On-Page graphics, and keyword assets.</p>
              </Link>

              <Link
                to="/design-requests?status=in_progress"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  ⚙️
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  In-Progress Visuals
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Jump straight to your active graphic design and video editing workload.</p>
              </Link>

              <Link
                to="/design-requests?status=under_qa"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  🔍
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  QA Review Queue
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Inspect completed visual assets submitted for employee testing & approval.</p>
              </Link>

            </>
          ) : ['supervisor', 'super_admin', 'admin'].includes(user.role) ? (
            <>
              <Link
                to="/supervisor"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  👁️
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  Supervisor Command Hub
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Live team oversight, shared files & PDF hub, ticket activity monitoring.</p>
              </Link>

              <Link
                to="/design-requests"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  🎨
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  Editor Visual Requests
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Track graphic design, blog banners, and On-Page visual assets.</p>
              </Link>

              <Link
                to="/dev-requests"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  🛠️
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  Developer Tickets
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Track speed, hosting, SSL, and custom technical bug fixes.</p>
              </Link>

              <Link
                to="/reports"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  📄
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  All SEO Reports
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Review Submitted, Forwarded, and Approved employee campaign reports.</p>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/dev-requests"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  🛠️
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  Developer Requests
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Submit technical tickets, log speed/DNS issues, track QA.</p>
              </Link>

              <Link
                to="/teams"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                  🗂️
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
                  Campaign Squads
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Organize SEO specialists and manage team leadership rosters.</p>
              </Link>


            </>
          )}
        </div>
      </div>

      {/* Quick Developer Action Modal */}
      {devModalTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <span>{devModalAction === 'resolve' ? '✅ Resolve Request' : '🔍 Submit for QA'}</span>
              </h3>
              <button onClick={closeDevModal} className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Updating ticket: <strong className="text-brand-300">"{devModalTicket.title}"</strong>
            </p>

            <form onSubmit={handleDevModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {devModalAction === 'resolve'
                    ? 'Resolution Note (sent to employee in chat & notification):'
                    : 'QA Submission Note for Employee:'}
                </label>
                <textarea
                  rows={3}
                  required
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 text-xs text-white p-3 focus:border-brand-500 focus:outline-none"
                  placeholder={
                    devModalAction === 'resolve'
                      ? 'Describe what was fixed (e.g., DNS A records updated, SSL renewed, page speed cached)...'
                      : 'Provide instructions for the employee to test the changes...'
                  }
                  value={devModalMsg}
                  onChange={(e) => setDevModalMsg(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeDevModal}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={devModalSubmitting}
                  className={`px-5 py-2 rounded-xl font-extrabold text-xs text-white shadow-lg transition-all cursor-pointer ${
                    devModalAction === 'resolve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {devModalSubmitting ? 'Submitting...' : devModalAction === 'resolve' ? 'Resolve & Notify' : 'Submit for QA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
