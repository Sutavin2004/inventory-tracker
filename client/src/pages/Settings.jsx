import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Store, Package, User, Save, CreditCard, CheckCircle, AlertTriangle, ExternalLink, Unlink, Shield, RefreshCw } from 'lucide-react';
import { getStoreSettings, updateStoreSettings, startStripeConnect, getStripeStatus, disconnectStripe, getStripeDashboardLink } from '../api/adminApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { addToast }    = useToast();
  const { user }        = useAuth();
  const location        = useLocation();
  const navigate        = useNavigate();
  const [tab, setTab]   = useState('storefront');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [settings, setSettings] = useState(null);

  // Stripe state
  const [stripeStatus,    setStripeStatus]    = useState(null);
  const [stripeLoading,   setStripeLoading]   = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [disconnecting,   setDisconnecting]   = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // Handle ?stripe=success or ?stripe=refresh redirect from Stripe
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stripeParam = params.get('stripe');
    if (stripeParam === 'success') {
      addToast('Stripe account connected! Refreshing status…', 'success');
      setTab('payments');
      navigate('/settings', { replace: true });
      refreshStripeStatus();
    } else if (stripeParam === 'refresh') {
      addToast('Please complete your Stripe setup.', 'info');
      setTab('payments');
      navigate('/settings', { replace: true });
      handleStartStripe();
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      getStoreSettings()
        .then(setSettings)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Load Stripe status whenever the payments tab is opened
  useEffect(() => {
    if (tab === 'payments' && user?.role === 'admin' && !stripeStatus) {
      refreshStripeStatus();
    }
  }, [tab]);

  const refreshStripeStatus = async () => {
    setStripeLoading(true);
    try {
      const data = await getStripeStatus();
      setStripeStatus(data);
    } catch (_) {
      setStripeStatus({ status: 'not_connected' });
    } finally {
      setStripeLoading(false);
    }
  };

  const handleStartStripe = async () => {
    setStripeConnecting(true);
    try {
      const data = await startStripeConnect();
      window.location.href = data.url;
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to start Stripe onboarding', 'error');
      setStripeConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirmDisconnect) { setConfirmDisconnect(true); return; }
    setDisconnecting(true);
    try {
      await disconnectStripe();
      setStripeStatus({ status: 'not_connected' });
      setConfirmDisconnect(false);
      addToast('Stripe account disconnected', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to disconnect', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDashboardLink = async () => {
    try {
      const data = await getStripeDashboardLink();
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to open Stripe dashboard', 'error');
    }
  };

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSettings(s => ({ ...s, [k]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStoreSettings(settings);
      addToast('Store settings saved!', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 placeholder-slate-500";
  const labelClass = "text-xs font-semibold text-slate-400 block mb-1";

  const TABS = [
    { id: 'storefront', label: 'Storefront', Icon: Store },
    { id: 'commerce',   label: 'Commerce',   Icon: Package },
    { id: 'payments',   label: 'Payments',   Icon: CreditCard },
    { id: 'contact',    label: 'Contact',    Icon: User },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-display">Settings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage your store configuration</p>
        </div>
        {user?.role === 'admin' && settings && tab !== 'payments' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-400">Loading settings...</div>
      ) : user?.role !== 'admin' ? (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-400">
          <SettingsIcon size={32} className="mx-auto mb-2 text-slate-600" />
          <p>Settings are only available to store admins.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-xl p-1 w-fit flex-wrap">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.id ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <t.Icon size={15} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
            {/* Storefront Tab */}
            {tab === 'storefront' && (
              <div className="space-y-5">
                <h2 className="text-white font-bold text-lg">Storefront Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Store Display Name</label>
                    <input value={settings?.display_name || ''} onChange={set('display_name')} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Store Tagline</label>
                    <input value={settings?.store_tagline || ''} onChange={set('store_tagline')} placeholder="Your trusted warehouse partner" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Store Description</label>
                    <textarea value={settings?.store_description || ''} onChange={set('store_description')} rows={3} className={`${inputClass} resize-none`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Banner Image URL</label>
                    <input value={settings?.store_banner_url || ''} onChange={set('store_banner_url')} placeholder="https://..." className={inputClass} />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-8 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={!!settings?.accept_orders} onChange={set('accept_orders')} className="accent-teal-500 w-4 h-4" />
                      <div>
                        <p className="text-slate-200 text-sm font-medium">Accept Orders</p>
                        <p className="text-slate-500 text-xs">Allow customers to place new orders</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={!!settings?.maintenance_mode} onChange={set('maintenance_mode')} className="accent-red-500 w-4 h-4" />
                      <div>
                        <p className="text-slate-200 text-sm font-medium">Maintenance Mode</p>
                        <p className="text-slate-500 text-xs">Show maintenance message to customers</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Commerce Tab */}
            {tab === 'commerce' && (
              <div className="space-y-5">
                <h2 className="text-white font-bold text-lg">Commerce Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Currency</label>
                    <select value={settings?.currency || 'CAD'} onChange={set('currency')} className={inputClass}>
                      <option value="CAD">CAD — Canadian Dollar</option>
                      <option value="USD">USD — US Dollar</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tax Rate (%)</label>
                    <input type="number" step="0.01" min="0" max="100"
                      value={((settings?.tax_rate || 0.13) * 100).toFixed(2)}
                      onChange={e => setSettings(s => ({ ...s, tax_rate: parseFloat(e.target.value) / 100 }))}
                      className={inputClass}
                    />
                    <p className="text-slate-500 text-xs mt-1">Current: {((settings?.tax_rate || 0.13) * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <label className={labelClass}>Flat Shipping Fee ($)</label>
                    <input type="number" step="0.01" min="0" value={settings?.shipping_fee || 0} onChange={set('shipping_fee')} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Free Shipping Threshold ($)</label>
                    <input type="number" step="0.01" min="0" value={settings?.free_shipping_threshold || 0} onChange={set('free_shipping_threshold')} className={inputClass} />
                    <p className="text-slate-500 text-xs mt-1">Set to 0 to disable free shipping</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Tab — Stripe Connect */}
            {tab === 'payments' && (
              <div className="space-y-6">
                <h2 className="text-white font-bold text-lg">Payment Settings</h2>

                {stripeLoading ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    Loading payment status...
                  </div>
                ) : stripeStatus?.status === 'active' ? (
                  /* ── State 3: Active ── */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                      <CheckCircle size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-emerald-300 font-semibold">Stripe connected — accepting payments</p>
                        <p className="text-emerald-400/70 text-xs mt-0.5">
                          Customers can pay with all major credit and debit cards.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <p className="text-slate-400 text-xs mb-1">Card Payments</p>
                        <p className={`font-semibold ${stripeStatus.charges_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {stripeStatus.charges_enabled ? 'Enabled' : 'Pending'}
                        </p>
                      </div>
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <p className="text-slate-400 text-xs mb-1">Payouts</p>
                        <p className={`font-semibold ${stripeStatus.payouts_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {stripeStatus.payouts_enabled ? 'Enabled' : 'Pending'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-3 text-xs text-slate-400">
                      Processing fee of <span className="text-slate-200 font-semibold">2.9% + $0.30 CAD</span> is added to customer orders automatically and passed through to Stripe.
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={handleDashboardLink}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-sm transition-colors"
                      >
                        <ExternalLink size={14} /> Open Stripe Dashboard
                      </button>
                      <button
                        onClick={() => refreshStripeStatus()}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-xl text-sm transition-colors"
                      >
                        <RefreshCw size={13} /> Refresh Status
                      </button>
                      <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-xl text-sm transition-colors ${
                          confirmDisconnect
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                        } disabled:opacity-60`}
                      >
                        <Unlink size={13} />
                        {disconnecting ? 'Disconnecting…' : confirmDisconnect ? 'Confirm Disconnect' : 'Disconnect Stripe'}
                      </button>
                    </div>
                    {confirmDisconnect && (
                      <p className="text-red-400 text-xs">
                        This will stop accepting payments. Click again to confirm, or refresh to cancel.
                      </p>
                    )}
                  </div>
                ) : stripeStatus?.status === 'pending' ? (
                  /* ── State 2: Pending ── */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                      <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-300 font-semibold">Your Stripe setup is incomplete</p>
                        <p className="text-amber-400/70 text-xs mt-0.5">
                          Complete your account details on Stripe to start accepting payments.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleStartStripe}
                      disabled={stripeConnecting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60"
                    >
                      {stripeConnecting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Complete Stripe Setup
                    </button>
                  </div>
                ) : (
                  /* ── State 1: Not connected ── */
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-white font-semibold mb-1">Accept payments from customers</h3>
                      <p className="text-slate-400 text-sm">
                        Connect your Stripe account to start accepting credit card payments directly.
                        Payments go straight to your bank — E-Depot never holds your funds.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { icon: Shield,      label: 'Secure',         desc: 'PCI-compliant card processing' },
                        { icon: CreditCard,  label: 'All major cards', desc: 'Visa, Mastercard, Amex, and more' },
                        { icon: CheckCircle, label: 'Direct payouts',  desc: 'Funds sent to your bank account' },
                      ].map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-center">
                          <Icon size={22} className="text-teal-400 mx-auto mb-2" />
                          <p className="text-slate-200 text-sm font-semibold">{label}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-3 text-xs text-slate-400">
                      Processing fee of <span className="text-slate-200 font-semibold">2.9% + $0.30 CAD</span> is added to customer orders automatically — no extra cost to you.
                    </div>

                    <button
                      onClick={handleStartStripe}
                      disabled={stripeConnecting}
                      className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60"
                    >
                      {stripeConnecting
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Connecting…</>
                        : <><CreditCard size={16} /> Connect Stripe Account</>
                      }
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Contact Tab */}
            {tab === 'contact' && (
              <div className="space-y-5">
                <h2 className="text-white font-bold text-lg">Contact Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Store Email</label>
                    <input type="email" value={settings?.store_email || ''} onChange={set('store_email')} placeholder="store@example.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Store Phone</label>
                    <input type="tel" value={settings?.store_phone || ''} onChange={set('store_phone')} placeholder="+1-800-000-0000" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Store Address</label>
                    <input value={settings?.store_address || ''} onChange={set('store_address')} placeholder="123 Warehouse Blvd, Toronto, ON" className={inputClass} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
