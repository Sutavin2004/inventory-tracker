import { useState, useEffect } from 'react';
import { Store, ExternalLink, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { getPlatformStores, updatePlatformStore } from '../../api/platformApi';
import { usePlatformAuth } from '../../context/PlatformAuthContext';

export default function PlatformStores() {
  const { token }         = usePlatformAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = () => {
    setLoading(true);
    getPlatformStores(token).then(setStores).finally(() => setLoading(false));
  };

  useEffect(() => { fetchStores(); }, []);

  const toggleActive = async (store) => {
    await updatePlatformStore(token, store.id, { is_active: !store.is_active });
    fetchStores();
  };

  const toggleMaintenance = async (store) => {
    await updatePlatformStore(token, store.id, { maintenance_mode: !store.maintenance_mode });
    fetchStores();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-display">All Stores</h1>
        <p className="text-slate-400 text-sm mt-0.5">{stores.length} stores registered on E-Depot</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">Loading...</div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <Store size={28} className="mb-2" />
            <p className="text-sm">No stores registered</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 font-semibold uppercase tracking-wide border-b border-slate-800">
                <th className="px-5 py-3 text-left">Store</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Admin</th>
                <th className="px-5 py-3 text-center hidden lg:table-cell">Inventory</th>
                <th className="px-5 py-3 text-center hidden lg:table-cell">Orders</th>
                <th className="px-5 py-3 text-center hidden xl:table-cell">Customers</th>
                <th className="px-5 py-3 text-left hidden lg:table-cell">Created</th>
                <th className="px-5 py-3 text-center">Active</th>
                <th className="px-5 py-3 text-center hidden md:table-cell">Maintenance</th>
                <th className="px-5 py-3 text-center">View</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(s => (
                <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-slate-200 font-semibold">{s.display_name}</p>
                    <p className="text-slate-500 text-xs font-mono">{s.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-400 hidden md:table-cell">{s.admin_username || '—'}</td>
                  <td className="px-5 py-3 text-center text-slate-300 hidden lg:table-cell">{s.inventory_count}</td>
                  <td className="px-5 py-3 text-center text-slate-300 hidden lg:table-cell">{s.order_count}</td>
                  <td className="px-5 py-3 text-center text-slate-300 hidden xl:table-cell">{s.customer_count}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs hidden lg:table-cell">{s.created_at?.split('T')[0]}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggleActive(s)}>
                      {s.is_active
                        ? <ToggleRight size={20} className="text-emerald-400 mx-auto" />
                        : <ToggleLeft  size={20} className="text-slate-600 mx-auto" />
                      }
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center hidden md:table-cell">
                    <button onClick={() => toggleMaintenance(s)} title="Toggle maintenance mode">
                      <AlertTriangle size={15} className={s.maintenance_mode ? 'text-amber-400 mx-auto' : 'text-slate-700 mx-auto'} />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <a
                      href={`/store/${s.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-500 hover:text-teal-400 transition-colors inline-block"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
