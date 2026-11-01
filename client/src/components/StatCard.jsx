const TONES = {
  indigo: 'border-l-indigo-500',
  blue: 'border-l-blue-500',
  amber: 'border-l-amber-500',
  emerald: 'border-l-emerald-500',
};

export default function StatCard({ label, value, tone = 'indigo' }) {
  return (
    <div className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${TONES[tone]}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
    </div>
  );
}