import { CheckSquare } from 'lucide-react';

export default function Approvals() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-display">Approvals</h1>
        <p className="text-slate-400 text-sm mt-0.5">Pending items requiring your review</p>
      </div>

      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 flex flex-col items-center justify-center py-20 text-center">
        <CheckSquare size={40} className="text-teal-500/50 mb-3" />
        <p className="text-slate-300 font-semibold">All caught up!</p>
        <p className="text-slate-500 text-sm mt-1">There are no items pending approval right now.</p>
      </div>
    </div>
  );
}
