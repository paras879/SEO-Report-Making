import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLE_OPTIONS, roleLabel, EMAIL_REGEX, PASSWORD_REGEX } from '../constants';

const ROLE_THEMES = {
  super_admin: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    avatar: 'from-purple-600 to-indigo-700 text-white',
    dot: 'bg-purple-500',
  },
  admin: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    avatar: 'from-indigo-600 to-blue-700 text-white',
    dot: 'bg-indigo-500',
  },
  team_lead: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    avatar: 'from-sky-500 to-blue-600 text-white',
    dot: 'bg-sky-500',
  },
  developer: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    avatar: 'from-amber-500 to-orange-600 text-white',
    dot: 'bg-amber-500',
  },
  employee: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    avatar: 'from-emerald-500 to-teal-600 text-white',
    dot: 'bg-emerald-500',
  },
};

function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Create Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'employee',
    team_id: '',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    username: '',
    role: 'employee',
    team_id: '',
    is_active: true,
  });

  const roleOptions =
    user.role === 'super_admin'
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter((o) => o.value !== 'admin');

  const load = () => {
    api.get('/users').then((r) => setUsers(r.data.users)).catch(() => {});
    api.get('/teams').then((r) => setTeams(r.data.teams)).catch(() => {});
  };

  useEffect(load, []);

  // Handle Create User
  const handleCreate = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');

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
      setMsg(`User "${form.username}" created successfully!`);
      setForm({ name: '', email: '', username: '', password: '', role: 'employee', team_id: '' });
      setShowCreate(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.errors?.[0]?.message || 'Failed to create user');
    }
  };

  // Open Edit Modal
  const openEditModal = (u) => {
    setEditUser(u);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      username: u.username || '',
      role: u.role || 'employee',
      team_id: u.team_id ? String(u.team_id) : '',
      is_active: Boolean(u.is_active),
    });
  };

  // Handle Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!editUser) return;

    if (!EMAIL_REGEX.test(editForm.email.trim())) {
      return setErr('Please enter a valid email address');
    }

    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        username: editForm.username.trim(),
        role: editForm.role,
        team_id: editForm.team_id ? Number(editForm.team_id) : null,
        is_active: editForm.is_active,
      };

      await api.patch(`/users/${editUser.id}`, payload);
      setMsg(`Profile for "${editForm.name}" updated successfully!`);
      setEditUser(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to update user profile');
    }
  };

  // Toggle Active
  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
      setMsg(`User @${u.username} ${!u.is_active ? 'activated' : 'deactivated'}.`);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to change status');
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (u) => {
    setResetUser(u);
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewPasswordVal(pass);
  };

  // Handle Reset Password Submit
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!resetUser) return;

    if (!PASSWORD_REGEX.test(newPasswordVal)) {
      return setErr('Password must be at least 8 characters with at least 1 letter and 1 number.');
    }

    try {
      await api.post(`/users/${resetUser.id}/reset-password`, { newPassword: newPasswordVal });
      setMsg(`Password for @${resetUser.username} reset successfully!`);
      setResetUser(null);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to reset password');
    }
  };

  // Delete User
  const deleteUser = async (u) => {
    if (u.id === user.id) {
      return alert('You cannot delete your own account');
    }
    if (
      !window.confirm(
        `Are you sure you want to permanently delete user "${u.name}" (@${u.username})?\n\nThis action cannot be undone.`
      )
    )
      return;

    try {
      await api.delete(`/users/${u.id}`);
      setMsg(`User "${u.username}" deleted successfully.`);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to delete user');
    }
  };

  // Filter Users
  const filteredUsers = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (teamFilter !== 'all' && String(u.team_id) !== String(teamFilter)) return false;
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'blocked' && u.is_active) return false;
    return true;
  });

  // Stats Counters
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const blockedCount = users.filter((u) => !u.is_active).length;
  const tlCount = users.filter((u) => u.role === 'team_lead').length;
  const devCount = users.filter((u) => u.role === 'developer').length;
  const empCount = users.filter((u) => u.role === 'employee').length;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-brand-600 text-white flex items-center justify-center text-xl shadow-md shadow-brand-500/20">
              👥
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Team Members & Access
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage roles, assignments, credentials, and profile details
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary text-xs font-bold py-2.5 px-4 inline-flex items-center gap-2 shadow-md shadow-brand-500/20"
        >
          <span>➕</span>
          <span>Add New Member</span>
        </button>
      </div>

      {err && <div className="alert-error"><span>⚠️</span><span>{err}</span></div>}
      {msg && <div className="alert-success"><span>✅</span><span>{msg}</span></div>}

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`card p-4 hover:shadow-card transition-all cursor-pointer ${
            statusFilter === 'all' ? 'ring-2 ring-slate-900' : ''
          }`}
        >
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Members</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
        </div>
        <div
          onClick={() => setStatusFilter('active')}
          className={`card p-4 hover:shadow-card transition-all cursor-pointer ${
            statusFilter === 'active' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''
          }`}
        >
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Accounts</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</p>
        </div>
        <div
          onClick={() => setStatusFilter('blocked')}
          className={`card p-4 hover:shadow-card transition-all border-rose-200 bg-rose-50/40 cursor-pointer ${
            statusFilter === 'blocked' ? 'ring-2 ring-rose-500' : ''
          }`}
        >
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Blocked Accounts</p>
          <p className="text-2xl font-black text-rose-700 mt-1">{blockedCount}</p>
        </div>
        <div className="card p-4 hover:shadow-card transition-all">
          <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Team Leads</p>
          <p className="text-2xl font-black text-sky-700 mt-1">{tlCount}</p>
        </div>
        <div className="card p-4 hover:shadow-card transition-all">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Developers</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{devCount}</p>
        </div>
        <div className="card p-4 hover:shadow-card transition-all">
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Employees</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">{empCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              className="input pl-9 pr-8 text-xs py-2.5 bg-slate-50 border-slate-200"
              placeholder="Search by name, email, or @username..."
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

          {/* Status Filter Dropdown / Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-[11px] shrink-0 font-bold">
            {[
              ['all', 'All Status'],
              ['active', '🟢 Active'],
              ['blocked', '🚫 Blocked'],
            ].map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setStatusFilter(k)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === k
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {[
              ['all', 'All Roles'],
              ['team_lead', 'Team Leads'],
              ['employee', 'Employees'],
              ['developer', 'Developers'],
              ['admin', 'Admins'],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setRoleFilter(k)}
                className={`px-3 py-1.5 rounded-xl font-bold tracking-tight whitespace-nowrap transition-all ${
                  roleFilter === k
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Team Filter Dropdown */}
          <div className="shrink-0">
            <select
              className="input text-xs py-2 bg-slate-50 border-slate-200"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="all">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* USERS TABLE */}
      {/* ========================================================================= */}
      <div className="card p-0 overflow-hidden shadow-card-hover border border-slate-200/90">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-left">
              <tr>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-600">Member</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-600">Username</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-600">Role</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-600">Assigned Team</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const theme = ROLE_THEMES[u.role] || ROLE_THEMES.employee;
                const userTeam = teams.find((t) => t.id === u.team_id);

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Member Name + Email */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${theme.avatar} text-white font-extrabold text-xs flex items-center justify-center shadow-sm shrink-0`}
                        >
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 leading-tight truncate">{u.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded-md">@{u.username}</span>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${theme.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                        {roleLabel(u.role)}
                      </span>
                    </td>

                    {/* Team */}
                    <td className="px-5 py-4 text-slate-700 font-semibold whitespace-nowrap">
                      {userTeam ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs">
                          📁 {userTeam.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-600'
                          }`}
                        />
                        {u.is_active ? 'Active' : '🚫 Deactivated / Blocked'}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* 1. Edit Profile */}
                        <button
                          onClick={() => openEditModal(u)}
                          className="btn-secondary text-xs font-bold py-1.5 px-2.5 inline-flex items-center gap-1 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition shadow-2xs"
                          title="Edit Profile Details"
                        >
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>

                        {/* 2. Reset Password */}
                        <button
                          onClick={() => openResetPasswordModal(u)}
                          className="btn-secondary text-xs font-bold py-1.5 px-2.5 inline-flex items-center gap-1 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition shadow-2xs"
                          title="Reset Login Password"
                        >
                          <span>🔑</span>
                          <span>Reset</span>
                        </button>

                        {/* 3. Toggle Block / Deactivate Status */}
                        {u.id !== user.id && (
                          <button
                            onClick={() => toggleActive(u)}
                            className={`text-xs font-extrabold py-1.5 px-3 rounded-xl border transition shadow-2xs ${
                              u.is_active
                                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600 shadow-sm'
                            }`}
                            title={u.is_active ? 'Deactivate or Block User Account' : 'Activate or Unblock User Account'}
                          >
                            {u.is_active ? '🔒 Deactivate / Block' : '🔓 Activate / Unblock'}
                          </button>
                        )}

                        {/* 4. Delete */}
                        {u.id !== user.id && u.role !== 'super_admin' && (
                          <button
                            onClick={() => deleteUser(u)}
                            className="text-xs font-bold py-1.5 px-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition shadow-2xs"
                            title="Delete user permanently"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-16 text-center text-slate-400 space-y-2">
                    <span className="text-3xl block">🔍</span>
                    <p className="text-sm font-bold text-slate-700">No team members match the search filters</p>
                    <p className="text-xs text-slate-400">Try changing or clearing your search criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EDIT PROFILE MODAL */}
      {/* ========================================================================= */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-brand-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center text-lg font-bold">
                  ✏️
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">Edit Team Member Profile</h2>
                  <p className="text-xs text-slate-300 mt-0.5">Editing details for @{editUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    className="input font-semibold"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Email Address *</label>
                  <input
                    type="email"
                    className="input font-semibold"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Username *</label>
                  <input
                    className="input font-mono font-semibold"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">System Role *</label>
                  <select
                    className="input font-semibold"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    disabled={editUser.role === 'super_admin'}
                  >
                    {roleOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Assigned Team</label>
                  <select
                    className="input font-semibold"
                    value={editForm.team_id}
                    onChange={(e) => setEditForm({ ...editForm, team_id: e.target.value })}
                    disabled={editForm.role === 'admin' || editForm.role === 'super_admin'}
                  >
                    <option value="">
                      {['admin', 'super_admin'].includes(editForm.role)
                        ? 'Not applicable for Admin'
                        : '-- No Team Assigned --'}
                    </option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 pt-1">
                  <label className="label">Account Status</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-2xl border bg-slate-50 border-slate-200 flex-1">
                      <input
                        type="radio"
                        name="account_status"
                        checked={editForm.is_active === true}
                        onChange={() => setEditForm({ ...editForm, is_active: true })}
                        className="text-brand-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Active Account</span>
                        <span className="text-[10px] text-slate-400">User can sign in and work</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-2xl border bg-slate-50 border-slate-200 flex-1">
                      <input
                        type="radio"
                        name="account_status"
                        checked={editForm.is_active === false}
                        onChange={() => setEditForm({ ...editForm, is_active: false })}
                        className="text-brand-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-rose-700 block">Deactivated</span>
                        <span className="text-[10px] text-slate-400">Blocks sign-in immediately</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="btn-secondary text-xs py-2.5 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2.5 px-6 shadow-md shadow-brand-500/20 font-bold"
                >
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="p-6 bg-gradient-to-r from-amber-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center text-lg font-bold">
                  🔑
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight">Reset Password</h2>
                  <p className="text-xs text-amber-200 mt-0.5">For {resetUser.name} (@{resetUser.username})</p>
                </div>
              </div>
              <button
                onClick={() => setResetUser(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="label">New Temporary Password *</label>
                <div className="flex items-center gap-2">
                  <input
                    className="input font-mono font-bold text-sm"
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newPasswordVal);
                      alert('Password copied to clipboard!');
                    }}
                    className="btn-secondary text-xs py-3 px-3 shrink-0"
                    title="Copy to clipboard"
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Must be min 8 characters with at least 1 letter and 1 number.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>ℹ️</span>
                  <span>Important</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  The user will be prompted to choose a new password upon their next login.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="btn-secondary text-xs py-2.5 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-warning text-xs py-2.5 px-6 font-bold shadow-sm"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE NEW MEMBER MODAL */}
      {/* ========================================================================= */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center text-lg font-bold">
                  ➕
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">Add New Team Member</h2>
                  <p className="text-xs text-slate-300 mt-0.5">Create login credentials and assign system role</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    className="input font-semibold"
                    placeholder="e.g. Rahul Sharma"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Email Address *</label>
                  <input
                    type="email"
                    className="input font-semibold"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Username *</label>
                  <input
                    className="input font-mono font-semibold"
                    placeholder="rahul123"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Temporary Password *</label>
                  <input
                    type="password"
                    className="input font-semibold"
                    placeholder="Min 8 chars (1 letter & 1 num)"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">System Role *</label>
                  <select
                    className="input font-semibold"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {roleOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    Assigned Team {form.role === 'employee' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    className="input font-semibold"
                    value={form.team_id}
                    onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                    disabled={form.role === 'admin'}
                  >
                    <option value="">
                      {form.role === 'admin' ? 'Not required for Admin' : '-- Select team --'}
                    </option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary text-xs py-2.5 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2.5 px-6 shadow-md shadow-brand-500/20 font-bold"
                >
                  Save & Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

