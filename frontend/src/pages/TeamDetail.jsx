import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [freeEmployees, setFreeEmployees] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState('');
  const [addId, setAddId] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Squad Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const canManage = ['super_admin', 'admin'].includes(user.role);

  const load = () => {
    setLoading(true);
    api.get(`/teams/${id}`)
      .then((r) => {
        setTeam(r.data.team);
        setMembers(r.data.members || []);
        setLeadId(r.data.team.team_lead_id || '');
        setEditForm({ name: r.data.team.name || '', description: r.data.team.description || '' });
      })
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load squad details'))
      .finally(() => setLoading(false));

    if (canManage) {
      api.get('/users?role=employee').then((r) => setFreeEmployees(r.data.users || [])).catch(() => {});
      api.get('/users?role=team_lead').then((r) => setLeads(r.data.users || [])).catch(() => {});
    }
  };

  useEffect(load, [id]);

  const saveLead = async () => {
    setErr(''); setMsg('');
    try {
      await api.patch(`/teams/${id}`, { team_lead_id: leadId ? Number(leadId) : null });
      setMsg('Team Lead updated successfully! ✅');
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to assign team lead');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    setSavingEdit(true);
    try {
      await api.patch(`/teams/${id}`, editForm);
      setShowEditModal(false);
      setMsg('Squad details updated successfully! ✅');
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to update squad details');
    } finally {
      setSavingEdit(false);
    }
  };

  const addMember = async () => {
    if (!addId) return;
    setErr(''); setMsg('');
    try {
      await api.post(`/teams/${id}/members`, { user_id: Number(addId) });
      setAddId('');
      setMsg('Member added to squad! 👥');
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to add member');
    }
  };

  const removeMember = async (uid, memberName) => {
    if (!window.confirm(`Remove ${memberName || 'this member'} from the team squad?`)) return;
    setErr(''); setMsg('');
    try {
      await api.delete(`/teams/${id}/members/${uid}`);
      setMsg('Member removed from squad.');
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to remove member');
    }
  };

  const deleteSquad = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete squad "${team.name}"?`)) return;
    try {
      await api.delete(`/teams/${id}`);
      navigate('/teams');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to delete squad');
    }
  };

  // Export Squad Roster to CSV
  const exportCSV = () => {
    if (members.length === 0) return;
    const headers = ['Member Name', 'Username', 'Email', 'Role', 'Status'];
    const rows = members.map((m) => [
      `"${(m.name || '').replace(/"/g, '""')}"`,
      `"${m.username || ''}"`,
      `"${m.email || ''}"`,
      `"${m.role || ''}"`,
      `"${m.is_active ? 'Active' : 'Inactive'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${team?.name || 'squad'}_roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter squad roster
  const filteredMembers = useMemo(() => {
    if (!searchMember.trim()) return members;
    return members.filter((m) =>
      m.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.username?.toLowerCase().includes(searchMember.toLowerCase())
    );
  }, [members, searchMember]);

  if (err && !team && !loading) {
    return (
      <div className="w-full space-y-4">
        <button onClick={() => navigate('/teams')} className="btn-secondary text-xs">← Back to Teams</button>
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold uppercase tracking-wider">Loading Squad Details...</span>
        </div>
      </div>
    );
  }

  const leadInitials = (team.team_lead_name || 'TL').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="w-full space-y-6 pb-12 animate-fade-in">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/teams')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-sm"
        >
          <span>←</span>
          <span>Back to All Squads</span>
        </button>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={deleteSquad}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl transition-colors"
            >
              🗑️ Delete Squad
            </button>
          )}
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200/60">
            Squad #{team.id}
          </span>
        </div>
      </div>

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

      {/* Squad Hero Banner */}
      <div className="card p-6 md:p-8 bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200/90 shadow-sm rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-600 via-indigo-600 to-teal-500" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                🚀 Active Squad
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                👥 {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
              {canManage && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-0.5 rounded-full transition-colors flex items-center gap-1"
                >
                  <span>✏️</span>
                  <span>Edit Info</span>
                </button>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {team.name}
            </h1>

            <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
              {team.description || 'No specific description provided for this operational squad.'}
            </p>
          </div>

          {/* Assigned Team Lead Highlight */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm shrink-0 min-w-[250px]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1">
              <span>👑</span>
              <span>Designated Team Lead</span>
            </p>
            {team.team_lead_name ? (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  {leadInitials}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{team.team_lead_name}</p>
                  <p className="text-xs text-amber-600 font-semibold">Team Lead</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 py-1 bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
                <span>⚠️</span>
                <span className="text-xs font-semibold text-slate-500">No Team Lead assigned</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Management Controls */}
      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assign / Change Lead */}
          <div className="card p-5 bg-white border border-slate-200/90 shadow-sm rounded-2xl space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-base">👑</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Assign or Change Team Lead</h3>
            </div>
            <div>
              <label className="label text-xs font-bold text-slate-700">Select Team Lead Candidate</label>
              <select
                className="input text-xs"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                disabled={leads.length === 0}
              >
                <option value="">{leads.length === 0 ? 'No Team Lead users exist' : '-- Select Team Lead --'}</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} (@{l.username})
                  </option>
                ))}
              </select>
              {leads.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1 font-medium">
                  Create a user with the "Team Lead" role first from <Link to="/users" className="underline font-bold">Users</Link>.
                </p>
              )}
            </div>
            <button
              className="btn-primary text-xs w-full py-2.5 font-semibold"
              onClick={saveLead}
              disabled={leads.length === 0}
            >
              Update Team Lead
            </button>
          </div>

          {/* Add Employee to Squad */}
          <div className="card p-5 bg-white border border-slate-200/90 shadow-sm rounded-2xl space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-base">➕</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Onboard Employee to Squad</h3>
            </div>
            <div>
              <label className="label text-xs font-bold text-slate-700">Available Employees</label>
              <select
                className="input text-xs"
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
              >
                <option value="">-- Choose Employee --</option>
                {freeEmployees
                  .filter((e) => e.team_id !== Number(id))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} (@{e.username}) {e.team_id ? ' [In another squad]' : ''}
                    </option>
                  ))}
              </select>
            </div>
            <button
              className="btn-primary text-xs w-full py-2.5 font-semibold"
              onClick={addMember}
              disabled={!addId}
            >
              Add Member to Squad
            </button>
          </div>
        </div>
      )}

      {/* Squad Members Roster */}
      <div className="card p-0 overflow-hidden bg-white border border-slate-200/90 shadow-sm rounded-2xl space-y-0">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Squad Roster</h2>
            <p className="text-xs text-slate-400">All registered employees assigned to this campaign squad</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search within squad */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                className="input pl-8 pr-3 py-1 text-xs rounded-xl bg-white border-slate-200 w-44"
                placeholder="Filter member..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
              />
            </div>

            {members.length > 0 && (
              <button
                onClick={exportCSV}
                title="Download CSV"
                className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1"
              >
                <span>📥</span>
                <span>CSV</span>
              </button>
            )}

            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-brand-50 text-brand-700 border border-brand-200">
              {filteredMembers.length} of {members.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-left">
              <tr>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Member</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Username</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                {canManage && <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((m) => {
                const initials = (m.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-100">
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{m.name}</p>
                          <p className="text-[11px] text-slate-400">{m.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium text-xs">
                      @{m.username}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        m.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span>{m.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => removeMember(m.id, m.name)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg transition-colors border border-rose-100"
                        >
                          Remove from Squad
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-3xl mb-2">👥</span>
                      <p className="text-sm font-bold text-slate-700">No members match</p>
                      {canManage && (
                        <p className="text-xs text-slate-400 mt-0.5">Use the onboarding card above to add employees to this squad.</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT SQUAD MODAL */}
      {showEditModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-bold">
                  ✏️
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Edit Squad Info</h2>
                  <p className="text-[11px] text-slate-400">Update team name and mission statement</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="label text-xs font-bold text-slate-700">
                  Squad Name <span className="text-rose-500">*</span>
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
                  Description / Campaign Scope
                </label>
                <textarea
                  rows={3}
                  className="input text-xs resize-none"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary text-xs py-2 px-4"
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-semibold"
                  disabled={savingEdit || !editForm.name.trim()}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
