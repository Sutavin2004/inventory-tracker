import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { getOrder } from '../../api/customerApi';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerLayout from '../../components/CustomerLayout';

export default function OrderConfirmation() {
  const { slug, orderNumber } = useParams();
  const { token }             = useCustomerAuth();
  const [order, setOrder]     = useState(null);

  useEffect(() => {
    if (!token) return;
    getOrder(token, orderNumber).then(setOrder).catch(() => {});
  }, [token, orderNumber]);

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-emerald-600" />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Order Confirmed!
        </h1>
        <p className="text-slate-500 mb-1">Thank you for your purchase.</p>
        <p className="text-sm text-slate-400 mb-8">
          Order <span className="font-mono font-semibold text-slate-700">{orderNumber}</span>
        </p>

        {order && (
          <div className="bg-white rounded-2xl border border-slate-200 text-left mb-8">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 mb-3">Order Summary</h2>
              <div className="space-y-2">
                {order.items?.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">{item.product_name} <span className="text-slate-400">×{item.quantity}</span></span>
                    <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 space-y-1.5 text-sm">
              {order.subtotal !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span><span>${order.subtotal?.toFixed(2)}</span>
                </div>
              )}
              {order.shipping_amount !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>{order.shipping_amount === 0 ? <span className="text-emerald-600">FREE</span> : `$${order.shipping_amount?.toFixed(2)}`}</span>
                </div>
              )}
              {order.tax_amount !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span><span>${order.tax_amount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2 mt-2">
                <span>Total</span><span>${order.total_amount?.toFixed(2)} CAD</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={`/store/${slug}/catalogue`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
          >
            <Package size={18} />
            Continue Shopping
          </Link>
          <Link
            to={`/store/${slug}/account`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ShoppingBag size={18} />
            View My Orders
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}
