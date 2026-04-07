import { useState, useEffect } from 'react';
import { Store, Users, ShoppingBag, Package, DollarSign } from 'lucide-react';
import { getPlatformStats } from '../../api/platformApi';
import { usePlatformAuth } from '../../context/PlatformAuthContext';

export default function PlatformDashboard() {
  const { token }       = usePlatformAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformStats(token).then(setStats).finally(() => setLoading(false));
  }, [token]);

  const CARDS = stats ? [
    { label: 'Registered Stores', value: stats.totalCompanies, Icon: Store, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Total Customers', value: stats.totalCustomers, Icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Orders', value: stats.totalOrders, Icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Published Products', value: stats.totalProducts, Icon: Package, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Platform Revenue', value: `$${(stats.totalRevenue || 0).toFixed(2)}`, Icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-display">Platform Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">E-Depot platform overview</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-400">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CARDS.map(({ label, value, Icon, color, bg }) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={18} className={color} />
                </div>
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Recently registered stores */}
          {stats?.recentStores?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="text-white font-bold">Recently Registered Stores</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 font-semibold uppercase tracking-wide border-b border-slate-800">
                    <th className="px-5 py-3 text-left">Store</th>
                    <th className="px-5 py-3 text-left hidden md:table-cell">Admin</th>
                    <th className="px-5 py-3 text-left hidden lg:table-cell">Registered</th>
                    <th className="px-5 py-3 text-center">Orders</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentStores.map(s => (
                    <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-slate-200 font-medium">{s.display_name}</p>
                        <p className="text-slate-500 text-xs font-mono">{s.slug}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-400 hidden md:table-cell">{s.admin_username || '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs hidden lg:table-cell">{s.created_at?.split('T')[0]}</td>
                      <td className="px-5 py-3 text-center text-slate-300">{s.order_count}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
