import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import axios from 'axios';
import { ShoppingCart, CreditCard, CheckCircle, ChevronRight, Lock, AlertTriangle } from 'lucide-react';
import { getCart } from '../../api/customerApi';
import { getStore } from '../../api/storeApi';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerLayout from '../../components/CustomerLayout';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const STEPS = ['Shipping', 'Payment'];

const STRIPE_APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary:    '#0F766E',
    colorBackground: '#ffffff',
    fontFamily:      'DM Sans, sans-serif',
    borderRadius:    '8px',
  },
};

// ─── Inner payment form (must be inside <Elements>) ───────────────────────────

function PaymentForm({ slug, token, onSuccess, onBack, total }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying]   = useState(false);
  const [error,  setError]    = useState('');

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setError('');
    setPaying(true);

    // Confirm payment with Stripe
    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (stripeErr) {
      setError(stripeErr.message || 'Payment failed');
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      await onSuccess(paymentIntent.id);
    } else {
      setError(`Unexpected payment status: ${paymentIntent?.status}`);
    }
    setPaying(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
        <CreditCard size={18} className="text-teal-600" /> Payment
      </h2>
      <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mb-5 text-teal-700 text-xs">
        <Lock size={12} />
        Secured by Stripe — E-Depot never stores your card details.
      </div>

      <PaymentElement />

      {error && (
        <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          disabled={paying}
          className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          Back
        </button>
        <button
          onClick={handlePay}
          disabled={paying || !stripe}
          className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {paying && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {paying ? 'Processing...' : `Pay $${total.toFixed(2)} CAD`}
        </button>
      </div>
    </div>
  );
}

// ─── Main checkout component ───────────────────────────────────────────────────

export default function Checkout() {
  const { slug }            = useParams();
  const navigate            = useNavigate();
  const location            = useLocation();
  const { token, customer } = useCustomerAuth();
  const discountId          = location.state?.discount_id;

  const [step, setStep]         = useState(0);
  const [items, setItems]       = useState([]);
  const [store, setStore]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [creatingIntent, setCreatingIntent] = useState(false);

  // Stripe state
  const [clientSecret,    setClientSecret]    = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [processingFee,   setProcessingFee]   = useState(0);
  const [stripeTotalAmt,  setStripeTotalAmt]  = useState(0);

  const [shipping, setShipping] = useState({
    full_name: customer?.full_name || '',
    address: '', city: '', province: 'ON', postal_code: '', phone: '',
  });

  useEffect(() => {
    if (!token) { navigate(`/store/${slug}/login`); return; }
    Promise.all([getCart(token), getStore(slug)])
      .then(([cartData, storeData]) => {
        const cartItems = Array.isArray(cartData) ? cartData : (cartData.items || []);
        if (!cartItems.length) { navigate(`/store/${slug}/cart`); return; }
        setItems(cartItems);
        setStore(storeData.store);
      })
      .catch(() => navigate(`/store/${slug}/cart`))
      .finally(() => setLoading(false));
  }, [token, slug]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = store
    ? (subtotal >= store.free_shipping_threshold && store.free_shipping_threshold > 0 ? 0 : store.shipping_fee)
    : 0;
  const taxAmount = subtotal * (store?.tax_rate || 0.13);
  const baseAmount = subtotal + shippingFee + taxAmount;

  // Stripe fee preview (same formula as server)
  const previewTotal = Math.round(((baseAmount + 0.30) / (1 - 0.029)) * 100) / 100;
  const previewFee   = Math.round((previewTotal - baseAmount) * 100) / 100;

  const handleContinueToPayment = async () => {
    if (!shipping.full_name || !shipping.address || !shipping.city || !shipping.postal_code) {
      setError('Please fill in all required shipping fields'); return;
    }
    setError('');

    if (!store?.stripe_charges_enabled) {
      setError('This store is not set up to accept payments yet.'); return;
    }

    setCreatingIntent(true);
    try {
      const resp = await axios.post(
        `/api/store/${slug}/payment/create-intent`,
        { subtotal, tax: taxAmount, shipping: shippingFee, discount: 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClientSecret(resp.data.clientSecret);
      setPaymentIntentId(resp.data.paymentIntentId);
      setProcessingFee(resp.data.processingFee);
      setStripeTotalAmt(resp.data.total);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initialise payment. Please try again.');
    } finally {
      setCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = async (intentId) => {
    try {
      const resp = await axios.post(
        `/api/store/${slug}/payment/confirm`,
        {
          paymentIntentId: intentId,
          shippingAddress: JSON.stringify(shipping),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/store/${slug}/order-confirmation/${resp.data.orderNumber}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment succeeded but order creation failed. Contact support.');
      setStep(0); // bring back to shipping so they can see the error
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

  // Store not set up for payments
  if (store && !store.stripe_charges_enabled) {
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
            <AlertTriangle size={36} className="text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Payments Not Available</h2>
            <p className="text-slate-600">
              This store is not yet set up to accept payments. Please contact the store owner.
            </p>
          </div>
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
                    { key: 'full_name',   label: 'Full Name',      type: 'text', colSpan: 2 },
                    { key: 'address',     label: 'Street Address', type: 'text', colSpan: 2 },
                    { key: 'city',        label: 'City',           type: 'text', colSpan: 1 },
                    { key: 'province',    label: 'Province',       type: 'text', colSpan: 1 },
                    { key: 'postal_code', label: 'Postal Code',    type: 'text', colSpan: 1 },
                    { key: 'phone',       label: 'Phone Number',   type: 'tel',  colSpan: 1 },
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
                {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
                <button
                  onClick={handleContinueToPayment}
                  disabled={creatingIntent}
                  className="mt-6 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creatingIntent && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {creatingIntent ? 'Preparing payment...' : 'Continue to Payment'}
                </button>
              </div>
            )}

            {/* Step 1: Stripe Payment */}
            {step === 1 && clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
              >
                <PaymentForm
                  slug={slug}
                  token={token}
                  total={stripeTotalAmt}
                  onSuccess={handlePaymentSuccess}
                  onBack={() => { setStep(0); setClientSecret(null); }}
                />
              </Elements>
            )}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-24">
              <h3 className="font-bold text-slate-900 mb-4">Order Summary</h3>

              {/* Items */}
              <div className="space-y-1.5 mb-4">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm text-slate-600">
                    <span className="truncate mr-2">{item.product_name} <span className="text-slate-400">×{item.quantity}</span></span>
                    <span className="font-medium flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>{shippingFee === 0 ? <span className="text-emerald-600 font-medium">FREE</span> : `$${shippingFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (HST {Math.round((store?.tax_rate || 0.13) * 100)}%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>Processing fee (2.9% + $0.30)</span>
                  <span>${(step === 1 ? processingFee : previewFee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-3 mt-1 text-base">
                  <span>Order Total</span>
                  <span>${(step === 1 ? stripeTotalAmt : previewTotal).toFixed(2)} CAD</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-4 text-xs text-slate-400">
                <Lock size={11} />
                Secure checkout powered by Stripe
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
