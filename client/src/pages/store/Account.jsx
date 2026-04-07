import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Heart, User, Lock, Package, ChevronRight, Trash2, ShoppingCart,
} from 'lucide-react';
import {
  getOrders, getOrder, getWishlist, removeFromWishlist, addToCart,
  getProfile, updateProfile, changePassword,
} from '../../api/customerApi';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerLayout from '../../components/CustomerLayout';

const STATUS_COLORS = {
  pending:    'bg-slate-100 text-slate-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped:    'bg-teal-100 text-teal-700',
  delivered:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-red-100 text-red-700',
  refunded:   'bg-purple-100 text-purple-700',
};

export default function Account() {
  const { slug }              = useParams();
  const navigate              = useNavigate();
  const { token, customer, logout } = useCustomerAuth();
  const [tab, setTab]         = useState('orders');
  const [orders, setOrders]   = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [pwForm, setPwForm]   = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg]         = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate(`/store/${slug}/login`); return; }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([getOrders(token), getWishlist(token), getProfile(token)])
      .then(([o, w, p]) => { setOrders(o); setWishlist(w); setProfile(p); setProfileForm(p); })
      .finally(() => setLoading(false));
  }, [token]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    await updateProfile(token, profileForm);
    setMsg('Profile updated!');
    setTimeout(() => setMsg(''), 2000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { setMsg('Passwords do not match'); return; }
    try {
      await changePassword(token, { current_password: pwForm.current_password, new_password: pwForm.new_password });
      setMsg('Password changed!');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleRemoveWishlist = async (productId) => {
    await removeFromWishlist(token, productId);
    setWishlist(prev => prev.filter(i => i.id !== productId));
  };

  const handleAddToCart = async (productId) => {
    await addToCart(token, { product_id: productId, quantity: 1 });
    setMsg('Added to cart!');
    setTimeout(() => setMsg(''), 1500);
  };

  const viewOrder = async (orderNumber) => {
    const order = await getOrder(token, orderNumber);
    setSelectedOrder(order);
  };

  if (!customer) return null;

  const TABS = [
    { id: 'orders',   label: 'My Orders',   Icon: ShoppingBag },
    { id: 'wishlist', label: 'My Wishlist',  Icon: Heart },
    { id: 'profile',  label: 'Profile',      Icon: User },
  ];

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
              My Account
            </h1>
            <p className="text-slate-500 text-sm mt-1">Welcome back, {customer.full_name}!</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-slate-500 hover:text-red-500 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-2 rounded-xl text-sm font-medium ${
            msg.includes('Error') || msg.includes('match') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-8 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelectedOrder(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.Icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Orders tab */}
            {tab === 'orders' && !selectedOrder && (
              <div>
                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <ShoppingBag size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-slate-700">No orders yet</p>
                    <Link to={`/store/${slug}/catalogue`} className="text-teal-600 text-sm hover:underline mt-2 inline-block">
                      Start shopping →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(o => (
                      <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold text-slate-900">{o.order_number}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-700'}`}>
                              {o.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{o.placed_at?.split('T')[0]} · {o.items_count} items</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">${o.total_amount?.toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => viewOrder(o.order_number)}
                          className="flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                          Details <ChevronRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Order detail */}
            {tab === 'orders' && selectedOrder && (
              <div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-sm text-teal-600 hover:text-teal-700 mb-4 flex items-center gap-1 font-medium"
                >
                  ← Back to orders
                </button>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-slate-900">{selectedOrder.order_number}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedOrder.placed_at?.split('T')[0]}</p>
                    </div>
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${STATUS_COLORS[selectedOrder.status]}`}>
                      {selectedOrder.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {selectedOrder.items?.map(item => (
                      <div key={item.id} className="flex justify-between text-sm text-slate-700">
                        <span>{item.product_name} <span className="text-slate-400">×{item.quantity}</span></span>
                        <span className="font-medium">${item.subtotal?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span><span>${selectedOrder.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping</span>
                      <span>{selectedOrder.shipping_amount === 0 ? 'FREE' : `$${selectedOrder.shipping_amount?.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tax</span><span>${selectedOrder.tax_amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100 text-base">
                      <span>Total</span><span>${selectedOrder.total_amount?.toFixed(2)}</span>
                    </div>
                  </div>

                  {selectedOrder.shipping_address && (
                    <div className="mt-4 bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-800 mb-1 text-xs uppercase tracking-wide">Shipped to</p>
                      {(() => {
                        try {
                          const addr = JSON.parse(selectedOrder.shipping_address);
                          return <><p>{addr.full_name}</p><p>{addr.address}</p><p>{addr.city}, {addr.province} {addr.postal_code}</p></>;
                        } catch {
                          return <p>{selectedOrder.shipping_address}</p>;
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wishlist tab */}
            {tab === 'wishlist' && (
              <div>
                {wishlist.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <Heart size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-slate-700">Your wishlist is empty</p>
                    <Link to={`/store/${slug}/catalogue`} className="text-teal-600 text-sm hover:underline mt-2 inline-block">
                      Browse products →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {wishlist.map(item => (
                      <div key={item.wishlist_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <Link to={`/store/${slug}/product/${item.id}`} className="block aspect-square bg-slate-50 flex items-center justify-center">
                          {item.images
                            ? <img src={JSON.parse(item.images)[0]} alt={item.product_name} className="w-full h-full object-cover" />
                            : <Package size={32} className="text-slate-300" />
                          }
                        </Link>
                        <div className="p-3">
                          <p className="text-sm font-medium text-slate-900 line-clamp-2 mb-2">{item.product_name}</p>
                          <p className="text-teal-700 font-bold mb-3">${item.price?.toFixed(2)}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddToCart(item.id)}
                              disabled={item.stock_quantity <= 0}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ShoppingCart size={12} /> Add
                            </button>
                            <button
                              onClick={() => handleRemoveWishlist(item.id)}
                              className="p-1.5 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile tab */}
            {tab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Edit profile */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-bold text-slate-900 mb-4">Personal Information</h3>
                  <form onSubmit={handleProfileSave} className="space-y-3">
                    {[
                      { key: 'full_name', label: 'Full Name', type: 'text' },
                      { key: 'email', label: 'Email Address', type: 'email' },
                      { key: 'phone', label: 'Phone Number', type: 'tel' },
                      { key: 'default_shipping_address', label: 'Default Shipping Address', type: 'text' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">{f.label}</label>
                        <input
                          type={f.type}
                          value={profileForm[f.key] || ''}
                          onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                        />
                      </div>
                    ))}
                    <button
                      type="submit"
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                      Save Changes
                    </button>
                  </form>
                </div>

                {/* Change password */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Lock size={16} /> Change Password
                  </h3>
                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    {[
                      { key: 'current_password', label: 'Current Password' },
                      { key: 'new_password', label: 'New Password' },
                      { key: 'confirm', label: 'Confirm New Password' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">{f.label}</label>
                        <input
                          type="password"
                          value={pwForm[f.key]}
                          onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                        />
                      </div>
                    ))}
                    <button
                      type="submit"
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                      Change Password
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
