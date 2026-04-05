import { useState, useEffect, useCallback } from 'react';
import { Search, Download, ChevronUp, ChevronDown, AlertTriangle, Package } from 'lucide-react';
import { getInventory } from '../api/inventory';
import Spinner from '../components/Spinner';

const PAGE_SIZE = 20;

const COLUMNS = [
  { key: 'item_id',            label: 'Item ID'    },
  { key: 'item_name',          label: 'Item Name'  },
  { key: 'quantity',           label: 'Quantity'   },
  { key: 'warehouse_location', label: 'Location'   },
  { key: 'available_date',     label: 'Available'  },
  { key: 'expiry_date',        label: 'Expiry'     },
];

/** Parse a YYYY-MM-DD string as local midnight to avoid UTC-offset issues. */
const parseLocalDate = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getRowStatus = (item) => {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const in7Days   = new Date(today.getTime() + 7 * 86400000);
  const expiry    = parseLocalDate(item.expiry_date);
  if (expiry <= in7Days)   return 'red';
  if (item.quantity < 10)  return 'yellow';
  return 'green';
};

const ROW_STYLES = {
  red:    'bg-red-900/25 border-l-[3px] border-l-red-500',
  yellow: 'bg-yellow-900/20 border-l-[3px] border-l-yellow-500',
  green:  '',
};

const SortIcon = ({ col, sortBy, sortOrder }) => {
  if (sortBy !== col) return <ChevronUp className="opacity-25" size={13} />;
  return sortOrder === 'ASC'
    ? <ChevronUp className="text-teal-400" size={13} />
    : <ChevronDown className="text-teal-400" size={13} />;
};

export default function Inventory() {
  const [items,    setItems]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [debSearch,setDebSearch]= useState('');
  const [sortBy,   setSortBy]   = useState('item_id');
  const [sortOrder,setSortOrder]= useState('ASC');
  const [loading,  setLoading]  = useState(true);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory({ page, limit: PAGE_SIZE, search: debSearch, sortBy, sortOrder });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    } finally {
      setLoading(false);
    }
  }, [page, debSearch, sortBy, sortOrder]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(col);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const exportCSV = async () => {
    try {
      const data  = await getInventory({ page: 1, limit: 99999, search: debSearch, sortBy, sortOrder });
      const hdr   = ['Item ID', 'Item Name', 'Quantity', 'Warehouse Location', 'Available Date', 'Expiry Date'];
      const rows  = data.items.map((i) => [
        i.item_id,
        `"${i.item_name.replace(/"/g, '""')}"`,
        i.quantity,
        `"${i.warehouse_location.replace(/"/g, '""')}"`,
        i.available_date,
        i.expiry_date,
      ]);
      const csv   = [hdr.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const url   = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a     = Object.assign(document.createElement('a'), {
        href: url,
        download: `inventory-export-${new Date().toISOString().split('T')[0]}.csv`,
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const totalPages    = Math.ceil(total / PAGE_SIZE);
  const expiringCount = items.filter((i) => getRowStatus(i) === 'red').length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <span className="text-slate-400 text-sm tabular-nums">{total} items total</span>
      </div>

      {/* Expiry banner */}
      {expiringCount > 0 && (
        <div className="bg-red-900/25 border border-red-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
          <span className="text-red-300 text-sm">
            <strong>{expiringCount}</strong> item{expiringCount !== 1 ? 's' : ''} on this page{' '}
            expiring within 7 days or already expired
          </span>
        </div>
      )}

      {/* Search + Export */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by item name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-sm"
          />
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-600 text-slate-300 rounded-xl hover:border-teal-500 hover:text-teal-400 transition-colors text-sm whitespace-nowrap"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/70 inline-block" />Expiring / Expired</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/70 inline-block" />Low stock (&lt;10)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-600 inline-block" />Normal</span>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-52"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Package className="mx-auto text-slate-600 mb-4" size={42} />
            <p className="text-slate-400 text-sm">
              {search
                ? `No items match "${search}"`
                : 'No inventory yet — upload a file to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  {COLUMNS.map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-teal-400 select-none whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <SortIcon col={key} sortBy={sortBy} sortOrder={sortOrder} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {items.map((item) => {
                  const status  = getRowStatus(item);
                  const expired = parseLocalDate(item.expiry_date) < new Date();
                  return (
                    <tr
                      key={item.item_id}
                      className={`${ROW_STYLES[status]} hover:brightness-110 transition-all`}
                    >
                      <td className="px-5 py-3.5 text-slate-400 text-sm tabular-nums">{item.item_id}</td>
                      <td className="px-5 py-3.5 text-white text-sm font-medium">{item.item_name}</td>
                      <td className={`px-5 py-3.5 text-sm font-mono ${item.quantity < 10 ? 'text-yellow-400' : 'text-slate-300'}`}>
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-sm">{item.warehouse_location}</td>
                      <td className="px-5 py-3.5 text-slate-300 text-sm font-mono">{item.available_date}</td>
                      <td className={`px-5 py-3.5 text-sm font-mono ${expired ? 'text-red-400 font-semibold' : status === 'red' ? 'text-red-300' : 'text-slate-300'}`}>
                        {item.expiry_date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 tabular-nums">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 text-slate-300 rounded-lg disabled:opacity-40 hover:border-teal-500 transition-colors"
            >
              Previous
            </button>
            <span className="text-slate-400 text-sm tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 text-slate-300 rounded-lg disabled:opacity-40 hover:border-teal-500 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
