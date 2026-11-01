const STYLES = {
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const LABELS = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}