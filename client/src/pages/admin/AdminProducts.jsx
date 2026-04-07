import { useState, useEffect } from 'react';
import { Plus, Edit2, Eye, EyeOff, Trash2, Package, Star, Search } from 'lucide-react';
import { getAdminProducts, createProduct, updateProduct, deleteProduct, bulkProductUpdate } from '../../api/adminApi';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';

const EMPTY_FORM = {
  product_name: '', description: '', price: '', compare_at_price: '',
  category: '', tags: '', sku: '', weight_kg: '', inventory_item_id: '',
  is_published: true, is_featured: false,
};

export default function AdminProducts() {
  const { addToast } = useToast();
  const [products, setProducts]     = useState([]);
  const [inventory, setInventory]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [selected, setSelected]     = useState([]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      getAdminProducts(),
      client.get('/inventory', { params: { limit: 1000 } }),
    ]).then(([p, inv]) => {
      setProducts(p);
      setInventory(inv.items || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };

  const openEdit = (p) => {
    setForm({
      product_name: p.product_name || '',
      description: p.description || '',
      price: p.price?.toString() || '0',
      compare_at_price: p.compare_at_price?.toString() || '',
      category: p.category || '',
      tags: p.tags || '',
      sku: p.sku || '',
      weight_kg: p.weight_kg?.toString() || '',
      inventory_item_id: p.inventory_item_id?.toString() || '',
      is_published: !!p.is_published,
      is_featured: !!p.is_featured,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await updateProduct(editId, form);
        addToast('Product updated', 'success');
      } else {
        await createProduct(form);
        addToast('Product created', 'success');
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Error saving product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Unpublish this product?')) return;
    await deleteProduct(id);
    addToast('Product unpublished', 'success');
    fetchData();
  };

  const handleTogglePublish = async (p) => {
    await updateProduct(p.id, { is_published: !p.is_published });
    fetchData();
  };

  const handleToggleFeatured = async (p) => {
    await updateProduct(p.id, { is_featured: !p.is_featured });
    fetchData();
  };

  const handleBulk = async (is_published) => {
    if (!selected.length) return;
    await bulkProductUpdate({ ids: selected, is_published });
    addToast(`${selected.length} products ${is_published ? 'published' : 'unpublished'}`, 'success');
    setSelected([]);
    fetchData();
  };

  const filtered = products.filter(p =>
    !search || p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-display">Products</h1>
          <p className="text-slate-400 text-sm mt-0.5">{products.length} products in your store</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-2">
          <span className="text-teal-300 text-sm font-medium">{selected.length} selected</span>
          <button onClick={() => handleBulk(true)} className="text-xs px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-500">Publish</button>
          <button onClick={() => handleBulk(false)} className="text-xs px-3 py-1 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">Unpublish</button>
          <button onClick={() => setSelected([])} className="text-xs text-slate-400 hover:text-slate-200 ml-auto">Clear</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 placeholder-slate-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <Package size={28} className="mb-2" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={e => setSelected(e.target.checked ? filtered.map(p => p.id) : [])}
                    className="accent-teal-500"
                  />
                </th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Stock</th>
                <th className="px-4 py-3 text-center">Published</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Featured</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={e => setSelected(prev =>
                        e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                      )}
                      className="accent-teal-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-slate-400" />
                      </div>
                      <span className="text-slate-200 font-medium line-clamp-1">{p.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-right text-teal-400 font-semibold">${parseFloat(p.price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.stock_quantity <= 0 ? 'bg-red-500/20 text-red-400'
                      : p.stock_quantity < 10 ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {p.stock_quantity ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleTogglePublish(p)} title={p.is_published ? 'Click to unpublish' : 'Click to publish'}>
                      {p.is_published
                        ? <Eye size={16} className="text-emerald-400 mx-auto" />
                        : <EyeOff size={16} className="text-slate-500 mx-auto" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <button onClick={() => handleToggleFeatured(p)} title="Toggle featured">
                      <Star size={16} className={p.is_featured ? 'text-amber-400 fill-amber-400 mx-auto' : 'text-slate-600 mx-auto'} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-teal-400 transition-colors rounded-lg hover:bg-teal-500/10">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
              <h2 className="text-white font-bold font-display">{editId ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Product Name *</label>
                  <input value={form.product_name} onChange={set('product_name')} required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Description</label>
                  <textarea value={form.description} onChange={set('description')} rows={3} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Price (CAD) *</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Compare-at Price</label>
                  <input type="number" step="0.01" min="0" value={form.compare_at_price} onChange={set('compare_at_price')}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Category</label>
                  <input value={form.category} onChange={set('category')}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Tags (comma-separated)</label>
                  <input value={form.tags} onChange={set('tags')}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">SKU</label>
                  <input value={form.sku} onChange={set('sku')}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" min="0" value={form.weight_kg} onChange={set('weight_kg')}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Link to Inventory Item</label>
                  <select value={form.inventory_item_id} onChange={set('inventory_item_id')}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30">
                    <option value="">— None / Standalone product —</option>
                    {inventory.map(i => (
                      <option key={i.item_id} value={i.item_id}>#{i.item_id} — {i.item_name} (Qty: {i.quantity})</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_published} onChange={setCheck('is_published')} className="accent-teal-500 w-4 h-4" />
                    <span className="text-sm text-slate-300 font-medium">Published (visible in store)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_featured} onChange={setCheck('is_featured')} className="accent-amber-400 w-4 h-4" />
                    <span className="text-sm text-slate-300 font-medium">Featured (show on homepage)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-600 text-slate-300 font-semibold rounded-xl hover:bg-slate-700/50 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-60">
                  {saving ? 'Saving...' : editId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
