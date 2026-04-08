import { Settings, LayoutDashboard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPlatformUrl } from '../utils/subdomain';

/**
 * Floating toolbar shown at the bottom of every storefront page when an
 * admin is browsing their own store. Detected by checking localStorage for
 * a valid admin token whose companySlug matches the current store slug.
 */
export default function AdminStoreToolbar({ storeName, slug }) {
  const navigate = useNavigate();

  // Check if logged-in admin owns this store
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;
  let adminUser;
  try { adminUser = JSON.parse(storedUser); } catch { return null; }

  // Only show toolbar if admin JWT's companySlug matches the store being viewed
  if (adminUser.role !== 'admin' && adminUser.type !== 'admin') return null;
  const adminSlug = adminUser.companySlug || adminUser.company?.slug;
  if (adminSlug && adminSlug !== slug) return null;

  const dashboardUrl = getPlatformUrl() + '/dashboard';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#0F172A',
        color: 'white',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,
        borderTop: '2px solid #0F766E',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <span className="flex items-center gap-1.5 text-teal-400 text-sm font-bold">
        <Settings size={15} className="animate-none" />
        Admin Mode
      </span>

      <span className="text-slate-600">|</span>

      <span className="text-slate-400 text-sm hidden sm:block">
        Viewing: <span className="text-white font-medium">{storeName}</span>
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => { window.location.href = dashboardUrl; }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <LayoutDashboard size={13} />
          Back to Dashboard
        </button>
        <a
          href={`${getPlatformUrl()}/settings`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Settings size={13} />
          Edit Store Settings
        </a>
      </div>
    </div>
  );
}
