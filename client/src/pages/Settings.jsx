import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Store, Package, User, Save } from 'lucide-react';
import { getStoreSettings, updateStoreSettings } from '../api/adminApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { addToast } = useToast();
  const { user }     = useAuth();
  const [tab, setTab]     = useState('storefront');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      getStoreSettings()
        .then(setSettings)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

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
    { id: 'contact',    label: 'Contact',    Icon: User },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-display">Settings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage your store configuration</p>
        </div>
        {user?.role === 'admin' && settings && (
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
          <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-xl p-1 w-fit">
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
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — British Pound</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tax Rate (%)</label>
                    <input type="number" step="0.01" min="0" max="100" value={((settings?.tax_rate || 0.13) * 100).toFixed(2)} onChange={e => setSettings(s => ({ ...s, tax_rate: parseFloat(e.target.value) / 100 }))} className={inputClass} />
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
