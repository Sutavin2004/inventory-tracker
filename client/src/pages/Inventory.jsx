import { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, ChevronUp, ChevronDown, AlertTriangle, Package,
  Plus, Eye, EyeOff, DollarSign, ExternalLink, Check, X,
} from 'lucide-react';
import { getInventory } from '../api/inventory';
import { updateProduct, addInventoryItem } from '../api/adminApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

const PAGE_SIZE = 20;

const BASE_COLUMNS = [
  { key: 'item_id',            label: 'Item ID'    },
  { key: 'item_name',          label: 'Item Name'  },
  { key: 'quantity',           label: 'Quantity'   },
  { key: 'warehouse_location', label: 'Location'   },
  { key: 'available_date',     label: 'Available'  },
  { key: 'expiry_date',        label: 'Expiry'     },
];

const parseLocalDate = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getRowStatus = (item) => {
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today.getTime() + 7 * 86400000);
  const expiry  = parseLocalDate(item.expiry_date);
  if (expiry <= in7Days)  return 'red';
  if (item.quantity < 10) return 'yellow';
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

const EMPTY_FORM = {
  item_id: '', item_name: '', quantity: '', warehouse_location: '',
  available_date: '', expiry_date: '',
};

export default function Inventory() {
  const { user }    = useAuth();
  const { addToast } = useToast();
  const isAdmin     = user?.role === 'admin';
  const slug        = user?.company?.slug || 'edepot-demo';

  const [items,     setItems]     = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [debSearch, setDebSearch] = useState('');
  const [sortBy,    setSortBy]    = useState('item_id');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [loading,   setLoading]   = useState(true);

  // Add single item modal
  const [showAdd,   setShowAdd]   = useState(false);
  const [addForm,   setAddForm]   = useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);

  // Inline price editing
  const [editingPrice, setEditingPrice] = useState(null); // { item_id, product_id, value }

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
      const data = await getInventory({ page: 1, limit: 99999, search: debSearch, sortBy, sortOrder });
      const hdr  = ['Item ID', 'Item Name', 'Quantity', 'Warehouse Location', 'Available Date', 'Expiry Date'];
      const rows = data.items.map((i) => [
        i.item_id,
        `"${i.item_name.replace(/"/g, '""')}"`,
        i.quantity,
        `"${i.warehouse_location.replace(/"/g, '""')}"`,
        i.available_date,
        i.expiry_date,
      ]);
      const csv = [hdr.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a   = Object.assign(document.createElement('a'), {
        href: url,
        download: `inventory-export-${new Date().toISOString().split('T')[0]}.csv`,
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  // ── Add single item ────────────────────────────────────────────────────────
  const handleAddItem = async (e) => {
    e.preventDefault();
    setAddSaving(true);
    try {
      await addInventoryItem(addForm);
      addToast('Item added and product created', 'success');
      setShowAdd(false);
      setAddForm(EMPTY_FORM);
      fetchItems();
    } catch (err) {
      addToast(err.response?.data?.error || 'Error adding item', 'error');
    } finally {
      setAddSaving(false);
    }
  };

  // ── Set Price ──────────────────────────────────────────────────────────────
  const startEditPrice = (item) => {
    if (!item.product_id) return;
    setEditingPrice({ item_id: item.item_id, product_id: item.product_id, value: item.product_price ?? '0' });
  };

  const savePrice = async () => {
    if (!editingPrice) return;
    try {
      await updateProduct(editingPrice.product_id, { price: parseFloat(editingPrice.value) || 0 });
      addToast('Price updated', 'success');
      setEditingPrice(null);
      fetchItems();
    } catch {
      addToast('Error updating price', 'error');
    }
  };

  // ── Toggle Publish ─────────────────────────────────────────────────────────
  const togglePublish = async (item) => {
    if (!item.product_id) return;
    try {
      await updateProduct(item.product_id, { is_published: !item.product_is_published });
      fetchItems();
    } catch {
      addToast('Error updating publish status', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const totalPages    = Math.ceil(total / PAGE_SIZE);
  const expiringCount = items.filter((i) => getRowStatus(i) === 'red').length;
  const inputClass    = 'w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 placeholder-slate-500';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm tabular-nums">{total} items</span>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={15} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Expiry banner */}
      {expiringCount > 0 && (
        <div className="bg-red-900/25 border border-red-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
          <span className="text-red-300 text-sm">
            <strong>{expiringCount}</strong> item{expiringCount !== 1 ? 's' : ''} on this page expiring within 7 days or already expired
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
                : 'No inventory yet — upload a file or add items to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  {BASE_COLUMNS.map(({ key, label }) => (
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
                  {isAdmin && (
                    <>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Store Price
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Published
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        In Store
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {items.map((item) => {
                  const status  = getRowStatus(item);
                  const expired = parseLocalDate(item.expiry_date) < new Date();
                  const isEditingThisPrice = editingPrice?.item_id === item.item_id;

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

                      {isAdmin && (
                        <>
                          {/* Store Price */}
                          <td className="px-5 py-3.5 text-sm">
                            {item.product_id ? (
                              isEditingThisPrice ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editingPrice.value}
                                    onChange={e => setEditingPrice(prev => ({ ...prev, value: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') savePrice(); if (e.key === 'Escape') setEditingPrice(null); }}
                                    autoFocus
                                    className="w-20 px-1.5 py-1 bg-slate-700 border border-teal-500 rounded-lg text-teal-300 text-sm focus:outline-none"
                                  />
                                  <button onClick={savePrice} className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={13} /></button>
                                  <button onClick={() => setEditingPrice(null)} className="p-1 text-slate-500 hover:text-slate-300"><X size={13} /></button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditPrice(item)}
                                  className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-mono group"
                                  title="Click to set price"
                                >
                                  <DollarSign size={13} className="opacity-60 group-hover:opacity-100" />
                                  {item.product_price != null ? parseFloat(item.product_price).toFixed(2) : '0.00'}
                                </button>
                              )
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Published toggle */}
                          <td className="px-5 py-3.5 text-center">
                            {item.product_id ? (
                              <button
                                onClick={() => togglePublish(item)}
                                title={item.product_is_published ? 'Published — click to unpublish' : 'Unpublished — click to publish'}
                              >
                                {item.product_is_published
                                  ? <Eye size={16} className="text-emerald-400 mx-auto" />
                                  : <EyeOff size={16} className="text-slate-600 mx-auto" />
                                }
                              </button>
                            ) : (
                              <span className="text-slate-700">—</span>
                            )}
                          </td>

                          {/* View in Store */}
                          <td className="px-5 py-3.5 text-center">
                            {item.product_id && item.product_is_published ? (
                              <a
                                href={`/store/${slug}/product/${item.product_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-500 hover:text-teal-400 transition-colors inline-flex items-center gap-1"
                                title="View in store"
                              >
                                <ExternalLink size={14} />
                              </a>
                            ) : (
                              <span className="text-slate-700">—</span>
                            )}
                          </td>
                        </>
                      )}
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
            <span className="text-slate-400 text-sm tabular-nums">{page} / {totalPages}</span>
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

      {/* ── Add Single Item Modal ─────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-bold font-display">Add Single Inventory Item</h2>
              <button onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Item ID <span className="text-slate-500 font-normal">(optional — auto-generated)</span></label>
                  <input
                    type="number" min="1"
                    value={addForm.item_id}
                    onChange={e => setAddForm(f => ({ ...f, item_id: e.target.value }))}
                    placeholder="Auto"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Quantity *</label>
                  <input
                    type="number" min="0" required
                    value={addForm.quantity}
                    onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Item Name *</label>
                  <input
                    type="text" required
                    value={addForm.item_name}
                    onChange={e => setAddForm(f => ({ ...f, item_name: e.target.value }))}
                    placeholder="e.g. Industrial Bolt Set"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Warehouse Location *</label>
                  <input
                    type="text" required
                    value={addForm.warehouse_location}
                    onChange={e => setAddForm(f => ({ ...f, warehouse_location: e.target.value }))}
                    placeholder="e.g. A1-Shelf-3"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Available Date *</label>
                  <input
                    type="date" required
                    value={addForm.available_date}
                    onChange={e => setAddForm(f => ({ ...f, available_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Expiry Date *</label>
                  <input
                    type="date" required
                    value={addForm.expiry_date}
                    onChange={e => setAddForm(f => ({ ...f, expiry_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">A product record will be automatically created in your store catalogue (price $0.00, published).</p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }}
                  className="flex-1 py-2.5 border border-slate-600 text-slate-300 font-semibold rounded-xl hover:bg-slate-700/50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-60"
                >
                  {addSaving ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
