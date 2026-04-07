import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Package, ShoppingCart, Heart, Star, ChevronRight, Minus, Plus, MapPin, Calendar, Clock,
} from 'lucide-react';
import { getStoreProduct, getProductReviews } from '../../api/storeApi';
import { addToCart, addToWishlist, removeFromWishlist, getWishlist, submitReview } from '../../api/customerApi';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerLayout from '../../components/CustomerLayout';

function Stars({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star
          key={s} size={size}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
        />
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const { slug, id }         = useParams();
  const { token, customer }  = useCustomerAuth();

  const [data, setData]           = useState(null);
  const [reviews, setReviews]     = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [qty, setQty]             = useState(1);
  const [cartMsg, setCartMsg]     = useState('');
  const [wishlisted, setWishlisted] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, review_text: '' });
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    Promise.all([
      getStoreProduct(slug, id),
      getProductReviews(slug, id),
    ]).then(([pd, rd]) => {
      setData(pd);
      setReviews(rd.reviews);
      setAvgRating(rd.avg_rating);
    }).finally(() => setLoading(false));
  }, [slug, id]);

  useEffect(() => {
    if (!token) return;
    getWishlist(token).then(items => {
      setWishlisted(items.some(i => i.id === parseInt(id)));
    }).catch(() => {});
  }, [token, id]);

  const handleAddToCart = async () => {
    if (!token) { window.location.href = `/store/${slug}/login`; return; }
    try {
      await addToCart(token, { product_id: id, quantity: qty });
      setCartMsg('Added to cart!');
      setTimeout(() => setCartMsg(''), 2000);
    } catch (err) {
      setCartMsg(err.response?.data?.error || 'Error');
    }
  };

  const handleWishlist = async () => {
    if (!token) { window.location.href = `/store/${slug}/login`; return; }
    if (wishlisted) {
      await removeFromWishlist(token, id);
      setWishlisted(false);
    } else {
      await addToWishlist(token, id);
      setWishlisted(true);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await submitReview(token, { product_id: id, ...reviewForm });
      setReviewMsg('Review submitted!');
      const rd = await getProductReviews(slug, id);
      setReviews(rd.reviews);
      setAvgRating(rd.avg_rating);
    } catch (err) {
      setReviewMsg(err.response?.data?.error || 'Error submitting review');
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </CustomerLayout>
    );
  }

  if (!data) {
    return (
      <CustomerLayout>
        <div className="text-center py-24">
          <h2 className="text-2xl font-bold text-slate-900">Product not found</h2>
          <Link to={`/store/${slug}/catalogue`} className="text-teal-600 hover:underline mt-2 inline-block">
            Back to Catalogue
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const { product, related } = data;
  const stock = product.stock_quantity;
  const maxQty = Math.min(stock, 99);

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to={`/store/${slug}`} className="hover:text-teal-600">Home</Link>
          <ChevronRight size={14} />
          <Link to={`/store/${slug}/catalogue`} className="hover:text-teal-600">Catalogue</Link>
          <ChevronRight size={14} />
          <span className="text-slate-900 font-medium line-clamp-1">{product.product_name}</span>
        </nav>

        {/* Product hero */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
          {/* Image */}
          <div className="aspect-square bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200">
            {product.images ? (
              <img src={JSON.parse(product.images)[0]} alt={product.product_name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-300">
                <Package size={64} />
                <span className="text-sm">No image available</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                {product.category && (
                  <p className="text-xs text-teal-600 font-semibold uppercase tracking-widest mb-2">{product.category}</p>
                )}
                <h1 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                  {product.product_name}
                </h1>
              </div>
            </div>

            {/* Rating */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Stars rating={Math.round(avgRating)} />
                <span className="text-sm text-slate-500">{avgRating.toFixed(1)} ({reviews.length} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-extrabold text-teal-700">${product.price.toFixed(2)}</span>
              {product.compare_at_price > product.price && (
                <>
                  <span className="text-xl text-slate-400 line-through">${product.compare_at_price.toFixed(2)}</span>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                    Save ${(product.compare_at_price - product.price).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* Stock status */}
            <div className="mb-5">
              {stock <= 0 ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                  Out of Stock
                </span>
              ) : stock < 10 ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  Low Stock — only {stock} left!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  In Stock ({stock} available)
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-slate-600 text-sm leading-relaxed mb-6">{product.description}</p>
            )}

            {/* Quantity + actions */}
            {stock > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-3 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-4 py-2.5 text-sm font-semibold min-w-[3rem] text-center">{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                    className="px-3 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  <ShoppingCart size={16} />
                  {cartMsg || 'Add to Cart'}
                </button>

                <button
                  onClick={handleWishlist}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    wishlisted
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500'
                  }`}
                >
                  <Heart size={18} className={wishlisted ? 'fill-red-500' : ''} />
                </button>
              </div>
            )}

            {/* Specs */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
              {product.sku && (
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU</span>
                  <span className="font-medium text-slate-700">{product.sku}</span>
                </div>
              )}
              {product.warehouse_location && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><MapPin size={13} /> Location</span>
                  <span className="font-medium text-slate-700">{product.warehouse_location}</span>
                </div>
              )}
              {product.available_date && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Calendar size={13} /> Available From</span>
                  <span className="font-medium text-slate-700">{product.available_date}</span>
                </div>
              )}
              {product.expiry_date && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Clock size={13} /> Best Before</span>
                  <span className="font-medium text-slate-700">{product.expiry_date}</span>
                </div>
              )}
              {product.weight_kg && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Weight</span>
                  <span className="font-medium text-slate-700">{product.weight_kg} kg</span>
                </div>
              )}
              {product.tags && (
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {product.tags.split(',').map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">{t.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Customer Reviews
          </h2>

          {reviews.length === 0 ? (
            <p className="text-slate-500 text-sm">No reviews yet. Be the first to review this product!</p>
          ) : (
            <div className="space-y-4 mb-8">
              {reviews.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm font-bold">
                      {r.reviewer_name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{r.reviewer_name}</p>
                      <p className="text-xs text-slate-400">{r.created_at?.split('T')[0]}</p>
                    </div>
                    <div className="ml-auto">
                      <Stars rating={r.rating} size={14} />
                    </div>
                  </div>
                  {r.review_text && <p className="text-sm text-slate-600">{r.review_text}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Leave a review */}
          {customer && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Leave a Review</h3>
              <form onSubmit={handleReview} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Your Rating</label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => setReviewForm(f => ({ ...f, rating: s }))}
                      >
                        <Star
                          size={22}
                          className={s <= reviewForm.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={reviewForm.review_text}
                  onChange={e => setReviewForm(f => ({ ...f, review_text: e.target.value }))}
                  placeholder="Share your experience with this product..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none"
                />
                {reviewMsg && <p className={`text-sm ${reviewMsg.includes('Error') || reviewMsg.includes('only') ? 'text-red-600' : 'text-emerald-600'}`}>{reviewMsg}</p>}
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Submit Review
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Related products */}
        {related?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map(p => (
                <Link
                  key={p.id}
                  to={`/store/${slug}/product/${p.id}`}
                  className="product-card bg-white rounded-2xl border border-slate-200 overflow-hidden group"
                >
                  <div className="aspect-square bg-slate-50 flex items-center justify-center">
                    {p.images
                      ? <img src={JSON.parse(p.images)[0]} alt={p.product_name} className="w-full h-full object-cover" />
                      : <Package size={32} className="text-slate-300" />
                    }
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">{p.product_name}</p>
                    <p className="text-teal-700 font-bold text-sm">${p.price.toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
