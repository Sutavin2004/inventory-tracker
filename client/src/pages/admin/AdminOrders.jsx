import { useState, useEffect } from 'react';
import { ShoppingBag, ChevronRight, Search, Filter, X, Download } from 'lucide-react';
import { getAdminOrders, getAdminOrder, updateOrderStatus, cancelOrder } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

const STATUS_COLORS = {
  pending:    'bg-slate-600/60 text-slate-300',
  confirmed:  'bg-blue-500/20 text-blue-300',
  processing: 'bg-amber-500/20 text-amber-300',
  shipped:    'bg-teal-500/20 text-teal-300',
  delivered:  'bg-emerald-500/20 text-emerald-300',
  cancelled:  'bg-red-500/20 text-red-300',
  refunded:   'bg-purple-500/20 text-purple-300',
};

const STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];

export default function AdminOrders() {
  const { addToast }            = useToast();
  const [orders, setOrders]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters]   = useState({ status: '', startDate: '', endDate: '', customerName: '' });
  const [page, setPage]         = useState(1);

  const fetchOrders = () => {
    setLoading(true);
    getAdminOrders({ ...filters, page, limit: 50 })
      .then(d => { setOrders(d.orders); setTotal(d.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filters, page]);

  const viewOrder = async (id) => {
    const o = await getAdminOrder(id);
    setSelected(o);
  };

  const handleStatusUpdate = async (id, status) => {
    await updateOrderStatus(id, status);
    addToast(`Order status updated to "${status}"`, 'success');
    if (selected) setSelected(prev => ({ ...prev, status }));
    fetchOrders();
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this order? Inventory will be restored.')) return;
    try {
      await cancelOrder(id);
      addToast('Order cancelled and inventory restored', 'success');
      if (selected) setSelected(null);
      fetchOrders();
    } catch (err) {
      addToast(err.response?.data?.error || 'Cannot cancel order', 'error');
    }
  };

  const exportCSV = () => {
    const header = ['Order Number','Customer','Date','Items','Total','Status','Payment'];
    const rows = orders.map(o => [
      o.order_number, o.customer_name, o.placed_at?.split('T')[0],
      o.items_count, o.total_amount?.toFixed(2), o.status, o.payment_status,
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-display">Orders</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} total orders</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <input
          type="date" value={filters.startDate}
          onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1); }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <input
          type="date" value={filters.endDate}
          onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1); }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="Customer name..."
            value={filters.customerName}
            onChange={e => { setFilters(f => ({ ...f, customerName: e.target.value })); setPage(1); }}
            className="pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder-slate-500"
          />
        </div>
        {(filters.status || filters.startDate || filters.endDate || filters.customerName) && (
          <button
            onClick={() => { setFilters({ status: '', startDate: '', endDate: '', customerName: '' }); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-slate-200 text-sm rounded-xl border border-slate-700 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Orders table */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <ShoppingBag size={28} className="mb-2" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Customer</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-teal-300 text-xs">{o.order_number}</td>
                  <td className="px-4 py-3 text-slate-300 hidden md:table-cell">
                    <div>
                      <p className="font-medium">{o.customer_name}</p>
                      <p className="text-slate-500 text-xs">{o.customer_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">{o.placed_at?.split('T')[0]}</td>
                  <td className="px-4 py-3 text-right font-bold text-white">${o.total_amount?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      o.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => viewOrder(o.id)}
                      className="flex items-center gap-1 text-teal-400 hover:text-teal-300 text-xs font-medium ml-auto"
                    >
                      View <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
              <div>
                <h2 className="text-white font-bold font-mono">{selected.order_number}</h2>
                <p className="text-slate-400 text-xs">{selected.placed_at?.split('T')[0]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase mb-1">Customer</p>
                  <p className="text-slate-200 font-medium">{selected.customer_name}</p>
                  <p className="text-slate-400 text-xs">{selected.customer_email}</p>
                  {selected.customer_phone && <p className="text-slate-400 text-xs">{selected.customer_phone}</p>}
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase mb-1">Status</p>
                  <select
                    value={selected.status}
                    onChange={e => handleStatusUpdate(selected.id, e.target.value)}
                    className="px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none"
                  >
                    {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
              </div>

              {selected.shipping_address && (
                <div className="bg-slate-900/60 rounded-xl p-3 text-sm">
                  <p className="text-slate-400 text-xs font-semibold uppercase mb-1">Shipping Address</p>
                  {(() => {
                    try {
                      const addr = JSON.parse(selected.shipping_address);
                      return <><p className="text-slate-200">{addr.full_name}</p><p className="text-slate-400">{addr.address}, {addr.city}, {addr.province} {addr.postal_code}</p></>;
                    } catch { return <p className="text-slate-400">{selected.shipping_address}</p>; }
                  })()}
                </div>
              )}

              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase mb-2">Items</p>
                <div className="space-y-2">
                  {selected.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-300">{item.product_name} <span className="text-slate-500">×{item.quantity}</span></span>
                      <span className="text-slate-200 font-medium">${item.subtotal?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span><span>${selected.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Shipping</span>
                  <span>{selected.shipping_amount === 0 ? 'FREE' : `$${selected.shipping_amount?.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span><span>${selected.tax_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-base border-t border-slate-700 pt-2 mt-1">
                  <span>Total</span><span>${selected.total_amount?.toFixed(2)}</span>
                </div>
              </div>

              {!['cancelled','refunded','delivered'].includes(selected.status) && (
                <button
                  onClick={() => handleCancel(selected.id)}
                  className="w-full py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel Order & Restore Inventory
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
