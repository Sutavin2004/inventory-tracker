import { Shield, User, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const slug     = user?.company?.slug || 'edepot-demo';

  return (
    <header className="h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
      <div className="text-slate-500 text-sm">
        {user?.company?.display_name && (
          <span className="text-slate-300 font-medium">{user.company.display_name}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isAdmin && (
          <a
            href={`/store/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border border-teal-500/20 transition-all"
          >
            <ExternalLink size={12} />
            Store Preview
          </a>
        )}

        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
          {isAdmin
            ? <Shield className="text-teal-400" size={15} />
            : <User   className="text-slate-400" size={15} />
          }
          <span className="text-white text-sm font-medium">{user?.username}</span>
          <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold uppercase tracking-wide ${
            isAdmin
              ? 'bg-orange-500/20 text-orange-300'
              : 'bg-slate-600/60 text-slate-300'
          }`}>
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
}
