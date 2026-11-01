import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import InterviewCard from '../components/InterviewCard';
import ScheduleModal from '../components/ScheduleModal';
import { listInterviews, changeStatus, errorMessage } from '../api/interviews';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const SUCCESS_TEXT = {
  in_progress: 'Interview started.',
  completed: 'Interview marked as completed.',
  cancelled: 'Interview cancelled.',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isInterviewer = user.role === 'interviewer';

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }

  const load = useCallback(async () => {
    try {
      setInterviews(await listInterviews());
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Notice 4 second baad apne aap hat jaye
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const counts = useMemo(() => {
    const c = { scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 };
    interviews.forEach((i) => {
      c[i.status] += 1;
    });
    return c;
  }, [interviews]);

  const visible =
    filter === 'all' ? interviews : interviews.filter((i) => i.status === filter);

  const handleStatus = async (id, status) => {
    if (status === 'cancelled' && !window.confirm('Cancel this interview?')) return;

    setBusyId(id);
    try {
      await changeStatus(id, status);
      setNotice({ type: 'success', text: SUCCESS_TEXT[status] });
      await load();
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const handleJoin = (interview) => navigate(`/room/${interview.roomId}`);

  const handleCreated = async () => {
    setShowModal(false);
    setNotice({ type: 'success', text: 'Interview scheduled.' });
    await load();
  };

  const emptyText =
    interviews.length === 0
      ? isInterviewer
        ? 'No interviews yet. Schedule your first interview to get started.'
        : 'No interviews yet. Your interviewer will schedule one using your email.'
      : 'No interviews in this category.';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isInterviewer
                ? 'Schedule interviews and run live coding rounds.'
                : 'Your upcoming interviews and practice rooms.'}
            </p>
          </div>
          {isInterviewer && (
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              + Schedule interview
            </button>
          )}
        </div>

        {notice && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total interviews" value={interviews.length} tone="indigo" />
          <StatCard label="Scheduled" value={counts.scheduled} tone="blue" />
          <StatCard label="In progress" value={counts.in_progress} tone="amber" />
          <StatCard label="Completed" value={counts.completed} tone="emerald" />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                filter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <section className="space-y-3">
          {loading ? (
            <p className="py-10 text-center text-slate-500">Loading interviews...</p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center text-slate-500">
              {emptyText}
            </div>
          ) : (
            visible.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                isInterviewer={isInterviewer}
                busy={busyId === interview.id}
                onStatus={handleStatus}
                onJoin={handleJoin}
              />
            ))
          )}
        </section>
      </main>

      {showModal && (
        <ScheduleModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}