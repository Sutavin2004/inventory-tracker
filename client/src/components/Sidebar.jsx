import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Upload, ShoppingCart, History, FileText, LogOut,
  Store, ShoppingBag, Users, Tag, BarChart2, ClipboardList, CheckSquare,
  Settings, ExternalLink, Boxes,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STORE_NAV = [
  { to: '/dashboard',       label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/admin/orders',    label: 'Orders',        Icon: ShoppingBag, admin: true },
  { to: '/admin/customers', label: 'Customers',     Icon: Users,       admin: true },
  { to: '/admin/discounts', label: 'Discounts',     Icon: Tag,         admin: true },
];

const INVENTORY_NAV = [
  { to: '/admin/products',  label: 'Products',       Icon: Store,      admin: true },
  { to: '/inventory',       label: 'Inventory',      Icon: Boxes },
  { to: '/upload',          label: 'Upload Inventory', Icon: Upload,   admin: true },
  { to: '/upload-history',  label: 'Upload History', Icon: FileText,   admin: true },
];

const INSIGHTS_NAV = [
  { to: '/analytics',       label: 'Analytics',      Icon: BarChart2 },
  { to: '/audit',           label: 'Audit Log',       Icon: ClipboardList, admin: true },
  { to: '/purchase-history',label: 'Purchase History',Icon: History },
  { to: '/purchases',       label: 'New Purchase',    Icon: ShoppingCart },
  { to: '/approvals',       label: 'Approvals',       Icon: CheckSquare, admin: true },
];

function NavSection({ title, items, userRole }) {
  const visible = items.filter(i => !i.admin || userRole === 'admin');
  if (!visible.length) return null;
  return (
    <div className="mb-2">
      <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p>
      {visible.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-teal-500/15 text-teal-400'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/60'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={17} className={isActive ? 'text-teal-400' : ''} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const slug = user?.company?.slug || 'edepot-demo';

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full dark-scroll">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Package className="text-white" size={18} />
        </div>
        <div>
          <p className="text-white font-bold leading-none font-display">E-Depot</p>
          <p className="text-teal-400 text-xs mt-0.5">Warehouse Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <NavSection title="Store"      items={STORE_NAV}     userRole={user?.role} />
        <NavSection title="Inventory"  items={INVENTORY_NAV} userRole={user?.role} />
        <NavSection title="Insights"   items={INSIGHTS_NAV}  userRole={user?.role} />
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-3 border-t border-slate-800 pt-3 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive ? 'bg-teal-500/15 text-teal-400' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/60'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings size={17} className={isActive ? 'text-teal-400' : ''} />
              Settings
            </>
          )}
        </NavLink>

        <a
          href={`/store/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 transition-all"
        >
          <ExternalLink size={17} />
          View My Store
        </a>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
