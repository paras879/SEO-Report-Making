import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const canManage = ['super_admin', 'admin'].includes(user.role);

  const load = () => {
    api.get(`/teams/${id}`).then((r) => {
      setTeam(r.data.team);
      setMembers(r.data.members || []);
      setLeadId(r.data.team.team_lead_id || '');
    }).catch((e) => setErr(e.response?.data?.message || 'Failed to load squad details'));

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
      setMsg('Team Lead updated successfully.');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to assign team lead');
    }
  };

  const addMember = async () => {
    if (!addId) return;
    setErr(''); setMsg('');
    try {
      await api.post(`/teams/${id}/members`, { user_id: Number(addId) });
      setAddId('');
      setMsg('Member added to squad.');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to add member');
    }
  };

  const removeMember = async (uid) => {
    if (!window.confirm('Remove this member from the team?')) return;
    setErr(''); setMsg('');
    try {
      await api.delete(`/teams/${id}/members/${uid}`);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to remove member');
    }
  };

  if (err && !team) {
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
    <div className="w-full space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/teams')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card"
        >
          <span>←</span>
          <span>Back to Teams</span>
        </button>
        <span className="text-xs font-semibold text-slate-400">Squad ID #{team.id}</span>
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {msg && (
        <div className="alert-success">
          <span>✅</span>
          <span>{msg}</span>
        </div>
      )}

      {/* Squad Hero Banner */}
      <div className="card p-6 md:p-8 bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/90 shadow-card">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700">
                Active Squad
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                👥 {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {team.name}
            </h1>

            <p className="text-sm text-slate-500 leading-relaxed">
              {team.description || 'No description provided for this team squad.'}
            </p>
          </div>

          {/* Assigned Team Lead Highlight */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm shrink-0 min-w-[240px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Designated Team Lead</p>
            {team.team_lead_name ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {leadInitials}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{team.team_lead_name}</p>
                  <p className="text-xs text-amber-600 font-semibold">Team Lead</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 py-1">
                <span>⚠️</span>
                <span className="text-xs font-semibold">No Team Lead assigned</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Management Controls */}
      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assign / Change Lead */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-base">👑</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Assign or Change Team Lead</h3>
            </div>
            <div>
              <label className="label">Select Team Lead Candidate</label>
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
                  Create a user with the "Team Lead" role first from the Users page.
                </p>
              )}
            </div>
            <button
              className="btn-primary text-xs w-full"
              onClick={saveLead}
              disabled={leads.length === 0}
            >
              Update Team Lead
            </button>
          </div>

          {/* Add Employee to Squad */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-base">➕</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Onboard Employee to Squad</h3>
            </div>
            <div>
              <label className="label">Available Employees</label>
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
              className="btn-primary text-xs w-full"
              onClick={addMember}
              disabled={!addId}
            >
              Add Member to Squad
            </button>
          </div>
        </div>
      )}

      {/* Squad Members Roster */}
      <div className="card p-0 overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Squad Roster</h2>
            <p className="text-xs text-slate-400">All registered employees attached to this team squad</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            Total: {members.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-left">
              <tr>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Member</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Username</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                {canManage && <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => {
                const initials = (m.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center">
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
                        m.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span>{m.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => removeMember(m.id)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {members.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-3xl mb-2">👥</span>
                      <p className="text-sm font-semibold text-slate-600">No members assigned yet</p>
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
    </div>
  );
}
