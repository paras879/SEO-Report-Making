import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function Stat({ label, value, color = 'brand', icon = '📊' }) {
  const themes = {
    brand: { text: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100', iconBg: 'bg-brand-500/10 text-brand-600' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-500/10 text-emerald-600' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500/10 text-amber-600' },
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', iconBg: 'bg-indigo-500/10 text-indigo-600' },
    slate: { text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-100', iconBg: 'bg-slate-500/10 text-slate-600' },
  };
  const t = themes[color] || themes.brand;

  return (
    <div className="card hover:shadow-card-hover transition-all duration-200 relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-xl ${t.iconBg} flex items-center justify-center text-sm font-semibold`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-extrabold mt-3 tracking-tight ${t.text}`}>
        {value ?? 0}
      </p>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent group-hover:via-brand-500 transition-all duration-300" />
    </div>
  );
}

const STATUS_LABEL = {
  draft: 'Draft', submitted: 'Submitted', tl_rejected: 'Returned (TL)',
  forwarded: 'Forwarded', admin_rejected: 'Returned (Admin)', admin_approved: 'Approved',
};
const STATUS_COLOR = {
  draft: 'from-slate-400 to-slate-500',
  submitted: 'from-blue-500 to-indigo-600',
  tl_rejected: 'from-amber-500 to-orange-500',
  forwarded: 'from-indigo-500 to-purple-600',
  admin_rejected: 'from-orange-500 to-rose-600',
  admin_approved: 'from-emerald-500 to-teal-600',
};

// Simple horizontal bar chart (no external lib)
function StatusChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <span className="text-3xl mb-2">📋</span>
        <p className="text-sm font-medium">No report data recorded yet</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.status} className="flex items-center gap-3 text-xs">
          <span className="w-32 font-semibold text-slate-600 shrink-0 truncate">
            {STATUS_LABEL[d.status] || d.status}
          </span>
          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${STATUS_COLOR[d.status] || 'from-brand-500 to-brand-600'} transition-all duration-500`}
              style={{ width: `${(d.count / max) * 100}%`, minWidth: d.count ? '0.75rem' : 0 }}
            />
          </div>
          <span className="w-8 font-bold text-slate-800 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// Last 7 days vertical bars
function WeekChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <span className="text-3xl mb-2">📊</span>
        <p className="text-sm font-medium">No activity in the last 7 days</p>
      </div>
    );
  }
  return (
    <div className="flex items-end justify-between gap-3 h-36 pt-4">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full group">
          <span className="text-[11px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {d.count}
          </span>
          <div
            className="w-full bg-gradient-to-t from-brand-600 to-indigo-500 rounded-lg group-hover:shadow-glow transition-all duration-300"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? '6px' : '3px' }}
          />
          <span className="text-[10px] font-semibold text-slate-400 mt-2">
            {d.day?.slice(5)}
          </span>
        </div>
      ))}
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

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setS(r.data.summary || {}))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load stats'));
    api.get('/dashboard/charts').then((r) => setCharts({ byStatus: r.data.byStatus || [], last7: r.data.last7 || [] }))
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
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-600/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-brand-300 text-xs font-bold uppercase tracking-wider">
              <span>✨</span> Workspace Overview
            </div>
            {user.role === 'employee' && streakDays > 0 && (
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-extrabold border border-orange-500/30">
                <span>🔥</span> {streakDays}-Day Activity Streak
              </div>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user.name} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
            Here is what is happening across your SEO campaigns, team submissions, and daily reports today.
          </p>
        </div>
      </div>

      {/* Employee Pending Report Alert Banner */}
      {user.role === 'employee' && !hasTodayReport && (
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
              ⏰
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Today's Daily SEO Report is Pending</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                You haven't submitted your report for today yet. Keep your daily reporting streak going!
              </p>
            </div>
          </div>
          <Link
            to="/reports/new"
            className="btn-primary text-xs shrink-0 self-start sm:self-auto shadow-md"
          >
            + Create Today's Report →
          </Link>
        </div>
      )}

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {user.role === 'super_admin' && (
          <>
            <Stat label="Total Admins" value={s.admins} icon="🛡️" color="brand" />
            <Stat label="Team Leads" value={s.team_leads} icon="🎖️" color="indigo" />
            <Stat label="Employees" value={s.employees} icon="👥" color="emerald" />
            <Stat label="Active Teams" value={s.teams} icon="🗂️" color="slate" />
            <Stat label="Total Reports" value={s.total_reports} icon="📄" color="brand" />
            <Stat label="Pending @ TL" value={s.pending_tl} icon="⏳" color="amber" />
            <Stat label="Pending @ Admin" value={s.pending_admin} icon="📬" color="indigo" />
            <Stat label="Approved Reports" value={s.approved} icon="✅" color="emerald" />
          </>
        )}
        {user.role === 'admin' && (
          <>
            <Stat label="Pending Review" value={s.pending_admin} icon="⏳" color="amber" />
            <Stat label="Approved Reports" value={s.approved} icon="✅" color="emerald" />
            <Stat label="Returned Reports" value={s.returned} icon="↩️" color="indigo" />
            <Stat label="Active Teams" value={s.teams} icon="🗂️" color="slate" />
          </>
        )}
        {user.role === 'team_lead' && (
          <>
            <Stat label="Pending Review" value={s.pending_review} icon="⏳" color="amber" />
            <Stat label="Forwarded to Admin" value={s.forwarded} icon="⏩" color="indigo" />
            <Stat label="Approved Reports" value={s.approved} icon="✅" color="emerald" />
            <Stat label="My Team Members" value={s.my_employees} icon="👥" color="slate" />
          </>
        )}
        {user.role === 'employee' && (
          <>
            <Stat label="Draft Reports" value={s.drafts} icon="📝" color="slate" />
            <Stat label="Submitted to TL" value={s.submitted} icon="⏳" color="indigo" />
            <Stat label="Returned Revision" value={s.returned} icon="⚠️" color="amber" />
            <Stat label="Approved Reports" value={s.approved} icon="✅" color="emerald" />
          </>
        )}
        {user.role === 'developer' && (
          <>
            <Stat label="Assigned to Me" value={s.total_assigned} icon="🛠️" color="brand" />
            <Stat label="Open / Pending" value={s.pending} icon="⏳" color="amber" />
            <Stat label="Resolved" value={s.resolved} icon="✅" color="emerald" />
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-800 tracking-tight">Reports Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Status breakdown of all campaigns</p>
            </div>
            <span className="text-lg">📊</span>
          </div>
          <StatusChart data={charts.byStatus} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-800 tracking-tight">7-Day Submission Volume</h3>
              <p className="text-xs text-slate-400 mt-0.5">Activity trend for the past week</p>
            </div>
            <span className="text-lg">📈</span>
          </div>
          <WeekChart data={charts.last7} />
        </div>
      </div>
    </div>
  );
}
