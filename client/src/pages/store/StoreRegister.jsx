import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Package, Eye, EyeOff } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function StoreRegister() {
  const { slug }        = useParams();
  const { register }   = useCustomerAuth();
  const navigate       = useNavigate();

  const [form, setForm]       = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      await register(form.full_name, form.email, form.password);
      navigate(`/store/${slug}/catalogue`);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Package size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
            Create your account
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Shopping at <Link to={`/store/${slug}`} className="text-teal-600 font-medium">{slug}</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Full Name</label>
            <input
              type="text" value={form.full_name} onChange={set('full_name')}
              placeholder="Jane Smith" required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Email Address</label>
            <input
              type="email" value={form.email} onChange={set('email')}
              placeholder="you@example.com" required autoComplete="email"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
                placeholder="Min. 6 characters" required minLength={6}
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Confirm Password</label>
            <input
              type="password" value={form.confirm} onChange={set('confirm')}
              placeholder="Re-enter password" required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to={`/store/${slug}/login`} className="text-teal-600 font-semibold hover:text-teal-700">Sign in</Link>
          </p>
        </form>

        <div className="mt-4 text-center">
          <Link to={`/store/${slug}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to store</Link>
        </div>
      </div>
    </div>
  );
}
