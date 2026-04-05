import { useState, useRef } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { uploadInventory } from '../api/uploads';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

const FILENAME_RE = /^inventory-\d{4}-\d{2}-\d{2}\.xlsx$/;

export default function Upload() {
  const [file,      setFile]      = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const fileInputRef              = useRef();
  const { addToast }              = useToast();

  const handleFileSelect = (f) => {
    if (!f) return;
    if (!FILENAME_RE.test(f.name)) {
      addToast('Invalid filename. Must be: inventory-YYYY-MM-DD.xlsx', 'error');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const data = await uploadInventory(form);
      setResult({ ...data, isError: false });
      addToast('File uploaded successfully!', 'success');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Upload failed';
      setResult({ isError: true, error: msg, filename: file.name });
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Upload Inventory</h1>

      {/* Requirements card */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-teal-400" size={16} />
          <h2 className="text-slate-200 font-semibold text-sm">File Requirements</h2>
        </div>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• Filename format: <code className="text-teal-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">inventory-YYYY-MM-DD.xlsx</code></li>
          <li>• Required columns (in order): <span className="text-slate-300">Item ID, Item Name, Quantity, Warehouse Location, Available Date, Expiry Date</span></li>
          <li>• Item ID must be a unique integer</li>
          <li>• Existing Item IDs will be updated; new IDs will be inserted</li>
          <li>• Duplicate filenames are rejected — each file can only be uploaded once</li>
        </ul>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-teal-500 bg-teal-500/5'
            : file
            ? 'border-teal-600/60 bg-teal-900/10'
            : 'border-slate-600 hover:border-slate-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />

        {file ? (
          <div>
            <FileSpreadsheet className="mx-auto text-teal-400 mb-3" size={38} />
            <p className="text-teal-300 font-semibold">{file.name}</p>
            <p className="text-slate-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB — click to change</p>
          </div>
        ) : (
          <div>
            <UploadIcon className="mx-auto text-slate-500 mb-3" size={38} />
            <p className="text-slate-300 font-medium">Drag & drop your Excel file here</p>
            <p className="text-slate-500 text-sm mt-1">or click to browse · .xlsx up to 10 MB</p>
          </div>
        )}
      </div>

      {/* Upload button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="flex items-center gap-2.5 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-500 disabled:opacity-60 transition-colors font-semibold shadow-lg shadow-teal-600/20"
        >
          {loading ? <Spinner size="sm" /> : <UploadIcon size={17} />}
          {loading ? 'Uploading…' : 'Upload File'}
        </button>
      )}

      {/* Result card */}
      {result && (
        <div className={`bg-slate-800 border rounded-2xl p-6 space-y-5 ${
          result.isError ? 'border-red-700/50' : 'border-teal-700/40'
        }`}>
          {/* Status header */}
          <div className="flex items-center gap-3">
            {result.isError
              ? <XCircle className="text-red-400 flex-shrink-0" size={24} />
              : <CheckCircle className="text-teal-400 flex-shrink-0" size={24} />
            }
            <h3 className="text-lg font-bold text-white">
              {result.isError ? 'Upload Failed' : 'Upload Successful'}
            </h3>
          </div>

          {result.isError ? (
            <div className="bg-red-900/25 border border-red-700/40 rounded-xl p-4">
              <p className="text-red-300 text-sm">{result.error}</p>
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Filename',        value: result.filename,                                        mono: true },
                  { label: 'Uploaded At',     value: new Date(result.uploadedAt).toLocaleString()                      },
                  { label: 'Uploaded By',     value: result.uploadedBy                                                  },
                  { label: 'Inventory Before',value: `${result.rowsBefore} items`                                       },
                  { label: 'Inventory After', value: `${result.rowsAfter} items`                                        },
                  { label: 'Net Change',      value: `+${result.added} added, ${result.updated} updated`, highlight: true },
                ].map(({ label, value, mono, highlight }) => (
                  <div key={label} className="bg-slate-900/50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`text-sm font-medium break-all ${highlight ? 'text-teal-400' : 'text-white'} ${mono ? 'font-mono' : ''}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Row-level warnings */}
              {result.rowErrors?.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-yellow-400" size={15} />
                    <p className="text-yellow-300 text-sm font-semibold">
                      {result.rowErrors.length} row warning{result.rowErrors.length !== 1 ? 's' : ''} (those rows were skipped)
                    </p>
                  </div>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {result.rowErrors.map((e, i) => (
                      <li key={i} className="text-yellow-400/80 text-xs">• {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
