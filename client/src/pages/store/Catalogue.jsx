import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Package, Search, Filter, ShoppingCart, Heart, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStoreProducts, getCategories } from '../../api/storeApi';
import { addToCart } from '../../api/customerApi';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerLayout from '../../components/CustomerLayout';

function StockBadge({ qty }) {
  if (qty <= 0)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Out of Stock</span>;
  if (qty < 10)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Low Stock</span>;
  return              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">In Stock</span>;
}

export default function Catalogue() {
  const { slug }         = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token }        = useCustomerAuth();

  const [products, setProducts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [cartMsg, setCartMsg]     = useState({});

  // Filters
  const [search,    setSearch]    = useState(searchParams.get('search') || '');
  const [category,  setCategory]  = useState(searchParams.get('category') || '');
  const [minPrice,  setMinPrice]  = useState('');
  const [maxPrice,  setMaxPrice]  = useState('');
  const [inStock,   setInStock]   = useState(false);
  const [sortBy,    setSortBy]    = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page,      setPage]      = useState(1);
  const LIMIT = 24;

  useEffect(() => {
    getCategories(slug).then(setCategories).catch(() => {});
  }, [slug]);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    getStoreProducts(slug, {
      page, limit: LIMIT, search, category, minPrice, maxPrice,
      inStock: inStock ? 'true' : '', sortBy, sortOrder,
    })
      .then(d => { setProducts(d.products); setTotal(d.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, page, search, category, minPrice, maxPrice, inStock, sortBy, sortOrder]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const handleAddToCart = async (productId, e) => {
    e.preventDefault();
    if (!token) {
      window.location.href = `/store/${slug}/login`;
      return;
    }
    try {
      await addToCart(token, { product_id: productId, quantity: 1 });
      setCartMsg(prev => ({ ...prev, [productId]: 'Added!' }));
      setTimeout(() => setCartMsg(prev => { const n = { ...prev }; delete n[productId]; return n; }), 1800);
    } catch (err) {
      alert(err.response?.data?.error || 'Error adding to cart');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>Product Catalogue</h1>
          <p className="text-slate-500 text-sm mt-1">{total} products found</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <aside className="lg:w-60 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 sticky top-24">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal size={16} /> Filters
              </h3>

              {/* Search */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Search</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Category</label>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio" name="cat" value=""
                        checked={!category}
                        onChange={() => { setCategory(''); setPage(1); }}
                        className="accent-teal-600"
                      />
                      <span className="text-sm text-slate-600 group-hover:text-slate-900">All</span>
                    </label>
                    {categories.map(c => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio" name="cat" value={c}
                          checked={category === c}
                          onChange={() => { setCategory(c); setPage(1); }}
                          className="accent-teal-600"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price range */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Price Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                  <span className="text-slate-400 text-xs">—</span>
                  <input
                    type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
              </div>

              {/* In stock */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={inStock}
                  onChange={e => { setInStock(e.target.checked); setPage(1); }}
                  className="accent-teal-600 w-4 h-4"
                />
                <span className="text-sm text-slate-700 font-medium">In stock only</span>
              </label>

              {/* Sort */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Sort by</label>
                <select
                  value={`${sortBy}:${sortOrder}`}
                  onChange={e => {
                    const [s, o] = e.target.value.split(':');
                    setSortBy(s); setSortOrder(o); setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white"
                >
                  <option value="created_at:DESC">Newest</option>
                  <option value="price:ASC">Price: Low to High</option>
                  <option value="price:DESC">Price: High to Low</option>
                  <option value="product_name:ASC">Name A-Z</option>
                </select>
              </div>

              <button
                onClick={() => { setSearch(''); setCategory(''); setMinPrice(''); setMaxPrice(''); setInStock(false); setPage(1); }}
                className="w-full text-xs text-slate-500 hover:text-slate-700 underline text-left"
              >
                Clear all filters
              </button>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-slate-100" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-2/3" />
                      <div className="h-4 bg-slate-100 rounded" />
                      <div className="h-5 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
                <Package size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No products found</p>
                <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {products.map(p => {
                    const stock = p.stock_quantity;
                    return (
                      <div key={p.id} className="product-card bg-white rounded-2xl border border-slate-200 overflow-hidden group flex flex-col">
                        <Link to={`/store/${slug}/product/${p.id}`} className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden relative">
                          {p.images ? (
                            <img src={JSON.parse(p.images)[0]} alt={p.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <Package size={36} className="text-slate-300" />
                          )}
                          <div className="absolute top-2 right-2">
                            <StockBadge qty={stock} />
                          </div>
                        </Link>
                        <div className="p-4 flex flex-col flex-1">
                          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">{p.category}</p>
                          <Link to={`/store/${slug}/product/${p.id}`}>
                            <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-teal-700 transition-colors mb-2">
                              {p.product_name}
                            </h3>
                          </Link>
                          <div className="mt-auto">
                            <div className="flex items-baseline gap-2 mb-3">
                              <span className="text-teal-700 font-bold text-lg">${p.price.toFixed(2)}</span>
                              {p.compare_at_price > p.price && (
                                <span className="text-slate-400 text-sm line-through">${p.compare_at_price.toFixed(2)}</span>
                              )}
                            </div>
                            <button
                              onClick={e => handleAddToCart(p.id, e)}
                              disabled={stock <= 0}
                              className={`w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition-all ${
                                stock <= 0
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : cartMsg[p.id]
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white'
                              }`}
                            >
                              <ShoppingCart size={15} />
                              {cartMsg[p.id] ? cartMsg[p.id] : stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      let p;
                      if (totalPages <= 7) p = i + 1;
                      else if (page <= 4) p = i + 1;
                      else if (page >= totalPages - 3) p = totalPages - 6 + i;
                      else p = page - 3 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            page === p ? 'bg-teal-600 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
