import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

import { AuthProvider }           from './context/AuthContext';
import { ToastProvider }          from './context/ToastContext';
import { CustomerAuthProvider }   from './context/CustomerAuthContext';
import { PlatformAuthProvider }   from './context/PlatformAuthContext';
import { usePlatformAuth }        from './context/PlatformAuthContext';
import { useAuth }                from './context/AuthContext';
import { getStoreSlug }           from './utils/subdomain';

import Toast           from './components/Toast';
import Layout          from './components/Layout';
import PlatformLayout  from './components/PlatformLayout';
import ProtectedRoute  from './components/ProtectedRoute';

// Public / platform pages
import Landing         from './pages/Landing';
import Login           from './pages/Login';
import Register        from './pages/Register';

// Admin pages (existing)
import Dashboard       from './pages/Dashboard';
import Inventory       from './pages/Inventory';
import Upload          from './pages/Upload';
import Purchases       from './pages/Purchases';
import PurchaseHistory from './pages/PurchaseHistory';
import UploadHistory   from './pages/UploadHistory';
import Analytics       from './pages/Analytics';
import AuditLog        from './pages/AuditLog';
import Approvals       from './pages/Approvals';
import Settings        from './pages/Settings';

// Admin pages (e-commerce)
import AdminProducts   from './pages/admin/AdminProducts';
import AdminOrders     from './pages/admin/AdminOrders';
import AdminCustomers  from './pages/admin/AdminCustomers';
import AdminDiscounts  from './pages/admin/AdminDiscounts';

// Store (customer-facing) pages
import StoreFront        from './pages/store/StoreFront';
import Catalogue         from './pages/store/Catalogue';
import ProductDetail     from './pages/store/ProductDetail';
import Cart              from './pages/store/Cart';
import Checkout          from './pages/store/Checkout';
import OrderConfirmation from './pages/store/OrderConfirmation';
import Account           from './pages/store/Account';
import StoreLogin        from './pages/store/StoreLogin';
import StoreRegister     from './pages/store/StoreRegister';

// Platform super admin pages
import PlatformLogin     from './pages/platform/PlatformLogin';
import PlatformDashboard from './pages/platform/PlatformDashboard';
import PlatformStores    from './pages/platform/PlatformStores';

// ─── Root: Landing for guests, Dashboard redirect for logged-in users ─────────
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

// ─── Admin layout wrapper (pathless layout route) ─────────────────────────────
function AdminShell() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

// ─── Customer store wrapper (injects CustomerAuthProvider with slug) ───────────
function StoreWrapper() {
  const { slug } = useParams();
  return (
    <CustomerAuthProvider slug={slug}>
      <Outlet />
    </CustomerAuthProvider>
  );
}

// ─── Platform admin route guard ───────────────────────────────────────────────
function PlatformGuard() {
  const { platformUser, loading } = usePlatformAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !platformUser) {
      navigate('/platform/login', { replace: true });
    }
  }, [platformUser, loading, navigate]);

  if (loading) return null;
  if (!platformUser) return null;

  return (
    <PlatformLayout>
      <Outlet />
    </PlatformLayout>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Subdomain detection: if on mystore.edepot.ca, rewrite URL to /store/mystore/
  // so existing path-based routing works without modifying store pages.
  const storeSlug = getStoreSlug();
  if (storeSlug) {
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith(`/store/${storeSlug}`)) {
      const suffix = currentPath === '/' ? '' : currentPath;
      window.location.replace(`/store/${storeSlug}${suffix}${window.location.search}`);
      return null; // render nothing while browser redirects
    }
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <PlatformAuthProvider>
            <Toast />

            <Routes>
              {/* ── Root: landing or dashboard redirect ────────────────── */}
              <Route path="/" element={<RootRoute />} />

              {/* ── Public pages ───────────────────────────────────────── */}
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* ── Store admin shell (pathless layout route) ─────────── */}
              <Route element={<AdminShell />}>
                <Route path="/dashboard"        element={<Dashboard />} />
                <Route path="/inventory"        element={<Inventory />} />
                <Route path="/purchases"        element={<Purchases />} />
                <Route path="/purchase-history" element={<PurchaseHistory />} />
                <Route path="/analytics"        element={<Analytics />} />
                <Route path="/audit"            element={<AuditLog />} />
                <Route path="/settings"         element={<Settings />} />

                {/* Admin-only routes */}
                <Route path="/upload"           element={<ProtectedRoute adminOnly><Upload /></ProtectedRoute>} />
                <Route path="/upload-history"   element={<ProtectedRoute adminOnly><UploadHistory /></ProtectedRoute>} />
                <Route path="/approvals"        element={<ProtectedRoute adminOnly><Approvals /></ProtectedRoute>} />
                <Route path="/admin/products"   element={<ProtectedRoute adminOnly><AdminProducts /></ProtectedRoute>} />
                <Route path="/admin/orders"     element={<ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute>} />
                <Route path="/admin/customers"  element={<ProtectedRoute adminOnly><AdminCustomers /></ProtectedRoute>} />
                <Route path="/admin/discounts"  element={<ProtectedRoute adminOnly><AdminDiscounts /></ProtectedRoute>} />
              </Route>

              {/* ── Customer-facing storefront ─────────────────────────── */}
              <Route path="/store/:slug" element={<StoreWrapper />}>
                <Route index                                    element={<StoreFront />} />
                <Route path="catalogue"                         element={<Catalogue />} />
                <Route path="product/:id"                       element={<ProductDetail />} />
                <Route path="cart"                              element={<Cart />} />
                <Route path="checkout"                          element={<Checkout />} />
                <Route path="order-confirmation/:orderNumber"   element={<OrderConfirmation />} />
                <Route path="account"                           element={<Account />} />
                <Route path="login"                             element={<StoreLogin />} />
                <Route path="register"                          element={<StoreRegister />} />
              </Route>

              {/* ── Platform super admin ───────────────────────────────── */}
              <Route path="/platform/login" element={<PlatformLogin />} />
              <Route path="/platform" element={<PlatformGuard />}>
                <Route index            element={<Navigate to="/platform/dashboard" replace />} />
                <Route path="dashboard" element={<PlatformDashboard />} />
                <Route path="stores"    element={<PlatformStores />} />
              </Route>

              {/* ── Catch-all ─────────────────────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PlatformAuthProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
