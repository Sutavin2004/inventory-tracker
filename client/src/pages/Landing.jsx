import { Link } from 'react-router-dom';
import {
  Package, ShoppingCart, BarChart3, Shield, Truck, Users,
  Store, ArrowRight, Star, CheckCircle,
} from 'lucide-react';

const FEATURES = [
  {
    Icon: Store,
    title: 'Your Own Storefront',
    desc: 'Get a branded online store at edepot.com/store/your-name. Customise colours, tagline, and product catalogue.',
  },
  {
    Icon: Package,
    title: 'Inventory Management',
    desc: 'Upload bulk inventory via Excel, add items manually, track stock levels, expiry dates, and warehouse locations.',
  },
  {
    Icon: ShoppingCart,
    title: 'Customer Orders',
    desc: 'Customers browse, add to cart, apply discount codes, and checkout. Orders automatically deduct your inventory.',
  },
  {
    Icon: BarChart3,
    title: 'Analytics & Insights',
    desc: 'Monitor orders today, revenue, pending fulfilments, and your best-selling products — all in one dashboard.',
  },
  {
    Icon: Users,
    title: 'Customer Accounts',
    desc: 'Customers register per-store, track their orders, manage wishlists, and leave verified product reviews.',
  },
  {
    Icon: Shield,
    title: 'Secure & Reliable',
    desc: 'JWT-based auth, role separation for admins and customers, and platform-level super admin oversight.',
  },
];

const STEPS = [
  { num: '01', title: 'Register your store', desc: 'Create an account and pick your unique store slug.' },
  { num: '02', title: 'Upload inventory',    desc: 'Import your existing stock via Excel or add items one by one.' },
  { num: '03', title: 'Publish products',    desc: 'Set prices, write descriptions, and go live in minutes.' },
  { num: '04', title: 'Start selling',       desc: 'Customers find your store, add to cart, and checkout securely.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-body)', backgroundColor: 'var(--surface)' }}>
      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="bg-slate-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <Package size={17} className="text-white" />
            </div>
            <span className="text-white font-extrabold text-lg font-display">E-Depot</span>
            <span className="text-teal-400 text-xs font-semibold ml-1 hidden sm:block">Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/store/edepot-demo"
              className="text-slate-300 hover:text-white text-sm font-medium hidden sm:block transition-colors"
            >
              Demo Store
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-white border border-slate-600 hover:border-teal-500 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/platform/login"
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-xl transition-colors"
            >
              Platform Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="hero-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Star size={12} className="fill-teal-400 text-teal-400" />
              The warehouse-grade e-commerce platform
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 font-display">
              Your warehouse.<br />
              <span className="text-teal-400">Your storefront.</span><br />
              One platform.
            </h1>
            <p className="text-slate-300 text-lg md:text-xl leading-relaxed mb-10 max-w-xl">
              E-Depot transforms industrial inventory into a full e-commerce experience — upload stock,
              publish products, accept orders, and manage customers all in one place.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl transition-colors text-sm shadow-lg shadow-teal-500/30"
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
              <Link
                to="/store/edepot-demo"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors text-sm border border-white/20"
              >
                <ShoppingCart size={16} />
                See Demo Store
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ──────────────────────────────────────────────────────── */}
      <div className="bg-teal-700 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm font-medium">
            {[
              { Icon: CheckCircle, text: 'No transaction fees' },
              { Icon: Shield,      text: 'Secure JWT auth' },
              { Icon: Truck,       text: 'Order auto-fulfilment' },
              { Icon: BarChart3,   text: 'Real-time analytics' },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center justify-center gap-2">
                <Icon size={15} /> {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3 font-display">
              Everything you need to sell online
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Built for industrial and warehouse businesses that need more than a basic shop.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-teal-400 hover:shadow-lg transition-all group">
                <div className="w-11 h-11 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:border-teal-600 transition-all">
                  <Icon size={20} className="text-teal-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-slate-900 font-bold text-lg mb-2 font-display">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-white mb-3 font-display">Get selling in 4 steps</h2>
            <p className="text-slate-400 text-lg">From signup to first sale in under an hour.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <div className="text-teal-400 font-extrabold text-3xl font-display mb-4">{num}</div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Package size={40} className="text-teal-600 mx-auto mb-4" />
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4 font-display">
            Ready to launch your warehouse store?
          </h2>
          <p className="text-slate-500 mb-8 text-lg">
            Sign in with your admin credentials or explore the demo store to see the platform in action.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-teal-500/20"
            >
              Sign In <ArrowRight size={16} />
            </Link>
            <Link
              to="/store/edepot-demo"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ShoppingCart size={16} /> Visit Demo Store
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-500 rounded-md flex items-center justify-center">
              <Package size={13} className="text-white" />
            </div>
            <span className="text-white font-bold font-display">E-Depot Platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/store/edepot-demo" className="hover:text-teal-400 transition-colors">Demo Store</Link>
            <Link to="/login"             className="hover:text-teal-400 transition-colors">Admin Login</Link>
            <Link to="/platform/login"    className="hover:text-teal-400 transition-colors">Platform Admin</Link>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} E-Depot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
