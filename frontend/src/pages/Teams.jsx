import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [leads, setLeads] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', team_lead_id: '' });
  const [err, setErr] = useState('');
  const canManage = ['super_admin', 'admin'].includes(user.role);

  const load = () => {
    api.get('/teams').then((r) => setTeams(r.data.teams)).catch(() => {});
    if (canManage) api.get('/users?role=team_lead').then((r) => setLeads(r.data.users)).catch(() => {});
  };
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const payload = { ...form };
      if (!payload.team_lead_id) delete payload.team_lead_id;
      else payload.team_lead_id = Number(payload.team_lead_id);
      await api.post('/teams', payload);
      setForm({ name: '', description: '', team_lead_id: '' });
      setShow(false);
      load();
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {user.role === 'team_lead' ? 'My Team Squad' : 'Campaign Teams & Squads'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Organize employees and projects under dedicated leadership</p>
        </div>
        {canManage && (
          <button className={show ? 'btn-secondary' : 'btn-primary'} onClick={() => setShow(!show)}>
            <span>{show ? '✕ Cancel' : '➕ Create New Team'}</span>
          </button>
        )}
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {show && canManage && (
        <div className="card shadow-card-hover border-brand-200/80 bg-gradient-to-b from-white to-slate-50/50">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h2 className="font-bold text-base text-slate-800">Create New Team</h2>
            <span className="text-xs text-slate-400">Team Structure</span>
          </div>
          <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Team Name</label>
              <input className="input" placeholder="e.g. SEO Content Squad Alpha" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Designated Team Lead</label>
              <select className="input" value={form.team_lead_id} onChange={(e) => setForm({ ...form, team_lead_id: e.target.value })} disabled={leads.length === 0}>
                <option value="">{leads.length === 0 ? 'No Team Lead created yet' : '-- Select Team Lead (Optional) --'}</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.name} (@{l.username})</option>)}
              </select>
              {leads.length === 0 ? (
                <p className="text-[11px] text-amber-600 mt-1.5 leading-tight">
                  First create a "Team Lead" user from the <Link to="/users" className="underline font-bold">Users page</Link>, then assign them here.
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1.5 leading-tight">Choose a team lead (can be reassigned anytime).</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="label">Description / Scope of Work</label>
              <input className="input" placeholder="e.g. Handles technical SEO, backlink outreach, and client reporting for SaaS brands" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2 pt-2">
              <button className="btn-primary py-2.5 px-6">
                <span>Create Team</span>
                <span>➔</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teams Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map((t) => (
          <Link
            to={`/teams/${t.id}`}
            key={t.id}
            className="card card-interactive group relative flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                  🗂️
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  <span>👥</span>
                  <span>{t.employee_count ?? 0} {t.employee_count === 1 ? 'member' : 'members'}</span>
                </span>
              </div>
              <h3 className="font-bold text-lg text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors">
                {t.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                {t.description || 'Dedicated operational campaign team'}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                  {t.team_lead_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="font-semibold text-slate-700 truncate max-w-[130px]">
                  {t.team_lead_name || 'No Lead Assigned'}
                </span>
              </div>
              <span className="text-brand-600 font-bold group-hover:translate-x-0.5 transition-transform">
                Details ➔
              </span>
            </div>
          </Link>
        ))}

        {teams.length === 0 && (
          <div className="col-span-full card p-12 text-center text-slate-400">
            <span className="text-4xl block mb-2">🗂️</span>
            <p className="text-base font-semibold text-slate-600">No teams created yet</p>
            <p className="text-xs text-slate-400 mt-1">Create your first team to assign employees and team leads</p>
          </div>
        )}
      </div>
    </div>
  );
}
