import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, Package, Tag, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  getCart, updateCartItem, removeCartItem, clearCart, applyDiscount
} from '../../api/customerApi';
import { getStore } from '../../api/storeApi';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerLayout from '../../components/CustomerLayout';

export default function Cart() {
  const { slug }              = useParams();
  const { token, customer }   = useCustomerAuth();
  const navigate              = useNavigate();

  const [items, setItems]         = useState([]);
  const [store, setStore]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount]   = useState(null);
  const [discountErr, setDiscountErr] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const fetchCart = () => {
    if (!token) { setLoading(false); return; }
    Promise.all([getCart(token), getStore(slug)])
      .then(([cartItems, storeData]) => {
        setItems(cartItems);
        setStore(storeData.store);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCart(); }, [token, slug]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountSavings = discount ? discount.savings : 0;
  const discountedSub   = Math.max(0, subtotal - discountSavings);
  const shippingFee     = store
    ? (discountedSub >= store.free_shipping_threshold && store.free_shipping_threshold > 0 ? 0 : store.shipping_fee)
    : 0;
  const taxAmount       = discountedSub * (store?.tax_rate || 0.13);
  const total           = discountedSub + shippingFee + taxAmount;

  const updateQty = async (itemId, newQty) => {
    if (newQty < 1) { await removeCartItem(token, itemId); fetchCart(); return; }
    await updateCartItem(token, itemId, newQty);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
  };

  const removeItem = async (itemId) => {
    await removeCartItem(token, itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleApplyDiscount = async () => {
    setDiscountErr('');
    setApplyingDiscount(true);
    try {
      const result = await applyDiscount(token, { code: discountCode, subtotal });
      setDiscount(result);
    } catch (err) {
      setDiscountErr(err.response?.data?.error || 'Invalid code');
      setDiscount(null);
    } finally {
      setApplyingDiscount(false);
    }
  };

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <ShoppingCart size={48} className="text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Sign in to view your cart</h2>
          <Link
            to={`/store/${slug}/login`}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-8" style={{ fontFamily: 'var(--font-display)' }}>
          Shopping Cart {items.length > 0 && <span className="text-slate-400 font-normal text-lg">({items.length} items)</span>}
        </h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <ShoppingCart size={48} className="text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-6">Looks like you haven't added anything yet.</p>
            <Link
              to={`/store/${slug}/catalogue`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
            >
              <Package size={18} />
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-3">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.images
                      ? <img src={JSON.parse(item.images)[0]} alt={item.product_name} className="w-full h-full object-cover rounded-xl" />
                      : <Package size={24} className="text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/store/${slug}/product/${item.product_id}`} className="font-semibold text-slate-900 text-sm hover:text-teal-600 line-clamp-1">
                      {item.product_name}
                    </Link>
                    <p className="text-teal-700 font-bold mt-0.5">${item.price.toFixed(2)}</p>
                    {item.stock_quantity < 10 && item.stock_quantity > 0 && (
                      <p className="text-amber-600 text-xs font-medium mt-0.5">Only {item.stock_quantity} left</p>
                    )}
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} className="px-2.5 py-2 hover:bg-slate-50 transition-colors">
                      <Minus size={13} />
                    </button>
                    <span className="px-3 py-2 text-sm font-semibold min-w-[2rem] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock_quantity}
                      className="px-2.5 py-2 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="text-right w-20 flex-shrink-0">
                    <p className="font-bold text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <div className="flex justify-between items-center pt-2">
                <Link to={`/store/${slug}/catalogue`} className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1 font-medium">
                  <ArrowLeft size={14} /> Continue Shopping
                </Link>
              </div>
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-24">
                <h3 className="font-bold text-slate-900 mb-4">Order Summary</h3>

                {/* Discount code */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={discountCode}
                        onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                        placeholder="Discount code"
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                      />
                    </div>
                    <button
                      onClick={handleApplyDiscount}
                      disabled={applyingDiscount || !discountCode}
                      className="px-3 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {discountErr && <p className="text-red-600 text-xs mt-1">{discountErr}</p>}
                  {discount && <p className="text-emerald-600 text-xs mt-1 font-medium">{discount.message}</p>}
                </div>

                <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discountSavings > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-${discountSavings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping</span>
                    <span>{shippingFee === 0 ? <span className="text-emerald-600 font-medium">FREE</span> : `$${shippingFee.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({((store?.tax_rate || 0.13) * 100).toFixed(0)}%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-slate-900 border-t border-slate-200 pt-3 mt-3">
                    <span>Total</span>
                    <span>${total.toFixed(2)} CAD</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/store/${slug}/checkout`, {
                    state: { discount_id: discount?.discount_id }
                  })}
                  className="w-full flex items-center justify-center gap-2 mt-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </button>

                {store?.free_shipping_threshold > 0 && subtotal < store.free_shipping_threshold && (
                  <p className="text-xs text-center text-slate-500 mt-3">
                    Add ${(store.free_shipping_threshold - subtotal).toFixed(2)} more for free shipping!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
