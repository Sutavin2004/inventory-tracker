import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ShoppingCart, Heart, User, Search, Package, Menu, X, ChevronDown, LogOut,
} from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { getCart } from '../api/customerApi';
import { getStore } from '../api/storeApi';

export default function CustomerLayout({ children }) {
  const { slug } = useParams();
  const { customer, token, logout } = useCustomerAuth();
  const [store, setStore]           = useState(null);
  const [cartCount, setCartCount]   = useState(0);
  const [search, setSearch]         = useState('');
  const [menuOpen, setMenuOpen]     = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getStore(slug).then(d => setStore(d.store)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!token) { setCartCount(0); return; }
    getCart(token)
      .then(items => setCartCount(items.reduce((s, i) => s + i.quantity, 0)))
      .catch(() => {});
  }, [token]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/store/${slug}/catalogue?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Top bar */}
      <div className="bg-slate-800 text-slate-300 text-xs text-center py-1.5 px-4">
        Free shipping on orders over ${store?.free_shipping_threshold > 0 ? store.free_shipping_threshold : '100'} CAD &nbsp;·&nbsp;
        <a href={`/store/${slug}/catalogue`} className="text-teal-300 hover:text-teal-200 font-medium">Shop now →</a>
      </div>

      {/* Main header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link to={`/store/${slug}`} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg hidden sm:block" style={{ fontFamily: 'var(--font-display)' }}>
              {store?.display_name || 'E-Depot'}
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-slate-50"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            <Link
              to={`/store/${slug}/catalogue`}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              Catalogue
            </Link>

            {/* Wishlist */}
            {customer && (
              <Link
                to={`/store/${slug}/account`}
                className="p-2 text-slate-500 hover:text-teal-600 transition-colors"
                title="Wishlist"
              >
                <Heart size={20} />
              </Link>
            )}

            {/* Cart */}
            <Link
              to={`/store/${slug}/cart`}
              className="relative p-2 text-slate-500 hover:text-teal-600 transition-colors"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] min-h-[18px] bg-teal-600 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* Account */}
            {customer ? (
              <div className="relative">
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-teal-600 font-medium transition-colors rounded-lg hover:bg-slate-50"
                >
                  <User size={18} />
                  <span className="hidden sm:block">{customer.full_name.split(' ')[0]}</span>
                  <ChevronDown size={14} />
                </button>
                {accountOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAccountOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
                      <Link
                        to={`/store/${slug}/account`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setAccountOpen(false)}
                      >
                        <User size={15} />
                        My Account
                      </Link>
                      <button
                        onClick={() => { logout(); setAccountOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to={`/store/${slug}/login`}
                className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
                  <Package size={14} className="text-white" />
                </div>
                <span className="text-white font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {store?.display_name || 'E-Depot'}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{store?.store_tagline || 'Your trusted warehouse partner'}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Quick Links</h4>
              <ul className="space-y-1.5 text-sm">
                <li><Link to={`/store/${slug}/catalogue`} className="hover:text-teal-400 transition-colors">Product Catalogue</Link></li>
                <li><Link to={`/store/${slug}/cart`} className="hover:text-teal-400 transition-colors">Shopping Cart</Link></li>
                {customer
                  ? <li><Link to={`/store/${slug}/account`} className="hover:text-teal-400 transition-colors">My Account</Link></li>
                  : <li><Link to={`/store/${slug}/login`} className="hover:text-teal-400 transition-colors">Sign In</Link></li>
                }
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Contact</h4>
              <ul className="space-y-1.5 text-sm">
                {store?.store_email  && <li>{store.store_email}</li>}
                {store?.store_phone  && <li>{store.store_phone}</li>}
                {store?.store_address && <li>{store.store_address}</li>}
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-6 text-center text-xs">
            © {new Date().getFullYear()} {store?.display_name || 'E-Depot'}. Powered by E-Depot Platform.
          </div>
        </div>
      </footer>
    </div>
  );
}
