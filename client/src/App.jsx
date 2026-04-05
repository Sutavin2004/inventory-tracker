import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }     from './context/AuthContext';
import { ToastProvider }    from './context/ToastContext';
import Toast                from './components/Toast';
import Layout               from './components/Layout';
import ProtectedRoute       from './components/ProtectedRoute';
import Login                from './pages/Login';
import Dashboard            from './pages/Dashboard';
import Inventory            from './pages/Inventory';
import Upload               from './pages/Upload';
import Purchases            from './pages/Purchases';
import PurchaseHistory      from './pages/PurchaseHistory';
import UploadHistory        from './pages/UploadHistory';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {/* Toast stack renders above everything, including the login page */}
          <Toast />

          <Routes>
            <Route path="/login" element={<Login />} />

            {/* All app routes live inside the Layout shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"        element={<Dashboard />} />
              <Route path="inventory"        element={<Inventory />} />
              <Route path="purchases"        element={<Purchases />} />
              <Route path="purchase-history" element={<PurchaseHistory />} />

              {/* Admin-only routes */}
              <Route
                path="upload"
                element={
                  <ProtectedRoute adminOnly>
                    <Upload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="upload-history"
                element={
                  <ProtectedRoute adminOnly>
                    <UploadHistory />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all → dashboard (ProtectedRoute there handles unauthenticated) */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
