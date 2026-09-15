import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLE_OPTIONS, roleLabel, EMAIL_REGEX, PASSWORD_REGEX } from '../constants';

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', role: 'employee', team_id: '' });

  // super_admin can create admin/TL/employee; admin can create TL/employee
  const roleOptions = user.role === 'super_admin'
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((o) => o.value !== 'admin');

  const load = () => {
    api.get('/users').then((r) => setUsers(r.data.users)).catch(() => {});
    api.get('/teams').then((r) => setTeams(r.data.teams)).catch(() => {});
  };
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');

    if (!EMAIL_REGEX.test(form.email.trim())) {
      return setErr('Please enter a valid email address (e.g. name@domain.com)');
    }
    if (!PASSWORD_REGEX.test(form.password)) {
      return setErr('Password must be at least 8 characters and contain at least 1 letter and 1 number');
    }

    try {
      const payload = { ...form, email: form.email.trim() };
      if (!payload.team_id) delete payload.team_id;
      else payload.team_id = Number(payload.team_id);
      await api.post('/users', payload);
      setMsg(`User "${form.username}" created. Share the password with them.`);
      setForm({ name: '', email: '', username: '', password: '', role: 'employee', team_id: '' });
      setShow(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.errors?.[0]?.message || 'Failed');
    }
  };

  const toggleActive = async (u) => {
    await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
    load();
  };

  const resetPwd = async (u) => {
    const np = prompt(`New password for ${u.username} (min 8 chars with 1 letter & 1 number):`);
    if (!np) return;
    if (!PASSWORD_REGEX.test(np)) {
      return alert('Invalid password format! Password must be at least 8 characters and contain at least 1 letter and 1 number.');
    }
    try {
      await api.post(`/users/${u.id}/reset-password`, { newPassword: np });
      setMsg('Password reset done successfully.');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed');
    }
  };

  const deleteUser = async (u) => {
    if (u.id === user.id) {
      return alert('You cannot delete your own account');
    }
    if (!window.confirm(`Are you sure you want to permanently delete user "${u.name}" (@${u.username})? This action cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setMsg(`User "${u.username}" deleted successfully.`);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to delete user');
    }
  };

  const ROLE_BADGE = {
    super_admin: 'bg-purple-50 text-purple-700 border-purple-200',
    admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    team_lead: 'bg-blue-50 text-blue-700 border-blue-200',
    employee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Team Members & Access</h1>
          <p className="text-xs text-slate-500 mt-1">Manage all employee, team lead, and admin accounts</p>
        </div>
        <button
          className={show ? 'btn-secondary' : 'btn-primary'}
          onClick={() => setShow(!show)}
        >
          <span>{show ? '✕ Cancel' : '➕ Add Member'}</span>
        </button>
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

      {show && (
        <div className="card shadow-card-hover border-brand-200/80 bg-gradient-to-b from-white to-slate-50/50">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h2 className="font-bold text-base text-slate-800">Create New Team Member</h2>
            <span className="text-xs text-slate-400">Account Credentials</span>
          </div>
          <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              {form.email && !EMAIL_REGEX.test(form.email) && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">⚠️ Invalid email format (e.g. name@domain.com)</p>
              )}
            </div>
            <div>
              <label className="label">Username</label>
              <input className="input" placeholder="rahul123" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div>
              <label className="label">Temporary Password</label>
              <input
                type="password"
                className="input"
                placeholder="Min 8 chars with 1 letter & 1 number"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              {form.password && !PASSWORD_REGEX.test(form.password) && (
                <p className="text-[11px] text-amber-600 mt-1 font-medium">⚠️ Must be min 8 chars with at least 1 letter and 1 number</p>
              )}
            </div>
            <div>
              <label className="label">System Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-tight">
                {form.role === 'employee' && "The employee's report goes to their team's Team Lead."}
                {form.role === 'team_lead' && 'Choose a team to assign the Team Lead to.'}
                {form.role === 'admin' && 'Admin can view/approve all forwarded reports.'}
              </p>
            </div>
            <div>
              <label className="label">Assigned Team {form.role === 'employee' && <span className="text-red-500">*</span>}</label>
              <select
                className="input"
                value={form.team_id}
                onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                disabled={form.role === 'admin'}
              >
                <option value="">{form.role === 'admin' ? 'Not required for Admin' : '-- Select team --'}</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {teams.length === 0 && form.role !== 'admin' && (
                <p className="text-[11px] text-amber-600 mt-1.5">No teams yet — create a team from the Teams page first.</p>
              )}
            </div>
            <div className="md:col-span-2 pt-2">
              <button className="btn-primary py-2.5 px-6">
                <span>Save & Create Account</span>
                <span>➔</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/90 border-b border-slate-100 text-left">
              <tr>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Member</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Username</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Team</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-brand-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        {u.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 leading-tight">{u.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-600">
                    @{u.username}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold border ${ROLE_BADGE[u.role] || 'bg-slate-100 text-slate-700'}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-medium">
                    {teams.find((t) => t.id === u.team_id)?.name || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      u.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-red-50 text-red-700 border border-red-200/80'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap space-x-2">
                    <button
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                      onClick={() => toggleActive(u)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 transition-colors"
                      onClick={() => resetPwd(u)}
                    >
                      Reset Password
                    </button>
                    {u.id !== user.id && u.role !== 'super_admin' && (
                      <button
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white text-rose-700 transition-colors"
                        onClick={() => deleteUser(u)}
                        title="Delete user permanently"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-400">
                    No team members found
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
