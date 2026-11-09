export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default:
      'bg-slate-800/80 text-slate-300 border-slate-700/80',
    scheduled:
      'bg-blue-950/60 text-blue-300 border-blue-800/80',
    in_progress:
      'bg-amber-950/60 text-amber-300 border-amber-800/80 animate-pulse',
    completed:
      'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
    cancelled:
      'bg-rose-950/60 text-rose-300 border-rose-800/80',
    admin:
      'bg-purple-950/60 text-purple-300 border-purple-800/80 font-semibold shadow-xs shadow-purple-900/40',
    interviewer:
      'bg-indigo-950/60 text-indigo-300 border-indigo-800/80 font-semibold shadow-xs shadow-indigo-900/40',
    candidate:
      'bg-teal-950/60 text-teal-300 border-teal-800/80 font-semibold shadow-xs shadow-teal-900/40',
    active:
      'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
    inactive:
      'bg-slate-900 text-slate-500 border-slate-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  );
};
