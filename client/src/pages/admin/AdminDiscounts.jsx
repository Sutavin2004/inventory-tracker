import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

const EMPTY = {
  code: '', discount_type: 'percentage', discount_value: '',
  min_order_amount: '', max_uses: '', expires_at: '', is_active: true,
};

export default function AdminDiscounts() {
  const { addToast }            = useToast();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  const fetchDiscounts = () => {
    setLoading(true);
    getDiscounts().then(setDiscounts).finally(() => setLoading(false));
  };

  useEffect(() => { fetchDiscounts(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createDiscount(form);
      addToast('Discount code created', 'success');
      setShowForm(false);
      setForm(EMPTY);
      fetchDiscounts();
    } catch (err) {
      addToast(err.response?.data?.error || 'Error creating code', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (d) => {
    await updateDiscount(d.id, { is_active: !d.is_active });
    fetchDiscounts();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this discount code?')) return;
    await deleteDiscount(id);
    addToast('Discount code deleted', 'success');
    fetchDiscounts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-display">Discount Codes</h1>
          <p className="text-slate-400 text-sm mt-0.5">{discounts.length} codes created</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> New Code
        </button>
      </div>

      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">Loading...</div>
        ) : discounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <Tag size={28} className="mb-2" />
            <p className="text-sm">No discount codes yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Min Order</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Uses</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Expires</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map(d => (
                <tr key={d.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-teal-300">{d.code}</td>
                  <td className="px-4 py-3 text-slate-300 capitalize">{d.discount_type}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {d.discount_type === 'percentage' ? `${d.discount_value}%` : `$${d.discount_value.toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 hidden md:table-cell">
                    {d.min_order_amount > 0 ? `$${d.min_order_amount.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400 hidden lg:table-cell">
                    {d.uses_count}{d.max_uses ? `/${d.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden xl:table-cell">
                    {d.expires_at ? d.expires_at : 'No expiry'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(d)}>
                      {d.is_active
                        ? <ToggleRight size={20} className="text-teal-400 mx-auto" />
                        : <ToggleLeft  size={20} className="text-slate-600 mx-auto" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-bold font-display">New Discount Code</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Code *</label>
                <input
                  value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required
                  placeholder="SUMMER20"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Type *</label>
                  <select value={form.discount_type} onChange={set('discount_type')}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Value *</label>
                  <input type="number" step="0.01" min="0" value={form.discount_value} onChange={set('discount_value')} required
                    placeholder={form.discount_type === 'percentage' ? '10' : '20.00'}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Min Order ($)</label>
                  <input type="number" step="0.01" min="0" value={form.min_order_amount} onChange={set('min_order_amount')}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Max Uses</label>
                  <input type="number" min="1" value={form.max_uses} onChange={set('max_uses')}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Expires At</label>
                <input type="date" value={form.expires_at} onChange={set('expires_at')}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-slate-600 text-slate-300 font-semibold rounded-xl text-sm hover:bg-slate-700/50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
