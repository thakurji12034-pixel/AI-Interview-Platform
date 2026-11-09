import StatusBadge from './StatusBadge';

const formatDate = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const base = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60';

export default function InterviewCard({ interview, isInterviewer, busy, onStatus, onJoin }) {
  const other = isInterviewer ? interview.candidate : interview.interviewer;
  const canJoin = ['scheduled', 'in_progress'].includes(interview.status);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-slate-800">{interview.title}</h3>
          <StatusBadge status={interview.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {isInterviewer ? 'Candidate' : 'Interviewer'}:{' '}
          <span className="font-medium text-slate-700">{other?.name}</span> ({other?.email})
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {formatDate(interview.scheduledAt)} &middot; {interview.durationMinutes} min
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canJoin && (
          <button
            disabled={busy}
            onClick={() => onJoin(interview)}
            className={`${base} bg-indigo-600 text-white hover:bg-indigo-700`}
          >
            Join room
          </button>
        )}
        {isInterviewer && interview.status === 'scheduled' && (
          <button
            disabled={busy}
            onClick={() => onStatus(interview.id, 'in_progress')}
            className={`${base} border border-slate-200 text-slate-700 hover:bg-slate-50`}
          >
            Start
          </button>
        )}
        {isInterviewer && interview.status === 'in_progress' && (
          <button
            disabled={busy}
            onClick={() => onStatus(interview.id, 'completed')}
            className={`${base} bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            Complete
          </button>
        )}
        {interview.status === 'scheduled' && (
          <button
            disabled={busy}
            onClick={() => onStatus(interview.id, 'cancelled')}
            className={`${base} border border-red-200 text-red-600 hover:bg-red-50`}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}