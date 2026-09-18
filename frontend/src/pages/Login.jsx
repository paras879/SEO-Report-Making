import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EMAIL_REGEX } from '../constants';

const DEMO_ACCOUNTS = [
  { role: 'Supervisor', identifier: 'supervisor', pass: 'Supervisor@12345', icon: '🛡️', color: 'from-purple-500 to-indigo-600' },
  { role: 'Developer', identifier: 'developer', pass: 'Dev@12345', icon: '💻', color: 'from-amber-500 to-orange-600' },
  { role: 'Designer', identifier: 'designer', pass: 'Design@12345', icon: '🎨', color: 'from-pink-500 to-rose-600' },
  { role: 'Super Admin', identifier: 'superadmin', pass: 'Super@12345', icon: '👑', color: 'from-blue-500 to-cyan-600' },
  { role: 'Employee', identifier: 'Paras', pass: 'Employee@12345', icon: '👤', color: 'from-emerald-500 to-teal-600' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillCredentials = (acc) => {
    setIdentifier(acc.identifier);
    setPassword(acc.pass);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const idf = identifier.trim();
    if (idf.includes('@') && !EMAIL_REGEX.test(idf)) {
      setError('Please enter a valid email format (e.g. user@domain.com)');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const user = await login(idf, password);
      if (user.must_change_password) navigate('/change-password');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#070b14] px-4 py-12 overflow-hidden select-none font-sans">
      {/* ------------------------------------------------------------------------- */}
      {/* Dynamic Animated Ambient Background Orbs */}
      {/* ------------------------------------------------------------------------- */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-600/30 to-purple-600/20 blur-[120px] pointer-events-none animate-blob-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-cyan-600/25 to-blue-600/20 blur-[120px] pointer-events-none animate-blob-2" />
      <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-brand-600/20 to-pink-600/15 blur-[100px] pointer-events-none animate-blob-3" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* ------------------------------------------------------------------------- */}
      {/* Main Login Container */}
      {/* ------------------------------------------------------------------------- */}
      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Brand Logo & Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-brand-500 to-cyan-400 text-white flex items-center justify-center text-3xl shadow-xl animate-pulse-glow">
              ⚡
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight">
            SEO Report System
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1.5 font-medium tracking-wide">
            Enterprise Hub • Sign in to access workspace
          </p>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* Glassmorphic Card */}
        {/* ------------------------------------------------------------------------- */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-7 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle top border glow bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80" />

          {/* Error Banner */}
          {error && (
            <div className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold p-4 flex items-start gap-3 backdrop-blur-sm animate-fade-in-up">
              <span className="text-base shrink-0">⚠️</span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            {/* Username or Email Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 text-sm">👤</span>
                <input
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-800/60 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all duration-200"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Username or email..."
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 text-sm">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-800/60 pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all duration-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white p-1 text-sm transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl py-3.5 px-4 text-sm font-extrabold text-white bg-gradient-to-r from-indigo-600 via-brand-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <span className="group-hover:translate-x-1 transition-transform">➔</span>
                </>
              )}
            </button>
          </form>

          {/* ------------------------------------------------------------------------- */}
          {/* Quick Demo Login Credentials (1-Click Fill) */}
          {/* ------------------------------------------------------------------------- */}
          <div className="mt-7 pt-5 border-t border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2.5">
              ⚡ Quick Test Credentials (Click to Auto-fill)
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillCredentials(acc)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/60 text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                  title={`Click to fill ${acc.role} credentials`}
                >
                  <span>{acc.icon}</span>
                  <span>{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* Security Badge Footer */}
        {/* ------------------------------------------------------------------------- */}
        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2 font-medium">
          <span className="text-emerald-400 text-sm">🛡️</span>
          <span>Role-Based Security • 256-bit Encrypted Session</span>
        </div>
      </div>
    </div>
  );
}
