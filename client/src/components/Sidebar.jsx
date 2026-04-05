import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Upload,
  ShoppingCart,
  History,
  FileText,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard',       label: 'Dashboard',       Icon: LayoutDashboard },
  { to: '/inventory',       label: 'Inventory',        Icon: Package         },
  { to: '/upload',          label: 'Upload',           Icon: Upload,  admin: true },
  { to: '/purchases',       label: 'New Purchase',     Icon: ShoppingCart    },
  { to: '/purchase-history',label: 'Purchase History', Icon: History         },
  { to: '/upload-history',  label: 'Upload History',   Icon: FileText, admin: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Package className="text-white" size={18} />
        </div>
        <div>
          <p className="text-white font-bold leading-none">Inventory</p>
          <p className="text-teal-400 text-xs mt-0.5">Tracker</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.filter(item => !item.admin || user?.role === 'admin').map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/15 text-teal-400 shadow-inner'
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
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-slate-700 pt-3">
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
