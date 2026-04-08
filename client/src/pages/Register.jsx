import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, CheckCircle, XCircle, Eye, EyeOff, ExternalLink, Copy, Check } from 'lucide-react';
import axios from 'axios';

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function Register() {
  const navigate = useNavigate();

  const [displayName, setDisplayName]     = useState('');
  const [username,    setUsername]         = useState('');
  const [password,    setPassword]         = useState('');
  const [confirmPass, setConfirmPass]      = useState('');
  const [showPass,    setShowPass]         = useState(false);
  const [email,       setEmail]            = useState('');

  const [slug,        setSlug]             = useState('');
  const [slugStatus,  setSlugStatus]       = useState(null); // null | 'checking' | 'available' | 'taken'
  const slugTimer = useRef(null);

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null); // { slug, displayName }
  const [copied,  setCopied]  = useState(false);

  // Auto-generate slug from display name
  useEffect(() => {
    const generated = slugify(displayName);
    setSlug(generated);
  }, [displayName]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug) { setSlugStatus(null); return; }
    setSlugStatus('checking');
    clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`/api/auth/check-slug/${slug}`);
        setSlugStatus(data.available ? 'available' : 'taken');
      } catch {
        setSlugStatus(null);
      }
    }, 400);
    return () => clearTimeout(slugTimer.current);
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPass) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    if (slugStatus === 'taken') {
      return setError('That store name is already taken. Please choose another.');
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/register', {
        display_name: displayName.trim(),
        username:     username.trim(),
        password,
        email:        email.trim() || undefined,
      });
      setSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const storeUrl = `${window.location.hostname.includes('edepot.ca')
    ? `https://${success?.slug}.edepot.ca`
    : `${window.location.origin}?store=${success?.slug}`}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(storeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-teal-500/20 border border-teal-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-teal-400" size={36} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Your store is live!
          </h1>
          <p className="text-slate-400 mb-8">
            <span className="text-white font-semibold">{success.displayName}</span> has been created successfully.
          </p>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-6 text-left">
            <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Your store URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-teal-300 text-sm font-mono break-all">{storeUrl}</code>
              <button
                onClick={copyUrl}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Copy URL"
              >
                {copied ? <Check size={16} className="text-teal-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Dashboard
            </button>
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              View Your Store
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center">
            <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-teal-500/30">
              <Package className="text-white" size={26} />
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>E-Depot</h1>
          </Link>
          <p className="text-slate-400 text-sm mt-2">Create your free online store</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          {error && (
            <div className="bg-red-900/40 border border-red-700/60 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Store Display Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Store Display Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Sutavin Tools & Hardware"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 text-sm"
            />
          </div>

          {/* Slug preview */}
          {slug && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Your store URL will be:</p>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">edepot.ca/store/</span>
                <span className="text-teal-300 font-mono text-sm font-semibold">{slug}</span>
                {slugStatus === 'checking' && (
                  <span className="text-slate-500 text-xs ml-auto">Checking…</span>
                )}
                {slugStatus === 'available' && (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs ml-auto">
                    <CheckCircle size={13} /> Available
                  </span>
                )}
                {slugStatus === 'taken' && (
                  <span className="flex items-center gap-1 text-red-400 text-xs ml-auto">
                    <XCircle size={13} /> Already taken
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Admin Username <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              required
              placeholder="your-username"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Used to log in to your admin dashboard</p>
          </div>

          {/* Email (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Email <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 pr-10 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
              placeholder="Re-enter password"
              className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 text-sm ${
                confirmPass && confirmPass !== password
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                  : 'border-slate-600 focus:border-teal-500 focus:ring-teal-500/30'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading || slugStatus === 'taken'}
            className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-600/20 mt-2"
          >
            {loading ? 'Creating your store…' : 'Create My Store'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-5">
          Already have a store?{' '}
          <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
