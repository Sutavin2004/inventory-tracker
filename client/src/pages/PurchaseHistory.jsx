import { useState, useEffect, useCallback } from 'react';
import { Filter, History } from 'lucide-react';
import { getPurchases } from '../api/purchases';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function PurchaseHistory() {
  const { user }                    = useAuth();
  const isAdmin                     = user?.role === 'admin';
  const [purchases, setPurchases]   = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [filters,   setFilters]     = useState({
    itemName:   '',
    startDate:  '',
    endDate:    '',
    buyerName:  '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPurchases(filters);
      setPurchases(data);
    } catch (err) {
      console.error('Failed to load purchases', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const inputCls =
    'px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 ' +
    'focus:outline-none focus:border-teal-500 text-sm w-full';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Purchase History</h1>
        {!loading && (
          <span className="text-slate-400 text-sm tabular-nums">
            {purchases.length} record{purchases.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="text-slate-400" size={15} />
          <span className="text-sm font-semibold text-slate-300">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Item name…"
            value={filters.itemName}
            onChange={(e) => setFilters((f) => ({ ...f, itemName: e.target.value }))}
            className={inputCls}
          />
          {isAdmin && (
            <input
              type="text"
              placeholder="Buyer name…"
              value={filters.buyerName}
              onChange={(e) => setFilters((f) => ({ ...f, buyerName: e.target.value }))}
              className={inputCls}
            />
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">From date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>
        {(filters.itemName || filters.buyerName || filters.startDate || filters.endDate) && (
          <button
            onClick={() => setFilters({ itemName: '', startDate: '', endDate: '', buyerName: '' })}
            className="mt-3 text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-52"><Spinner /></div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-16">
            <History className="mx-auto text-slate-600 mb-4" size={40} />
            <p className="text-slate-400 text-sm">No purchases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/40">
                  {['#', 'Item Name', 'Qty Purchased', 'Buyer', 'Purchase Date', 'Remaining Qty'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 text-sm tabular-nums">#{p.id}</td>
                    <td className="px-5 py-3.5 text-white text-sm font-medium">{p.item_name}</td>
                    <td className="px-5 py-3.5 text-teal-400 text-sm font-mono font-semibold">{p.quantity_purchased}</td>
                    <td className="px-5 py-3.5 text-slate-300 text-sm">{p.buyer_name}</td>
                    <td className="px-5 py-3.5 text-slate-300 text-sm font-mono">{p.purchase_date}</td>
                    <td className={`px-5 py-3.5 text-sm font-mono ${p.remaining_quantity < 10 ? 'text-yellow-400' : 'text-slate-300'}`}>
                      {p.remaining_quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
