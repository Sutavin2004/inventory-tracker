import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Package, Eye, EyeOff, Store, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate        = useNavigate();

  // Tab: 'admin' | 'customer'
  const [tab, setTab] = useState('admin');

  // Admin login form
  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [storeSlug,   setStoreSlug]   = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [rememberMe,  setRememberMe]  = useState(false);

  // Customer login form
  const [custSlug,     setCustSlug]     = useState('');
  const [custEmail,    setCustEmail]    = useState('');
  const [custPass,     setCustPass]     = useState('');
  const [showCustPass, setShowCustPass] = useState(false);

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  // ── Admin / store-owner login ──────────────────────────────────────────────
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password, storeSlug.trim() || undefined, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── Customer login ─────────────────────────────────────────────────────────
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!custSlug.trim()) { setError('Please enter the store address (slug).'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post('/api/customer/login', {
        email: custEmail.trim(),
        password: custPass,
        company_slug: custSlug.trim(),
      });
      const slug = custSlug.trim();
      localStorage.setItem(`customerToken_${slug}`, data.token);
      localStorage.setItem(`customerUser_${slug}`, JSON.stringify(data.customer));
      navigate(`/store/${slug}/catalogue`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Login failed. Check your credentials and store address.');
    } finally {
      setLoading(false);
    }
  };

  const tabBtn = (id, label, Icon) => (
    <button
      type="button"
      onClick={() => { setTab(id); setError(''); }}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
        tab === id
          ? 'bg-teal-600 text-white shadow'
          : 'text-slate-400 hover:text-white'
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30">
              <Package className="text-white" size={30} />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>E-Depot</h1>
          <p className="text-slate-400 text-sm mt-1">Warehouse Commerce Platform</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 mb-5">
          {tabBtn('admin',    "I'm a Store Owner", Store)}
          {tabBtn('customer', "I'm a Customer",    User)}
        </div>

        {/* ── Store Owner / Admin Tab ──────────────────────────────────────── */}
        {tab === 'admin' && (
          <form
            onSubmit={handleAdminSubmit}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            {error && (
              <div className="bg-red-900/40 border border-red-700/60 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="admin"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 pr-10 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Store Slug <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-sm">
                <span className="text-slate-500 whitespace-nowrap">edepot.ca/store/</span>
                <input
                  type="text"
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-store"
                  className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Leave blank for demo login</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500/30"
              />
              <span className="text-slate-400 text-sm">Remember me for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-500 disabled:opacity-60 transition-colors shadow-lg shadow-teal-600/20"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <p className="text-center text-slate-500 text-sm">
              No store yet?{' '}
              <Link to="/register" className="text-teal-400 hover:text-teal-300 font-medium">
                Create one free
              </Link>
            </p>
          </form>
        )}

        {/* ── Customer Tab ─────────────────────────────────────────────────── */}
        {tab === 'customer' && (
          <form
            onSubmit={handleCustomerSubmit}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            {error && (
              <div className="bg-red-900/40 border border-red-700/60 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Store Address</label>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-sm">
                <span className="text-slate-500 whitespace-nowrap">edepot.ca/store/</span>
                <input
                  type="text"
                  value={custSlug}
                  onChange={(e) => setCustSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                  autoFocus
                  placeholder="your-store"
                  className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showCustPass ? 'text' : 'password'}
                  value={custPass}
                  onChange={(e) => setCustPass(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 pr-10 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCustPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showCustPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-500 disabled:opacity-60 transition-colors shadow-lg shadow-teal-600/20"
            >
              {loading ? 'Signing in…' : 'Sign In to Store'}
            </button>
          </form>
        )}

        {/* Demo credentials hint */}
        <div className="mt-4 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400 mb-1">Demo credentials</p>
          {tab === 'admin' ? (
            <>
              <p>Admin: <span className="text-slate-300 font-mono">admin / admin123</span></p>
              <p>Store: <span className="text-slate-300 font-mono">edepot-demo</span> (or leave blank)</p>
            </>
          ) : (
            <>
              <p>Store: <span className="text-slate-300 font-mono">edepot-demo</span></p>
              <p>Customer: <span className="text-slate-300 font-mono">jane@example.com / customer123</span></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
