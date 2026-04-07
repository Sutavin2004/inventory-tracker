import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, CreditCard, CheckCircle, ChevronRight, Package, Lock } from 'lucide-react';
import { getCart } from '../../api/customerApi';
import { placeOrder } from '../../api/customerApi';
import { getStore } from '../../api/storeApi';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerLayout from '../../components/CustomerLayout';

const STEPS = ['Shipping', 'Payment', 'Review'];

export default function Checkout() {
  const { slug }            = useParams();
  const navigate            = useNavigate();
  const location            = useLocation();
  const { token, customer } = useCustomerAuth();
  const discountId          = location.state?.discount_id;

  const [step, setStep]     = useState(0);
  const [items, setItems]   = useState([]);
  const [store, setStore]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError]   = useState('');

  const [shipping, setShipping] = useState({
    full_name: customer?.full_name || '',
    address: '', city: '', province: 'ON', postal_code: '', phone: '',
  });
  const [payment, setPayment] = useState({
    card_number: '', expiry: '', cvv: '', name_on_card: '',
  });

  useEffect(() => {
    if (!token) { navigate(`/store/${slug}/login`); return; }
    Promise.all([getCart(token), getStore(slug)])
      .then(([cartItems, storeData]) => {
        if (!cartItems.length) { navigate(`/store/${slug}/cart`); return; }
        setItems(cartItems);
        setStore(storeData.store);
      })
      .finally(() => setLoading(false));
  }, [token, slug]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = store
    ? (subtotal >= store.free_shipping_threshold && store.free_shipping_threshold > 0 ? 0 : store.shipping_fee)
    : 0;
  const taxAmount = subtotal * (store?.tax_rate || 0.13);
  const total = subtotal + shippingFee + taxAmount;

  const handlePlaceOrder = async () => {
    setError('');
    setPlacing(true);
    try {
      const result = await placeOrder(token, {
        shipping_address: shipping,
        payment_method: 'card',
        discount_id: discountId || null,
      });
      navigate(`/store/${slug}/order-confirmation/${result.order_number}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-8" style={{ fontFamily: 'var(--font-display)' }}>
          Checkout
        </h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${i === step ? 'text-teal-700' : i < step ? 'text-emerald-600' : 'text-slate-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  i === step ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : i < step ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                  : 'border-slate-200 text-slate-400'
                }`}>
                  {i < step ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className="text-sm font-semibold hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={16} className="text-slate-300" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main form */}
          <div className="lg:col-span-2">
            {/* Step 0: Shipping */}
            {step === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-teal-600" /> Shipping Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'full_name', label: 'Full Name', type: 'text', colSpan: 2 },
                    { key: 'address', label: 'Street Address', type: 'text', colSpan: 2 },
                    { key: 'city', label: 'City', type: 'text', colSpan: 1 },
                    { key: 'province', label: 'Province', type: 'text', colSpan: 1 },
                    { key: 'postal_code', label: 'Postal Code', type: 'text', colSpan: 1 },
                    { key: 'phone', label: 'Phone Number', type: 'tel', colSpan: 1 },
                  ].map(f => (
                    <div key={f.key} className={f.colSpan === 2 ? 'sm:col-span-2' : ''}>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">{f.label}</label>
                      <input
                        type={f.type}
                        value={shipping[f.key]}
                        onChange={e => setShipping(s => ({ ...s, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (!shipping.full_name || !shipping.address || !shipping.city || !shipping.postal_code) {
                      setError('Please fill in all required fields'); return;
                    }
                    setError(''); setStep(1);
                  }}
                  className="mt-6 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
                >
                  Continue to Payment
                </button>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              </div>
            )}

            {/* Step 1: Payment */}
            {step === 1 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <CreditCard size={18} className="text-teal-600" /> Payment Details
                </h2>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5 text-amber-700 text-xs">
                  <Lock size={12} />
                  This is a demo payment form — no real charges are made.
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Card Number</label>
                    <input
                      value={payment.card_number}
                      onChange={e => setPayment(p => ({ ...p, card_number: e.target.value.replace(/[^\d]/g, '').substring(0, 16) }))}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Name on Card</label>
                    <input
                      value={payment.name_on_card}
                      onChange={e => setPayment(p => ({ ...p, name_on_card: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Expiry Date</label>
                      <input
                        value={payment.expiry}
                        onChange={e => setPayment(p => ({ ...p, expiry: e.target.value }))}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">CVV</label>
                      <input
                        value={payment.cvv}
                        onChange={e => setPayment(p => ({ ...p, cvv: e.target.value.replace(/[^\d]/g, '').substring(0, 4) }))}
                        placeholder="123"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(0)} className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                    Back
                  </button>
                  <button onClick={() => { setError(''); setStep(2); }} className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors">
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-5">Review Your Order</h2>

                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Shipping to</h3>
                  <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 space-y-0.5">
                    <p className="font-medium text-slate-900">{shipping.full_name}</p>
                    <p>{shipping.address}</p>
                    <p>{shipping.city}, {shipping.province} {shipping.postal_code}</p>
                    {shipping.phone && <p>{shipping.phone}</p>}
                  </div>
                </div>

                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Items ({items.length})</h3>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-700">{item.product_name} <span className="text-slate-400">×{item.quantity}</span></span>
                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placing}
                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {placing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                    {placing ? 'Placing...' : 'Place Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-24">
              <h3 className="font-bold text-slate-900 mb-4">Order Total</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>{shippingFee === 0 ? <span className="text-emerald-600 font-medium">FREE</span> : `$${shippingFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-3 mt-2 text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-xs text-slate-500">
                <Lock size={11} />
                Secure checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
