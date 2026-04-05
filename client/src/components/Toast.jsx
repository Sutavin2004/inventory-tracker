import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const CONFIG = {
  success: { Icon: CheckCircle, wrap: 'bg-teal-900/95 border-teal-700/60',   icon: 'text-teal-400',   text: 'text-teal-100'   },
  error:   { Icon: XCircle,     wrap: 'bg-red-900/95 border-red-700/60',     icon: 'text-red-400',    text: 'text-red-100'    },
  warning: { Icon: AlertTriangle,wrap: 'bg-yellow-900/95 border-yellow-700/60',icon:'text-yellow-400',text: 'text-yellow-100' },
  info:    { Icon: Info,         wrap: 'bg-slate-700/95 border-slate-600',   icon: 'text-slate-300',  text: 'text-slate-100'  },
};

export default function Toast() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const { Icon, wrap, icon, text } = CONFIG[toast.type] ?? CONFIG.info;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 border rounded-xl shadow-xl backdrop-blur-sm pointer-events-auto ${wrap}`}
          >
            <Icon className={`flex-shrink-0 mt-0.5 ${icon}`} size={18} />
            <p className={`flex-1 text-sm leading-relaxed ${text}`}>{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-current"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
