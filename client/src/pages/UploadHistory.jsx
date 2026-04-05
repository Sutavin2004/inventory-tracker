import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { getUploads } from '../api/uploads';
import Spinner from '../components/Spinner';

export default function UploadHistory() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUploads()
      .then(setLogs)
      .catch((err) => console.error('Failed to load upload logs', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Upload History</h1>
        {!loading && (
          <span className="text-slate-400 text-sm tabular-nums">
            {logs.length} upload{logs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-52"><Spinner /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="mx-auto text-slate-600 mb-4" size={40} />
            <p className="text-slate-400 text-sm">No uploads yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/40">
                  {['Status', 'Filename', 'Uploaded By', 'Timestamp', 'Before', 'After', 'Reason'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:brightness-110 transition-all ${
                      log.status === 'failure' ? 'bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      {log.status === 'success' ? (
                        <span className="flex items-center gap-1.5 text-teal-400 text-sm font-medium">
                          <CheckCircle size={14} /> Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
                          <XCircle size={14} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-white text-sm font-mono max-w-[220px] truncate" title={log.filename}>
                      {log.filename}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 text-sm">{log.uploaded_by}</td>
                    <td className="px-5 py-3.5 text-slate-300 text-sm whitespace-nowrap">
                      {new Date(log.uploaded_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 text-sm tabular-nums">
                      {log.rows_before ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 text-sm tabular-nums">
                      {log.rows_after ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[200px] truncate" title={log.reason}>
                      {log.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
