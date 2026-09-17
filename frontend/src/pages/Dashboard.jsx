import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function StatCard({ label, value, color = 'brand', icon = '📊', subtitle, to, badge }) {
  const themes = {
    brand: {
      gradient: 'from-blue-600 to-indigo-600',
      text: 'text-brand-600',
      bgLight: 'bg-brand-50/60',
      border: 'border-brand-200/80',
      badge: 'bg-brand-50 text-brand-700 border-brand-200',
      accent: 'via-brand-500',
    },
    emerald: {
      gradient: 'from-emerald-600 to-teal-600',
      text: 'text-emerald-600',
      bgLight: 'bg-emerald-50/60',
      border: 'border-emerald-200/80',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      accent: 'via-emerald-500',
    },
    amber: {
      gradient: 'from-amber-500 to-orange-500',
      text: 'text-amber-600',
      bgLight: 'bg-amber-50/60',
      border: 'border-amber-200/80',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      accent: 'via-amber-500',
    },
    indigo: {
      gradient: 'from-indigo-600 to-purple-600',
      text: 'text-indigo-600',
      bgLight: 'bg-indigo-50/60',
      border: 'border-indigo-200/80',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      accent: 'via-indigo-500',
    },
    rose: {
      gradient: 'from-rose-500 to-pink-600',
      text: 'text-rose-600',
      bgLight: 'bg-rose-50/60',
      border: 'border-rose-200/80',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      accent: 'via-rose-500',
    },
    slate: {
      gradient: 'from-slate-700 to-slate-900',
      text: 'text-slate-800',
      bgLight: 'bg-slate-50/60',
      border: 'border-slate-200/80',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      accent: 'via-slate-400',
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

function StatusChart({ data }) {
  const total = data.reduce((acc, d) => acc + (parseInt(d.count, 10) || 0), 0);
  const max = Math.max(1, ...data.map((d) => d.count));

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl mb-2.5">
          📋
        </div>
        <p className="text-xs font-bold text-slate-700">No report status data yet</p>
        <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
          Reports created across teams will automatically visualize their lifecycle distribution here.
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

function WeekChart({ data }) {
  const total = data.reduce((acc, d) => acc + (parseInt(d.count, 10) || 0), 0);
  const max = Math.max(1, ...data.map((d) => d.count));

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl mb-2.5">
          📈
        </div>
        <p className="text-xs font-bold text-slate-700">No submissions in the last 7 days</p>
        <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
          Daily SEO campaign progress and submitted logs will show live volume spikes here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-3 h-40 pt-4">
      {data.map((d) => {
        const count = parseInt(d.count, 10) || 0;
        const heightPct = (count / max) * 100;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full group">
            <span className="text-[11px] font-extrabold text-slate-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {count}
            </span>
            <div
              className="w-full bg-gradient-to-t from-brand-600 to-indigo-500 rounded-xl group-hover:from-brand-500 group-hover:to-cyan-500 transition-all duration-300 shadow-sm"
              style={{ height: `${heightPct}%`, minHeight: count ? '8px' : '4px' }}
            />
            <span className="text-[10px] font-bold text-slate-400 mt-2">
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
  const [charts, setCharts] = useState({ byStatus: [], last7: [] });
  const [err, setErr] = useState('');
  const [hasTodayReport, setHasTodayReport] = useState(true);
  const [streakDays, setStreakDays] = useState(0);

  // Formatted date
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((r) => setS(r.data.summary || {}))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load dashboard metrics'));

    api.get('/dashboard/charts')
      .then((r) => setCharts({ byStatus: r.data.byStatus || [], last7: r.data.last7 || [] }))
      .catch(() => {});

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
                ✨ Enterprise Workspace
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
              Track real-time SEO operations, client report submissions, team squads, and developer requests in one hub.
            </p>

            <div className="pt-1 flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <span>📅 {todayFormatted}</span>
              <span>•</span>
              <span className="capitalize text-brand-300 font-bold">Role: {user.role.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Quick Action Buttons in Hero */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {user.role === 'employee' && (
              <Link
                to="/reports/new"
                className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-brand-500/20 font-bold inline-flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>New SEO Report</span>
              </Link>
            )}

            {['super_admin', 'admin'].includes(user.role) && (
              <>
                <Link
                  to="/forwarded-reports"
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
                to="/forwarded-reports"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-sm inline-flex items-center gap-1.5"
              >
                <span>📑</span>
                <span>Review Team Reports</span>
              </Link>
            )}

            <Link
              to="/dev-requests"
              className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
            >
              <span>🛠️</span>
              <span>Dev Tickets</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Employee Pending Report Alert Banner */}
      {user.role === 'employee' && !hasTodayReport && (
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
              ⏰
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Today's Daily SEO Report is Pending</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                You haven't submitted your report for today yet. Keep your daily reporting streak going!
              </p>
            </div>
          </div>
          <Link
            to="/reports/new"
            className="btn-primary text-xs shrink-0 self-start sm:self-auto shadow-md py-2 px-4"
          >
            + Create Today's Report →
          </Link>
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
        {user.role === 'super_admin' && (
          <>
            <StatCard label="Total Reports" value={s.total_reports} icon="📄" color="brand" subtitle="All-time created" to="/reports" />
            <StatCard label="Pending @ TL" value={s.pending_tl} icon="⏳" color="amber" subtitle="Awaiting team lead" to="/forwarded-reports" badge="TL Queue" />
            <StatCard label="Pending @ Admin" value={s.pending_admin} icon="📬" color="indigo" subtitle="Needs admin review" to="/forwarded-reports" badge="Admin Queue" />
            <StatCard label="Approved Reports" value={s.approved} icon="✅" color="emerald" subtitle="Passed review" to="/reports" />
            <StatCard label="Active Squads" value={s.teams} icon="🗂️" color="brand" subtitle="Organized teams" to="/teams" />
            <StatCard label="Open Dev Tickets" value={s.open_dev_tickets} icon="🛠️" color="rose" subtitle="Active technical tasks" to="/dev-requests" badge="Dev Ops" />
            <StatCard label="Team Leads" value={s.team_leads} icon="👑" color="indigo" subtitle="Squad leaders" to="/users" />
            <StatCard label="Developers" value={s.developers} icon="💻" color="emerald" subtitle="Technical team" to="/users" />
          </>
        )}

        {user.role === 'admin' && (
          <>
            <StatCard label="Pending Admin Review" value={s.pending_admin} icon="📬" color="amber" subtitle="Awaiting your approval" to="/forwarded-reports" badge="Action Needed" />
            <StatCard label="Approved Reports" value={s.approved} icon="✅" color="emerald" subtitle="Verified and active" to="/forwarded-reports" />
            <StatCard label="Active Squads" value={s.teams} icon="🗂️" color="indigo" subtitle="Campaign teams" to="/teams" />
            <StatCard label="Team Members" value={s.team_members} icon="👥" color="brand" subtitle="Staff & specialists" to="/users" />
            <StatCard label="Open Dev Tickets" value={s.open_dev_tickets} icon="🛠️" color="rose" subtitle="Technical blockers" to="/dev-requests" badge="Dev Ops" />
            <StatCard label="Resolved Dev Fixes" value={s.resolved_dev_tickets} icon="🎉" color="emerald" subtitle="Completed technical fixes" to="/dev-requests" />
          </>
        )}

        {user.role === 'team_lead' && (
          <>
            <StatCard label="Pending Squad Review" value={s.pending_review} icon="⏳" color="amber" subtitle="Awaiting your review" to="/forwarded-reports" badge="Action Needed" />
            <StatCard label="Forwarded to Admin" value={s.forwarded} icon="⏩" color="indigo" subtitle="Sent for final sign-off" to="/forwarded-reports" />
            <StatCard label="Approved by Admin" value={s.approved} icon="✅" color="emerald" subtitle="Completed reports" to="/forwarded-reports" />
            <StatCard label="My Squad Members" value={s.my_employees} icon="👥" color="brand" subtitle="Assigned SEO staff" to="/teams" />
            <StatCard label="Open Dev Requests" value={s.open_dev_tickets} icon="🛠️" color="rose" subtitle="Squad dev tickets" to="/dev-requests" />
          </>
        )}

        {user.role === 'employee' && (
          <>
            <StatCard label="Draft Reports" value={s.drafts} icon="📝" color="slate" subtitle="In-progress drafts" to="/reports" />
            <StatCard label="Submitted to TL" value={s.submitted} icon="⏳" color="amber" subtitle="Awaiting TL approval" to="/reports" />
            <StatCard label="Approved Reports" value={s.approved} icon="✅" color="emerald" subtitle="Fully signed-off" to="/reports" />
            <StatCard label="My Dev Tickets" value={s.open_dev_tickets} icon="🛠️" color="indigo" subtitle="Requested technical tasks" to="/dev-requests" />
          </>
        )}

        {user.role === 'developer' && (
          <>
            <StatCard label="Assigned to Me" value={s.total_assigned} icon="💻" color="brand" subtitle="Total dev tickets" to="/dev-requests" />
            <StatCard label="In Progress" value={s.in_progress} icon="⚙️" color="amber" subtitle="Currently working on" to="/dev-requests" badge="In Work" />
            <StatCard label="Under QA / Testing" value={s.under_qa} icon="🔍" color="indigo" subtitle="Submitted for review" to="/dev-requests" />
            <StatCard label="Resolved Tickets" value={s.resolved} icon="✅" color="emerald" subtitle="Fixed and verified" to="/dev-requests" />
          </>
        )}
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
              <p className="text-xs text-slate-400 mt-0.5">Real-time status breakdown across campaigns</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Live Flow
            </span>
          </div>
          <StatusChart data={charts.byStatus} />
        </div>

        {/* 7-Day Submission Trend */}
        <div className="card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <span>📈</span>
                <span>7-Day Submission Trend</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily activity volume over the past week</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              Weekly Activity
            </span>
          </div>
          <WeekChart data={charts.last7} />
        </div>
      </div>

      {/* Quick Navigation Hub & Shortcuts */}
      <div className="card p-6 bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200/90 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
              <span>⚡</span>
              <span>Quick Command Center</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Fast shortcuts to essential tools and workflows</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

          <Link
            to="/chat"
            className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
              💬
            </div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
              Live Team Chat
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">Real-time messaging, channels, direct chats, and voice notes.</p>
          </Link>

          <Link
            to="/notes"
            className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
              📝
            </div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-brand-600 transition-colors">
              Daily Notes & Scratchpad
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">Store personal strategies, quick links, and campaign notes.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
