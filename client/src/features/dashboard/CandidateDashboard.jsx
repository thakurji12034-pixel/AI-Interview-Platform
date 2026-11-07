import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../../api/http';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/useToast';
import { Calendar, Clock, Video, XCircle } from 'lucide-react';
import { ScoreProgressionChart } from '../../components/analytics/ScoreProgressionChart';
import { SkillRadarChart } from '../../components/analytics/SkillRadarChart';

export const CandidateDashboard = () => {
  const [interviews, setInterviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const toast = useToast();

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const [resInterviews, resAnalytics] = await Promise.allSettled([
        http.get('/interviews'),
        http.get('/analytics/candidate'),
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
          http.get('/analytics/candidate'),
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

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) return;
    try {
      setLoading(true);
      await http.patch(`/interviews/${id}/status`, { status: 'cancelled' });
      toast.success('Interview cancelled');
      fetchInterviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel interview');
      setLoading(false);
    }
  };

  const filtered = interviews.filter((iv) => {
    if (filter === 'all') return true;
    return iv.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Candidate Portal</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track your technical assessments, join live coding sessions, and view evaluation statuses.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {['all', 'scheduled', 'in_progress', 'completed'].map((status) => (
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
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ScoreProgressionChart data={analytics?.scoreHistory || []} />
        <SkillRadarChart skills={analytics?.skillProfile || []} />
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonLoader count={4} className="h-28 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No interviews scheduled"
          description="When an interviewer schedules a technical assessment session with you, it will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((iv) => {
            const isJoinable = iv.status === 'scheduled' || iv.status === 'in_progress';
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

                  <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 mb-5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{scheduledDate} at {scheduledTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{iv.durationMinutes} minutes session</span>
                    </div>
                    {iv.interviewer && (
                      <div className="text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        Interviewer: <span className="font-medium">{iv.interviewer.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {isJoinable && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/room/${iv.roomId}`)}
                    >
                      <Video className="w-3.5 h-3.5" />
                      Join Coding Room
                    </Button>
                  )}
                  {iv.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => handleCancel(iv.id)}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
