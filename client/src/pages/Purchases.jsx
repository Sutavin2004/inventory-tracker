import { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, AlertTriangle } from 'lucide-react';
import { getInventory } from '../api/inventory';
import { createPurchase } from '../api/purchases';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';

const today = () => new Date().toISOString().split('T')[0];
const parseLocal = (str) => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d); };

const EMPTY = { itemId: '', quantityPurchased: '', buyerName: '', purchaseDate: today() };

export default function Purchases() {
  const [items,       setItems]       = useState([]);
  const [loadingItems,setLoadingItems]= useState(true);
  const [form,        setForm]        = useState(EMPTY);
  const [errors,      setErrors]      = useState({});
  const [showModal,   setShowModal]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [lastResult,  setLastResult]  = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    getInventory({ page: 1, limit: 99999 })
      .then((d) => setItems(d.items))
      .catch(() => addToast('Failed to load inventory', 'error'))
      .finally(() => setLoadingItems(false));
  }, []); // eslint-disable-line

  const selected = items.find((i) => i.item_id === parseInt(form.itemId));

  const itemWarning = () => {
    if (!selected || !form.purchaseDate) return null;
    const pd = parseLocal(form.purchaseDate);
    if (parseLocal(selected.available_date) > pd)
      return `Item not yet available until ${selected.available_date}`;
    if (parseLocal(selected.expiry_date) < pd)
      return `Item expired on ${selected.expiry_date}`;
    return null;
  };

  const validate = () => {
    const e = {};
    if (!form.itemId)                      e.itemId = 'Please select an item';
    const qty = parseInt(form.quantityPurchased);
    if (!form.quantityPurchased || isNaN(qty) || qty <= 0)
      e.quantityPurchased = 'Quantity must be greater than 0';
    else if (selected && qty > selected.quantity)
      e.quantityPurchased = `Exceeds available quantity (${selected.quantity})`;
    if (!form.buyerName.trim())            e.buyerName = 'Buyer name is required';
    if (!form.purchaseDate)                e.purchaseDate = 'Purchase date is required';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) setShowModal(true);
  };

  const handleConfirm = async () => {
    setShowModal(false);
    setSubmitting(true);
    try {
      const res = await createPurchase({
        itemId:            parseInt(form.itemId),
        quantityPurchased: parseInt(form.quantityPurchased),
        buyerName:         form.buyerName.trim(),
        purchaseDate:      form.purchaseDate,
      });
      setLastResult(res);
      addToast('Purchase logged successfully!', 'success');
      setForm(EMPTY);
      setErrors({});
      // Refresh items to reflect new quantities
      const updated = await getInventory({ page: 1, limit: 99999 });
      setItems(updated.items);
    } catch (err) {
      addToast(err.response?.data?.error ?? 'Purchase failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, error, children }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );

  const inputCls = 'w-full px-3.5 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-sm';
  const warning  = itemWarning();

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-white">Log a Purchase</h1>

      {/* Success banner */}
      {lastResult && (
        <div className="bg-teal-900/30 border border-teal-700/50 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle className="text-teal-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-teal-300 font-semibold">Purchase Logged</p>
            <p className="text-teal-400/80 text-sm mt-0.5">
              {lastResult.quantityPurchased}× {lastResult.itemName} —{' '}
              {lastResult.remainingQuantity} unit{lastResult.remainingQuantity !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-5">

        {/* Item select */}
        <Field label="Item" error={errors.itemId}>
          {loadingItems ? (
            <div className="flex items-center gap-2 py-2 text-slate-400 text-sm">
              <Spinner size="sm" /> Loading items…
            </div>
          ) : (
            <select
              value={form.itemId}
              onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select an item…</option>
              {items.map((item) => (
                <option key={item.item_id} value={item.item_id}>
                  [{item.item_id}] {item.item_name} — qty: {item.quantity}
                </option>
              ))}
            </select>
          )}
        </Field>

        {/* Item warning */}
        {warning && (
          <div className="bg-yellow-900/25 border border-yellow-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="text-yellow-400 flex-shrink-0" size={15} />
            <p className="text-yellow-300 text-sm">{warning}</p>
          </div>
        )}

        {/* Quantity */}
        <Field
          label={
            <span>
              Quantity
              {selected && (
                <span className="ml-2 text-slate-500 font-normal text-xs">
                  ({selected.quantity} available)
                </span>
              )}
            </span>
          }
          error={errors.quantityPurchased}
        >
          <input
            type="number"
            min="1"
            max={selected?.quantity}
            placeholder="Enter quantity…"
            value={form.quantityPurchased}
            onChange={(e) => setForm((f) => ({ ...f, quantityPurchased: e.target.value }))}
            className={inputCls}
          />
        </Field>

        {/* Buyer name */}
        <Field label="Buyer Name" error={errors.buyerName}>
          <input
            type="text"
            placeholder="Enter buyer name…"
            value={form.buyerName}
            onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
            className={inputCls}
          />
        </Field>

        {/* Purchase date */}
        <Field label="Purchase Date" error={errors.purchaseDate}>
          <input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
            className={inputCls}
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2.5 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-500 disabled:opacity-60 transition-colors shadow-lg shadow-teal-600/15"
        >
          {submitting ? <Spinner size="sm" /> : <ShoppingCart size={17} />}
          {submitting ? 'Processing…' : 'Submit Purchase'}
        </button>
      </form>

      {/* Confirmation modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Confirm Purchase"
        confirmLabel="Confirm Purchase"
        onConfirm={handleConfirm}
      >
        <div className="space-y-3 text-sm">
          {[
            ['Item',              selected?.item_name],
            ['Quantity',          form.quantityPurchased],
            ['Buyer',             form.buyerName],
            ['Date',              form.purchaseDate],
            ['Remaining after',   selected
              ? `${selected.quantity - parseInt(form.quantityPurchased || 0)} units`
              : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-start gap-4">
              <span className="text-slate-400 flex-shrink-0">{label}:</span>
              <span className="text-white font-medium text-right">{value}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
