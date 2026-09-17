import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const SQUAD_THEMES = [
  { bg: 'from-blue-600 to-indigo-600', badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🚀' },
  { bg: 'from-emerald-600 to-teal-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '⚡' },
  { bg: 'from-violet-600 to-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🎯' },
  { bg: 'from-amber-500 to-orange-600', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🔥' },
  { bg: 'from-cyan-600 to-blue-600', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: '🌐' },
  { bg: 'from-pink-600 to-rose-600', badge: 'bg-pink-50 text-pink-700 border-pink-200', icon: '💎' },
];

export default function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Modals & form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', team_lead_id: '' });
  const [creating, setCreating] = useState(false);

  const [editModal, setEditModal] = useState(null); // team object when open
  const [editForm, setEditForm] = useState({ name: '', description: '', team_lead_id: '' });
  const [updating, setUpdating] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'with_lead', 'no_lead', 'has_members'

  const canManage = ['super_admin', 'admin'].includes(user.role);

  const load = () => {
    setLoading(true);
    api.get('/teams')
      .then((r) => setTeams(r.data.teams || []))
      .catch(() => setErr('Failed to load teams'))
      .finally(() => setLoading(false));

    if (canManage) {
      api.get('/users?role=team_lead')
        .then((r) => setLeads(r.data.users || []))
        .catch(() => {});
    }
  };

  useEffect(load, []);

  // Compute Metrics
  const stats = useMemo(() => {
    const totalSquads = teams.length;
    const totalMembers = teams.reduce((acc, t) => acc + (parseInt(t.employee_count, 10) || 0), 0);
    const withLead = teams.filter((t) => t.team_lead_id).length;
    const noLead = teams.filter((t) => !t.team_lead_id).length;
    return { totalSquads, totalMembers, withLead, noLead };
  }, [teams]);

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchSearch =
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.team_lead_name?.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (filterTab === 'with_lead') return Boolean(t.team_lead_id);
      if (filterTab === 'no_lead') return !t.team_lead_id;
      if (filterTab === 'has_members') return (parseInt(t.employee_count, 10) || 0) > 0;
      return true;
    });
  }, [teams, search, filterTab]);

  // Create Team
  const handleCreate = async (e) => {
    e.preventDefault();
    setErr('');
    setCreating(true);
    try {
      const payload = { ...createForm };
      if (!payload.team_lead_id) delete payload.team_lead_id;
      else payload.team_lead_id = Number(payload.team_lead_id);
      await api.post('/teams', payload);
      setCreateForm({ name: '', description: '', team_lead_id: '' });
      setShowCreateModal(false);
      setMsg('New squad created successfully! 🎉');
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const openEdit = (team, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditModal(team);
    setEditForm({
      name: team.name || '',
      description: team.description || '',
      team_lead_id: team.team_lead_id ? String(team.team_lead_id) : '',
    });
  };

  // Submit Edit Team
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editModal) return;
    setErr('');
    setUpdating(true);
    try {
      const payload = {
        name: editForm.name,
        description: editForm.description,
        team_lead_id: editForm.team_lead_id ? Number(editForm.team_lead_id) : null,
      };
      await api.patch(`/teams/${editModal.id}`, payload);
      setEditModal(null);
      setMsg(`Squad "${editForm.name}" updated successfully! ✅`);
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to update team');
    } finally {
      setUpdating(false);
    }
  };

  // Delete Team
  const handleDelete = async (team, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete squad "${team.name}"? All assigned members will become unassigned.`)) {
      return;
    }
    setErr('');
    try {
      await api.delete(`/teams/${team.id}`);
      setMsg(`Squad "${team.name}" deleted successfully.`);
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to delete squad');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {user.role === 'team_lead' ? 'My Campaign Squad' : 'Campaign Teams & Squads'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-brand-50 text-brand-700 border border-brand-200">
              {teams.length} {teams.length === 1 ? 'Squad' : 'Squads'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Organize SEO specialists, content strategists, and clients under dedicated team leadership.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary shadow-sm hover:shadow-brand-500/20 py-2.5 px-4 font-semibold text-xs inline-flex items-center gap-2"
          >
            <span>➕</span>
            <span>Create New Squad</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {err && (
        <div className="alert-error flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{err}</span>
          </div>
          <button onClick={() => setErr('')} className="text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {msg && (
        <div className="alert-success flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🎉</span>
            <span>{msg}</span>
          </div>
          <button onClick={() => setMsg('')} className="text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm">
            🗂️
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Squads</p>
            <p className="text-xl font-extrabold text-slate-900">{stats.totalSquads}</p>
          </div>
        </div>

        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-lg shadow-sm">
            👥
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Members</p>
            <p className="text-xl font-extrabold text-slate-900">{stats.totalMembers}</p>
          </div>
        </div>

        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg shadow-sm">
            👑
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">With Team Lead</p>
            <p className="text-xl font-extrabold text-slate-900">{stats.withLead}</p>
          </div>
        </div>

        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-600 to-slate-800 text-white flex items-center justify-center text-lg shadow-sm">
            ⏳
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Needs Lead</p>
            <p className="text-xl font-extrabold text-slate-900">{stats.noLead}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 bg-white border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { key: 'all', label: 'All Squads', count: teams.length },
              { key: 'with_lead', label: '👑 With Lead', count: stats.withLead },
              { key: 'no_lead', label: '⚠️ Unassigned Lead', count: stats.noLead },
              { key: 'has_members', label: '👥 Has Members', count: teams.filter(t => (parseInt(t.employee_count, 10) || 0) > 0).length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === tab.key
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] md:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              className="input pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white w-full"
              placeholder="Search squad or lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Squad Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeams.map((t, idx) => {
          const theme = SQUAD_THEMES[idx % SQUAD_THEMES.length];
          const leadInitials = (t.team_lead_name || 'TL').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
          const memberCount = parseInt(t.employee_count, 10) || 0;
          const previews = Array.isArray(t.member_previews) ? t.member_previews : [];

          return (
            <div
              key={t.id}
              className="card group relative flex flex-col justify-between bg-white border border-slate-200/90 hover:border-brand-300 hover:shadow-card-hover transition-all duration-200 p-5 rounded-2xl overflow-hidden"
            >
              {/* Top Accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.bg}`} />

              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${theme.bg} text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0`}>
                    {theme.icon}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                      <span>👥</span>
                      <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                    </span>

                    {/* Admin Action Menu */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => openEdit(t, e)}
                          title="Edit Squad Details"
                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-brand-50 text-slate-500 hover:text-brand-600 flex items-center justify-center text-xs transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => handleDelete(t, e)}
                          title="Delete Squad"
                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center text-xs transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Title & Description */}
                <Link to={`/teams/${t.id}`} className="block group-hover:text-brand-600 transition-colors">
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight group-hover:text-brand-600 flex items-center gap-1.5">
                    <span>{t.name}</span>
                    <span className="text-xs text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                  </h3>
                </Link>

                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed min-h-[36px]">
                  {t.description || 'Dedicated campaign and SEO operational squad.'}
                </p>

                {/* Member Preview Avatars */}
                {previews.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <div className="flex -space-x-2 overflow-hidden">
                      {previews.map((m) => {
                        const init = (m.name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                        return (
                          <div
                            key={m.id}
                            title={`${m.name} (@${m.username})`}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center"
                          >
                            {init}
                          </div>
                        );
                      })}
                    </div>
                    {memberCount > previews.length && (
                      <span className="text-[10px] font-bold text-slate-400">
                        +{memberCount - previews.length} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Footer Details */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                {/* Team Lead Indicator */}
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center ${
                    t.team_lead_name
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {t.team_lead_name ? leadInitials : '?'}
                  </div>
                  <div className="truncate max-w-[130px]">
                    <span className="font-semibold text-slate-700 block truncate">
                      {t.team_lead_name || 'No Lead Assigned'}
                    </span>
                    <span className="text-[10px] text-slate-400 block -mt-0.5">
                      {t.team_lead_name ? 'Squad Lead' : 'Vacant'}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/teams/${t.id}`}
                  className="inline-flex items-center gap-1 font-bold text-brand-600 hover:text-brand-700 text-xs bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-all"
                >
                  <span>Manage</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">➔</span>
                </Link>
              </div>
            </div>
          );
        })}

        {filteredTeams.length === 0 && !loading && (
          <div className="col-span-full card p-12 text-center text-slate-400 bg-white border border-slate-200/80 rounded-2xl">
            <span className="text-4xl block mb-2">🗂️</span>
            <p className="text-base font-bold text-slate-700">No squads found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search || filterTab !== 'all'
                ? 'Try adjusting your search query or filter criteria.'
                : 'No campaign teams created yet. Click "Create New Squad" to get started.'}
            </p>
            {canManage && !search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-xs mt-4 py-2 px-4 inline-flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Create First Squad</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* CREATE TEAM MODAL */}
      {showCreateModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-bold">
                  ➕
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Create New Squad</h2>
                  <p className="text-[11px] text-slate-400">Form a new campaign squad and assign leadership</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label text-xs font-bold text-slate-700">
                  Squad / Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  className="input text-xs"
                  placeholder="e.g. SEO Squad Alpha, SaaS Backlinks Team..."
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-slate-700">
                  Designated Team Lead (Optional)
                </label>
                <select
                  className="input text-xs"
                  value={createForm.team_lead_id}
                  onChange={(e) => setCreateForm({ ...createForm, team_lead_id: e.target.value })}
                >
                  <option value="">-- Select Team Lead (Can assign later) --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} (@{l.username})
                    </option>
                  ))}
                </select>
                {leads.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No Team Leads found. Create a user with the "Team Lead" role in <Link to="/users" className="underline font-bold">Users</Link>.
                  </p>
                )}
              </div>

              <div>
                <label className="label text-xs font-bold text-slate-700">
                  Description / Campaign Scope
                </label>
                <textarea
                  rows={3}
                  className="input text-xs resize-none"
                  placeholder="e.g. Handles technical audits, high-intent keyword tracking, on-page optimization, and weekly reporting."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs py-2 px-4"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-semibold"
                  disabled={creating || !createForm.name.trim()}
                >
                  {creating ? 'Creating Squad...' : 'Create Squad 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-bold">
                  ✏️
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Edit Squad Details</h2>
                  <p className="text-[11px] text-slate-400">Modify squad name, leadership, or scope</p>
                </div>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="label text-xs font-bold text-slate-700">
                  Squad / Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  className="input text-xs"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-slate-700">
                  Designated Team Lead
                </label>
                <select
                  className="input text-xs"
                  value={editForm.team_lead_id}
                  onChange={(e) => setEditForm({ ...editForm, team_lead_id: e.target.value })}
                >
                  <option value="">-- No Team Lead Assigned --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} (@{l.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs font-bold text-slate-700">
                  Description / Campaign Scope
                </label>
                <textarea
                  rows={3}
                  className="input text-xs resize-none"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(e) => {
                    setEditModal(null);
                    handleDelete(editModal, e);
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors"
                >
                  🗑️ Delete Squad
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModal(null)}
                    className="btn-secondary text-xs py-2 px-4"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs py-2 px-5 font-semibold"
                    disabled={updating || !editForm.name.trim()}
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
