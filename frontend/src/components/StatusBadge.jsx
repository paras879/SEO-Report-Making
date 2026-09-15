const MAP = {
  draft: { label: 'Draft', cls: 'bg-slate-100/90 text-slate-700 border-slate-200/80', dot: 'bg-slate-400' },
  submitted: { label: 'Submitted to TL', cls: 'bg-blue-50/90 text-blue-700 border-blue-200/80', dot: 'bg-blue-500' },
  tl_rejected: { label: 'Returned by TL', cls: 'bg-amber-50/90 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' },
  forwarded: { label: 'Forwarded to Admin', cls: 'bg-indigo-50/90 text-indigo-700 border-indigo-200/80', dot: 'bg-indigo-500' },
  admin_rejected: { label: 'Returned by Admin', cls: 'bg-orange-50/90 text-orange-800 border-orange-200/80', dot: 'bg-orange-500' },
  admin_approved: { label: 'Approved', cls: 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
