import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingCart, ArrowRight, Package, Star, Truck, Shield, Clock, AlertTriangle } from 'lucide-react';
import { getStore } from '../../api/storeApi';
import CustomerLayout from '../../components/CustomerLayout';
import AdminStoreToolbar from '../../components/AdminStoreToolbar';

function ProductCard({ product, slug }) {
  const stock = product.stock_quantity;
  const stockLabel = stock <= 0 ? 'Out of Stock' : stock < 10 ? `Low Stock — ${stock} left` : 'In Stock';
  const stockColor = stock <= 0 ? 'bg-red-100 text-red-700' : stock < 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';

  return (
    <Link to={`/store/${slug}/product/${product.id}`} className="product-card block bg-white rounded-2xl border border-slate-200 overflow-hidden group">
      <div className="aspect-square bg-slate-50 flex items-center justify-center relative overflow-hidden">
        {product.images ? (
          <img
            src={JSON.parse(product.images)[0]}
            alt={product.product_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300">
            <Package size={40} />
            <span className="text-xs">No image</span>
          </div>
        )}
        <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${stockColor}`}>
          {stockLabel}
        </span>
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">{product.category}</p>
        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-2">{product.product_name}</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-teal-700 font-bold text-lg">${product.price.toFixed(2)}</span>
            {product.compare_at_price > product.price && (
              <span className="text-slate-400 text-sm line-through ml-1.5">${product.compare_at_price.toFixed(2)}</span>
            )}
          </div>
          <span className="text-teal-600 text-xs font-medium group-hover:gap-2 flex items-center gap-1 transition-all">
            View <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function StoreFront() {
  const { slug } = useParams();
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    getStore(slug)
      .then(setStoreData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </CustomerLayout>
    );
  }

  if (!storeData) {
    return (
      <CustomerLayout>
        <div className="text-center py-24">
          <h2 className="text-2xl font-bold text-slate-900">Store not found</h2>
        </div>
      </CustomerLayout>
    );
  }

  if (storeData.store?.maintenance_mode) {
    return (
      <CustomerLayout>
        <div className="text-center py-24">
          <Package size={48} className="mx-auto text-slate-400 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Store Temporarily Unavailable</h2>
          <p className="text-slate-500 mt-2">We're doing some maintenance. Check back soon!</p>
        </div>
      </CustomerLayout>
    );
  }

  const { store, featured } = storeData;

  return (
    <CustomerLayout>
      <AdminStoreToolbar storeName={store.display_name} slug={slug} />

      {/* Setup-mode banner when Stripe is not connected */}
      {!store.stripe_charges_enabled && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2 text-amber-800 text-sm">
            <AlertTriangle size={15} className="flex-shrink-0" />
            This store is currently in setup mode and not accepting orders.
          </div>
        </div>
      )}
      {/* Hero */}
      <section className="hero-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <p className="text-teal-300 text-sm font-semibold uppercase tracking-widest mb-3">Welcome to</p>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {store.display_name}
            </h1>
            <p className="text-slate-300 text-lg md:text-xl mb-8 leading-relaxed">
              {store.store_tagline || 'Your trusted warehouse partner for industrial and commercial needs.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/store/${slug}/catalogue`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                <ShoppingCart size={18} />
                Shop Now
              </Link>
              <a
                href="#featured"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors text-sm border border-white/20"
              >
                Browse Products
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="bg-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm font-medium">
            <div className="flex items-center justify-center gap-2">
              <Truck size={16} /> Free shipping over ${store.free_shipping_threshold || 100}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Shield size={16} /> Secure checkout
            </div>
            <div className="flex items-center justify-center gap-2">
              <Clock size={16} /> Fast processing
            </div>
            <div className="flex items-center justify-center gap-2">
              <Star size={16} /> Quality guaranteed
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featured?.length > 0 && (
        <section id="featured" className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                  Featured Products
                </h2>
                <p className="text-slate-500 text-sm mt-1">Hand-picked products just for you</p>
              </div>
              <Link
                to={`/store/${slug}/catalogue`}
                className="text-teal-600 hover:text-teal-700 text-sm font-semibold flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {featured.map(p => (
                <ProductCard key={p.id} product={p} slug={slug} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Store description */}
      {store.store_description && (
        <section className="py-12 bg-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Package size={32} className="text-teal-600 mx-auto mb-4" />
            <p className="text-slate-600 text-lg leading-relaxed">{store.store_description}</p>
          </div>
        </section>
      )}
    </CustomerLayout>
  );
}
