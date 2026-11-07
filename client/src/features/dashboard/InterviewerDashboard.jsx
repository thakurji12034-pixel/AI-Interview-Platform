import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../../api/http';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/useToast';
import {
  Calendar,
  Clock,
  Video,
  Plus,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const InterviewerDashboard = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [form, setForm] = useState({
    candidateEmail: '',
    title: '',
    scheduledAt: '',
    durationMinutes: 60,
  });

  const navigate = useNavigate();
  const toast = useToast();

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await http.get('/interviews');
      setInterviews(res.data.interviews || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await http.get('/interviews');
        if (active) setInterviews(res.data.interviews || []);
      } catch (err) {
        if (active) toast.error(err.response?.data?.message || 'Failed to load interviews');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduleLoading(true);

    try {
      await http.post('/interviews', {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: parseInt(form.durationMinutes, 10),
      });

      toast.success('Interview scheduled successfully');
      setIsScheduleOpen(false);
      setForm({
        candidateEmail: '',
        title: '',
        scheduledAt: '',
        durationMinutes: 60,
      });
      fetchInterviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule interview');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await http.patch(`/interviews/${id}/status`, { status });
      toast.success(`Interview marked as ${status.replace('_', ' ')}`);
      fetchInterviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filtered = interviews.filter((iv) => {
    if (filter === 'all') return true;
    return iv.status === filter;
  });

  const stats = {
    total: interviews.length,
    scheduled: interviews.filter((i) => i.status === 'scheduled').length,
    in_progress: interviews.filter((i) => i.status === 'in_progress').length,
    completed: interviews.filter((i) => i.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Interviewer Workspace</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Conduct live coding assessments, review candidates, and schedule new interview slots.
          </p>
        </div>
        <Button onClick={() => setIsScheduleOpen(true)}>
          <Plus className="w-4 h-4" />
          Schedule Interview
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-slate-500 font-medium">Total Interviews</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{stats.total}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-blue-500 font-medium">Scheduled</p>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{stats.scheduled}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-amber-500 font-medium">In Progress</p>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.in_progress}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-emerald-500 font-medium">Completed</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition ${
              filter === status
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Interview Cards List */}
      {loading ? (
        <SkeletonLoader count={4} className="h-32 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No interview sessions"
          description="Schedule a technical assessment session with a candidate using the button above."
          actionLabel="Schedule Interview"
          onAction={() => setIsScheduleOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((iv) => {
            const scheduledDate = new Date(iv.scheduledAt).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const scheduledTime = new Date(iv.scheduledAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={iv.id}
                className="flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-sm line-clamp-1">{iv.title}</h3>
                    <Badge variant={iv.status}>{iv.status.replace('_', ' ')}</Badge>
                  </div>

                  <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{scheduledDate} at {scheduledTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{iv.durationMinutes} minutes</span>
                    </div>
                    {iv.candidate && (
                      <div className="text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        Candidate: <span className="font-medium">{iv.candidate.name} ({iv.candidate.email})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/room/${iv.roomId}`)}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Enter Room
                  </Button>
                  {iv.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(iv.id, 'in_progress')}
                    >
                      <Play className="w-3.5 h-3.5 text-amber-500" />
                      Start
                    </Button>
                  )}
                  {iv.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(iv.id, 'completed')}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Finish
                    </Button>
                  )}
                  {iv.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => handleStatusChange(iv.id, 'cancelled')}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Technical Assessment"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Candidate Email
            </label>
            <input
              type="email"
              required
              placeholder="candidate@example.com"
              value={form.candidateEmail}
              onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Session Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Backend Architecture Round"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (minutes)
              </label>
              <select
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsScheduleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={scheduleLoading}>
              Confirm Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
