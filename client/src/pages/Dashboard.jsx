import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  BarChart3,
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';
import { getStats, getExpiring } from '../api/inventory';
import Spinner from '../components/Spinner';

export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [s, e] = await Promise.all([getStats(), getExpiring()]);
        setStats(s);
        setExpiring(e);
      } catch {
        setError('Failed to load dashboard data. Is the server running?');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-8 text-center">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Items',
      value: stats.totalItems.toLocaleString(),
      Icon:  Package,
      color: 'text-teal-400',
      bg:    'bg-teal-400/10 border-teal-400/20',
      link:  '/inventory',
    },
    {
      label: 'Total Quantity',
      value: stats.totalQuantity.toLocaleString(),
      Icon:  BarChart3,
      color: 'text-blue-400',
      bg:    'bg-blue-400/10 border-blue-400/20',
      link:  '/inventory',
    },
    {
      label: 'Expiring ≤ 7 Days',
      value: stats.expiringSoon,
      Icon:  AlertTriangle,
      color: 'text-red-400',
      bg:    'bg-red-400/10 border-red-400/20',
      link:  '/inventory',
      alert: stats.expiringSoon > 0,
    },
    {
      label: 'Low Stock (< 10)',
      value: stats.lowStock,
      Icon:  TrendingDown,
      color: 'text-yellow-400',
      bg:    'bg-yellow-400/10 border-yellow-400/20',
      link:  '/inventory',
      alert: stats.lowStock > 0,
    },
    {
      label: 'Purchases (7 days)',
      value: stats.recentPurchases,
      Icon:  ShoppingCart,
      color: 'text-purple-400',
      bg:    'bg-purple-400/10 border-purple-400/20',
      link:  '/purchase-history',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Expiry alert banner */}
      {expiring.length > 0 && (
        <div className="bg-red-900/25 border border-red-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1 min-w-0">
              <p className="text-red-300 font-semibold">
                {expiring.length} item{expiring.length !== 1 ? 's' : ''} expiring within 7 days or already expired
              </p>
              <ul className="mt-2 space-y-1">
                {expiring.slice(0, 5).map((item) => (
                  <li key={item.item_id} className="text-red-400/90 text-sm flex gap-2">
                    <span className="text-red-600">•</span>
                    <span>
                      <strong>{item.item_name}</strong> — expires{' '}
                      <span className="font-mono">{item.expiry_date}</span>{' '}
                      (qty: {item.quantity})
                    </span>
                  </li>
                ))}
              </ul>
              {expiring.length > 5 && (
                <Link
                  to="/inventory"
                  className="inline-flex items-center gap-1 mt-2 text-red-400 hover:text-red-300 text-sm underline-offset-2 hover:underline"
                >
                  View {expiring.length - 5} more <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(({ label, value, Icon, color, bg, link, alert }) => (
          <Link
            key={label}
            to={link}
            className={`bg-slate-800 border rounded-2xl p-5 hover:scale-[1.02] transition-all group ${
              alert ? 'border-red-700/40' : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className={`inline-flex p-2.5 rounded-xl border mb-4 ${bg}`}>
              <Icon className={color} size={20} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
              {label}
              <ArrowRight className="opacity-0 group-hover:opacity-60 transition-opacity ml-auto" size={13} />
            </p>
          </Link>
        ))}
      </div>

      {/* Expiring items table */}
      {expiring.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
            <AlertTriangle className="text-red-400" size={17} />
            <h2 className="text-base font-semibold text-white">Items Expiring Soon or Expired</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/40">
                  {['ID', 'Item Name', 'Qty', 'Expiry Date', 'Location'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {expiring.map((item) => (
                  <tr key={item.item_id} className="bg-red-900/10 hover:bg-red-900/20 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 text-sm">{item.item_id}</td>
                    <td className="px-5 py-3.5 text-white text-sm font-medium">{item.item_name}</td>
                    <td className="px-5 py-3.5 text-slate-300 text-sm">{item.quantity}</td>
                    <td className="px-5 py-3.5 text-red-400 text-sm font-mono">{item.expiry_date}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-sm">{item.warehouse_location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.totalItems === 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-14 text-center">
          <Package className="mx-auto text-slate-600 mb-4" size={52} />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No inventory yet</h3>
          <p className="text-slate-500 mb-6">Upload an inventory file to get started.</p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-500 transition-colors font-medium text-sm"
          >
            <Package size={16} /> Upload Inventory
          </Link>
        </div>
      )}
    </div>
  );
}
