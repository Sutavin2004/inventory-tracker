import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Store, BarChart2, LogOut, ShieldCheck } from 'lucide-react';
import { usePlatformAuth } from '../context/PlatformAuthContext';

const NAV = [
  { to: '/platform/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/platform/stores',    label: 'All Stores', Icon: Store },
];

export default function PlatformLayout({ children }) {
  const { platformUser, logout } = usePlatformAuth();

  return (
    <div className="flex h-screen bg-slate-950 dark-scroll">
      <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>E-Depot</p>
              <p className="text-purple-400 text-xs">Platform Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-purple-500/15 text-purple-400' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-purple-400' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-slate-800 pt-3">
          <div className="px-3 py-2 text-xs text-slate-500 flex items-center gap-2 mb-2">
            <ShieldCheck size={13} className="text-purple-400" />
            <span className="text-slate-300">{platformUser?.username}</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-14 bg-slate-900/95 border-b border-slate-800 flex items-center px-6 gap-3 flex-shrink-0">
          <span className="text-xs font-semibold px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-md uppercase tracking-wide">
            Platform Admin
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
