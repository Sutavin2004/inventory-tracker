import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle, XCircle } from 'lucide-react';
import { getUploads } from '../api/uploads';

export default function AuditLog() {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUploads().then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-display">Audit Log</h1>
        <p className="text-slate-400 text-sm mt-0.5">Upload and inventory change history</p>
      </div>

      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <ClipboardList size={28} className="mb-2" />
            <p className="text-sm">No upload history yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Filename</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Uploaded By</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Timestamp</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">Before</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">After</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr
                  key={log.id}
                  className={`border-b border-slate-700/50 transition-colors ${
                    log.status === 'failure' ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-slate-700/20'
                  }`}
                >
                  <td className="px-4 py-3">
                    {log.status === 'success'
                      ? <CheckCircle size={16} className="text-emerald-400" />
                      : <XCircle    size={16} className="text-red-400" />
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">{log.filename}</td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{log.uploaded_by}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                    {new Date(log.uploaded_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400 hidden md:table-cell">{log.rows_before ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-400 hidden md:table-cell">{log.rows_after ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{log.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
