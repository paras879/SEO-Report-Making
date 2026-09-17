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
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // Validation Rules
  const hasLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const matches = Boolean(newPassword && newPassword === confirm);

  // Strength score calculation (0 to 4)
  const strengthScore = [
    hasLength,
    hasLetter,
    hasNumber,
    hasSpecial || newPassword.length >= 12,
  ].filter(Boolean).length;

  const STRENGTH_LEVELS = [
    { label: 'Very Weak', color: 'bg-slate-200', text: 'text-slate-400', width: 'w-0' },
    { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600', width: 'w-1/4' },
    { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600', width: 'w-2/4' },
    { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600', width: 'w-3/4' },
    { label: 'Strong & Secure', color: 'bg-emerald-500', text: 'text-emerald-600', width: 'w-full' },
  ];

  const currentStrength = newPassword ? STRENGTH_LEVELS[strengthScore] : STRENGTH_LEVELS[0];

  const generateStrongPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 14; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNew(pass);
    setConfirm(pass);
    setShowNew(true);
    setShowConf(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center text-xl shadow-md shadow-amber-500/20">
              🔑
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Change Password
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your account credentials, security settings, and login passwords.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={generateStrongPassword}
          className="btn-secondary text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
        >
          <span>✨</span>
          <span>Generate Strong Password</span>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Side: Password Form */}
        <form onSubmit={submit} className="lg:col-span-7 card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                Update Account Password
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter your current password followed by your new password
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
              Step 1 of 1
            </span>
          </div>

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="label">Current Password *</label>
              <div className="relative">
                <input
                  type={showCur ? 'text' : 'password'}
                  className="input font-medium pr-10"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCur(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCur(!showCur)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 text-sm"
                  tabIndex="-1"
                >
                  {showCur ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* New Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">New Password *</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="input font-medium pr-10"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNew(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 text-sm"
                    tabIndex="-1"
                  >
                    {showNew ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    className="input font-medium pr-10"
                    placeholder="Re-enter new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConf(!showConf)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 text-sm"
                    tabIndex="-1"
                  >
                    {showConf ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Strength Meter */}
            {newPassword && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Password Strength:</span>
                  <span className={`font-extrabold ${currentStrength.text}`}>{currentStrength.label}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${currentStrength.color} ${currentStrength.width} transition-all duration-300 rounded-full`} />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-slate-400">
              Session will terminate immediately upon password update.
            </p>
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto text-xs py-3 px-8 shadow-md shadow-brand-500/20 hover:shadow-brand-500/30 transition-all font-bold"
              disabled={saving || !hasLength || !hasLetter || !hasNumber || !matches}
            >
              {saving ? 'Updating Password...' : '🔒 Save New Password'}
            </button>
          </div>
        </form>

        {/* Right Side: Security Policy & Checklist */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Validation Checklist */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="text-lg">🛡️</span>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Password Requirements
                </h3>
                <p className="text-[11px] text-slate-400">Meet all criteria to unlock saving</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  hasLength
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 shadow-2xs font-semibold'
                    : 'bg-slate-50/80 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${hasLength ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {hasLength ? '✓' : '1'}
                  </span>
                  <span>At least 8 characters</span>
                </div>
                <span className="font-extrabold">{hasLength ? 'Met' : 'Pending'}</span>
              </div>

              <div
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  hasLetter
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 shadow-2xs font-semibold'
                    : 'bg-slate-50/80 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${hasLetter ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {hasLetter ? '✓' : '2'}
                  </span>
                  <span>Contains at least 1 letter (a-z / A-Z)</span>
                </div>
                <span className="font-extrabold">{hasLetter ? 'Met' : 'Pending'}</span>
              </div>

              <div
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  hasNumber
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 shadow-2xs font-semibold'
                    : 'bg-slate-50/80 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${hasNumber ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {hasNumber ? '✓' : '3'}
                  </span>
                  <span>Contains at least 1 number (0-9)</span>
                </div>
                <span className="font-extrabold">{hasNumber ? 'Met' : 'Pending'}</span>
              </div>

              <div
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  matches
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 shadow-2xs font-semibold'
                    : confirm
                    ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                    : 'bg-slate-50/80 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${matches ? 'bg-emerald-600 text-white' : confirm ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {matches ? '✓' : confirm ? '✕' : '4'}
                  </span>
                  <span>Both passwords match</span>
                </div>
                <span className="font-extrabold">
                  {matches ? 'Matching' : confirm ? 'Mismatch' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Account Security Information Card */}
          <div className="card p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border-0 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                Active Security Session
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                {roleLabel(user.role)}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Updating your password will immediately invalidate all active login tokens across other devices for maximum security.
            </p>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>Account: <b className="text-white">@{user.username}</b></span>
              <span className="text-emerald-400 font-bold">● Protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

