import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EMAIL_REGEX } from '../constants';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 px-4 overflow-hidden">
      {/* Ambient background glow spheres */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-blue-500 shadow-glow text-white text-2xl mb-4">
            ⚡
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            SEO Report System
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Sign in to access your enterprise workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3.5 flex items-center gap-2.5">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Username or Email
              </label>
              <input
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. superadmin"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 hover:from-brand-500 hover:to-indigo-500 shadow-lg shadow-brand-900/40 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In ➔</span>
              )}
            </button>
          </form>
        </div>

        {/* Security Badge Footer */}
        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <span>🛡️</span>
          <span>Role-Based Access Control • End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
}
