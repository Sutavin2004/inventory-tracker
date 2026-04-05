import { Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  return (
    <header className="h-14 bg-slate-800/80 backdrop-blur border-b border-slate-700 flex items-center justify-end px-6 flex-shrink-0">
      <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-700/60 border border-slate-600/60 rounded-xl">
        {isAdmin
          ? <Shield className="text-teal-400" size={15} />
          : <User   className="text-slate-400" size={15} />
        }
        <span className="text-white text-sm font-medium">{user?.username}</span>
        <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold uppercase tracking-wide ${
          isAdmin
            ? 'bg-teal-500/20 text-teal-300'
            : 'bg-slate-600/60 text-slate-300'
        }`}>
          {user?.role}
        </span>
      </div>
    </header>
  );
}
