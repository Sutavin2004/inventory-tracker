import { useState, useEffect } from 'react';
import { Users, Search, UserCheck, UserX } from 'lucide-react';
import { getAdminCustomers, updateCustomer } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

export default function AdminCustomers() {
  const { addToast }              = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  const fetchCustomers = (s = search) => {
    setLoading(true);
    getAdminCustomers({ search: s, limit: 100 })
      .then(setCustomers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(''); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(), 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggleActive = async (customer) => {
    await updateCustomer(customer.id, { is_active: !customer.is_active });
    addToast(`Customer ${customer.is_active ? 'deactivated' : 'reactivated'}`, 'success');
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-display">Customers</h1>
          <p className="text-slate-400 text-sm mt-0.5">{customers.length} registered customers</p>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 placeholder-slate-500"
        />
      </div>

      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <Users size={28} className="mb-2" />
            <p className="text-sm">No customers yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Total Spent</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Joined</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {c.full_name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="text-slate-200 font-medium">{c.full_name}</p>
                        <p className="text-slate-500 text-xs">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-300 font-medium">{c.orders_count}</td>
                  <td className="px-4 py-3 text-right text-teal-400 font-semibold hidden lg:table-cell">${(c.total_spent || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden xl:table-cell">{c.created_at?.split('T')[0]}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      c.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        c.is_active
                          ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                          : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={c.is_active ? 'Deactivate' : 'Reactivate'}
                    >
                      {c.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
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
