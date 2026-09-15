import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleLabel, PASSWORD_REGEX } from '../constants';

export default function ChangePassword() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCur] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const hasLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const matches = Boolean(newPassword && newPassword === confirm);
  const isValidPassword = PASSWORD_REGEX.test(newPassword);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (newPassword !== confirm) return setErr('New passwords do not match');
    if (!PASSWORD_REGEX.test(newPassword)) {
      return setErr('Password must be at least 8 characters and contain at least 1 letter and 1 number');
    }

    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setMsg('Password updated successfully! Logging you out in a moment...');
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 1600);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to update password');
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Change Password</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your account credentials, security settings, and login passwords.
        </p>
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

      {/* Full-width 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Side: Password Form */}
        <form onSubmit={submit} className="lg:col-span-7 card space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="text-lg">🔑</span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Update Credentials</h2>
              <p className="text-[11px] text-slate-400">Enter your current password followed by your new password</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                className="input font-medium"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCur(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input font-medium"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNew(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  className="input font-medium"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto text-xs py-2.5 px-6"
              disabled={saving || !hasLength || !hasLetter || !hasNumber || !matches}
            >
              {saving ? 'Updating Password...' : '🔒 Save New Password'}
            </button>
          </div>
        </form>

        {/* Right Side: Security Policy & Checklist */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Validation Checklist */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-lg">🛡️</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Password Checklist</h3>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                hasLength ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <span className="font-semibold">At least 8 characters</span>
                <span className="font-bold">{hasLength ? '✓' : '○'}</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                hasLetter ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <span className="font-semibold">Contains at least 1 letter</span>
                <span className="font-bold">{hasLetter ? '✓' : '○'}</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                hasNumber ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <span className="font-semibold">Contains at least 1 number</span>
                <span className="font-bold">{hasNumber ? '✓' : '○'}</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                matches ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' : (confirm ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-500')
              }`}>
                <span className="font-semibold">Passwords match</span>
                <span className="font-bold">{matches ? '✓' : (confirm ? '✕' : '○')}</span>
              </div>
            </div>
          </div>

          {/* Account Security Information Card */}
          <div className="card bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-0 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Security Notice</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
                {roleLabel(user.role)}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Updating your password will invalidate your existing sessions. You will be automatically redirected to sign in with your new credentials.
            </p>
            <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400">
              Account: <b className="text-white">{user.username}</b> ({user.email})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
