import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, ShoppingBag, Users, DollarSign, Package } from 'lucide-react';
import { getAdminOrders, getAdminCustomers } from '../api/adminApi';
import { getStats } from '../api/inventory';

export default function Analytics() {
  const [orders, setOrders]       = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invStats, setInvStats]   = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminOrders({ limit: 200 }).catch(() => ({ orders: [] })),
      getAdminCustomers({ limit: 200 }).catch(() => []),
      getStats().catch(() => null),
    ]).then(([o, c, s]) => {
      setOrders(o.orders || []);
      setCustomers(Array.isArray(c) ? c : []);
      setInvStats(s);
    }).finally(() => setLoading(false));
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? (o.total_amount || 0) : 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.filter(o => o.payment_status === 'paid').length : 0;

  // Orders by status
  const byStatus = {};
  orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

  // Revenue last 7 days
  const revenueByDay = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    revenueByDay[d] = 0;
  }
  orders.forEach(o => {
    const day = o.placed_at?.split('T')[0];
    if (day in revenueByDay && o.payment_status === 'paid') {
      revenueByDay[day] += o.total_amount || 0;
    }
  });

  const maxRev = Math.max(...Object.values(revenueByDay), 1);

  const STAT_CARDS = [
    { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, Icon: DollarSign, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Total Orders', value: orders.length, Icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Avg. Order Value', value: isNaN(avgOrderValue) ? '$0.00' : `$${avgOrderValue.toFixed(2)}`, Icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Total Customers', value: customers.length, Icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Inventory Items', value: invStats?.totalItems || 0, Icon: Package, color: 'text-slate-400', bg: 'bg-slate-500/10' },
    { label: 'Total Stock Units', value: invStats?.totalQuantity || 0, Icon: BarChart2, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-display">Analytics</h1>
        <p className="text-slate-400 text-sm mt-0.5">Store performance overview</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-400">Loading analytics...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {STAT_CARDS.map(({ label, value, Icon, color, bg }) => (
              <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
                    <Icon size={18} className={color} />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Revenue chart (last 7 days) */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4">Revenue — Last 7 Days</h2>
            <div className="flex items-end gap-2 h-32">
              {Object.entries(revenueByDay).map(([day, rev]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-teal-500/70 rounded-t-lg transition-all"
                    style={{ height: `${(rev / maxRev) * 100}%`, minHeight: rev > 0 ? '4px' : '0px' }}
                    title={`$${rev.toFixed(2)}`}
                  />
                  <span className="text-slate-500 text-xs">{day.split('-').slice(1).join('/')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Orders by status */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4">Orders by Status</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="bg-slate-900/60 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">{count}</p>
                  <p className="text-slate-400 text-xs capitalize mt-0.5">{status}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
