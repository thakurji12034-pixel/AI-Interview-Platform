import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../../api/http';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/useToast';
import { ScoreDistributionChart } from '../../components/analytics/ScoreDistributionChart';
import { RubricAveragesChart } from '../../components/analytics/RubricAveragesChart';
import {
  Calendar,
  Clock,
  Video,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Award,
  Users,
  Code2,
  FileText,
  Activity,
  Briefcase,
  UserCheck,
} from 'lucide-react';

export const InterviewerDashboard = ({ onTabChange }) => {
  const [interviews, setInterviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
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
      const [resInterviews, resAnalytics] = await Promise.allSettled([
        http.get('/interviews'),
        http.get('/analytics/interviewer'),
      ]);
      if (resInterviews.status === 'fulfilled') {
        setInterviews(resInterviews.value.data.interviews || []);
      }
      if (resAnalytics.status === 'fulfilled') {
        setAnalytics(resAnalytics.value.data.analytics || null);
      }
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
        const [resInterviews, resAnalytics] = await Promise.allSettled([
          http.get('/interviews'),
          http.get('/analytics/interviewer'),
        ]);
        if (active) {
          if (resInterviews.status === 'fulfilled') {
            setInterviews(resInterviews.value.data.interviews || []);
          }
          if (resAnalytics.status === 'fulfilled') {
            setAnalytics(resAnalytics.value.data.analytics || null);
          }
        }
      } catch (err) {
        if (active) toast.error(err.response?.data?.message || 'Failed to load dashboard data');
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
      {/* Workspace Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90 p-6 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Interviewer Command</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">Collaborative Coding & Evaluation</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Interviewer Workspace</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Conduct live technical assessments, invite candidates, execute synchronized code tests, and submit evaluation rubrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onTabChange && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTabChange('questions')}
                className="text-xs border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
              >
                <Code2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Question Bank
              </Button>
            )}

            {onTabChange && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTabChange('reports')}
                className="text-xs border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
              >
                <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Candidate Reports
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setIsScheduleOpen(true)}
              className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4 mr-1" />
              Schedule Interview
            </Button>
          </div>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Interviews</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.total}</span>
            <span className="text-[11px] text-slate-500">managed</span>
          </div>
          <p className="mt-1 text-[11px] text-indigo-400">All historical sessions</p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-400">Upcoming Slots</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.scheduled}</span>
            <span className="text-[11px] text-blue-400 font-medium">scheduled</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Ready for execution</p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Live / In-Progress</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.in_progress}</span>
            <span className="text-[11px] text-amber-400 font-medium">active now</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Synchronized rooms</p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.completed}</span>
            <span className="text-[11px] text-emerald-400 font-medium">evaluated</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Final scores generated</p>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
          <ScoreDistributionChart distribution={analytics?.scoreDistribution || {}} />
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
          <RubricAveragesChart rubricAverages={analytics?.rubricAverages || {}} />
        </div>
      </div>

      {/* Session Management Table/List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Interview Appointments</h2>
            <p className="text-xs text-slate-400">Candidate schedules, live coding rooms, and evaluation control.</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition ${
                  filter === status
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <SkeletonLoader count={4} className="h-32 w-full" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No interview sessions found"
            description="Schedule a technical assessment session with a candidate using the button above."
            actionLabel="Schedule Technical Interview"
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
                  className="flex flex-col justify-between p-5 rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-xs hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-sm text-white line-clamp-1">{iv.title}</h3>
                      <Badge variant={iv.status}>{iv.status.replace('_', ' ')}</Badge>
                    </div>

                    <div className="space-y-2 text-xs text-slate-400 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{scheduledDate} at {scheduledTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{iv.durationMinutes} minutes duration</span>
                      </div>
                      {iv.candidate && (
                        <div className="text-xs pt-2 border-t border-slate-800 text-slate-300 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                          <span>Candidate: <strong className="text-white font-medium">{iv.candidate.name}</strong> ({iv.candidate.email})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
                    <Button
                      size="sm"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      onClick={() => navigate(`/room/${iv.roomId}`)}
                    >
                      <Video className="w-3.5 h-3.5 mr-1" />
                      Enter Room
                    </Button>

                    {iv.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                        onClick={() => handleStatusChange(iv.id, 'in_progress')}
                      >
                        <Play className="w-3.5 h-3.5 mr-1 text-amber-400" />
                        Start
                      </Button>
                    )}

                    {iv.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-emerald-800 text-emerald-300 hover:bg-emerald-950/40"
                        onClick={() => handleStatusChange(iv.id, 'completed')}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        Finish
                      </Button>
                    )}

                    {iv.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/reports/${iv.id}`)}
                        className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        <Award className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                        Report
                      </Button>
                    )}

                    {iv.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-xs"
                        onClick={() => handleStatusChange(iv.id, 'cancelled')}
                        title="Cancel Interview"
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
      </div>

      {/* Schedule Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Technical Assessment Session"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Candidate Email Address
            </label>
            <input
              type="email"
              required
              placeholder="candidate@example.com"
              value={form.candidateEmail}
              onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Session Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Backend Architecture Round"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Duration (minutes)
              </label>
              <select
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <Button
              variant="ghost"
              onClick={() => setIsScheduleOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={scheduleLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4"
            >
              Confirm Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
