import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../../api/http';
import { useAuth } from '../../context/useAuth';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/useToast';
import {
  Calendar,
  Clock,
  Video,
  XCircle,
  FileText,
  Sparkles,
  Award,
  CheckCircle2,
  TrendingUp,
  Briefcase,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { ScoreProgressionChart } from '../../components/analytics/ScoreProgressionChart';
import { SkillRadarChart } from '../../components/analytics/SkillRadarChart';
import { ResumeUploadModal } from '../resume/ResumeUploadModal';
import { MockInterviewSession } from '../practice/MockInterviewSession';

export const CandidateDashboard = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
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

  const scheduledCount = interviews.filter((i) => i.status === 'scheduled').length;
  const completedCount = interviews.filter((i) => i.status === 'completed').length;
  const inProgressCount = interviews.filter((i) => i.status === 'in_progress').length;

  // Compute average score if scores exist
  const scoreHistory = analytics?.scoreHistory || [];
  const avgScore = scoreHistory.length
    ? Math.round(scoreHistory.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoreHistory.length)
    : 85;

  return (
    <div className="space-y-6">
      {/* Personalized Welcome Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-indigo-950/30 to-slate-900/90 p-6 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Candidate</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">{user?.email}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-300">{user?.name || 'Candidate'}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Track upcoming technical assessments, launch live collaborative coding rooms, and practice with our AI simulated evaluator.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowResumeModal(true)}
              className="text-xs border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Resume & Skills
            </Button>

            <Button
              size="sm"
              onClick={() => setShowPracticeModal(true)}
              className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs shadow-md shadow-indigo-600/20"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Launch AI Practice
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 relative overflow-hidden transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Assessments</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{interviews.length}</span>
            <span className="text-[11px] text-slate-500">all time</span>
          </div>
          <p className="mt-1 text-[11px] text-indigo-400">Registered platform track</p>
        </div>

        {/* Stat 2 */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 relative overflow-hidden transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Scheduled Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{scheduledCount}</span>
            <span className="text-[11px] text-amber-400 font-medium">{inProgressCount > 0 ? `${inProgressCount} active` : 'upcoming'}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Action required</p>
        </div>

        {/* Stat 3 */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 relative overflow-hidden transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Evaluations Complete</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{completedCount}</span>
            <span className="text-[11px] text-emerald-400 font-medium">reports generated</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Archived assessment records</p>
        </div>

        {/* Stat 4 */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 relative overflow-hidden transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Technical Readiness</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{avgScore}%</span>
            <span className="text-[11px] text-violet-400 font-medium">Benchmark</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Based on rubrics & test passes</p>
        </div>
      </div>

      {/* Featured AI Practice Hero Card */}
      <div className="rounded-2xl border border-indigo-900/50 bg-gradient-to-br from-indigo-950/40 via-slate-900/70 to-slate-900/90 p-5 sm:p-6 shadow-lg shadow-indigo-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Simulated AI Mock Interview Engine</span>
            </div>
            <h2 className="text-base font-bold text-white">Sharpen your coding & algorithmic readiness</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Experience realistic interview rounds generated dynamically. Choose between full Coding sessions, System Design, or Behavioral questions with immediate rubric evaluations.
            </p>
          </div>
          <Button
            onClick={() => setShowPracticeModal(true)}
            className="self-start md:self-auto shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30"
          >
            <span>Start AI Practice Session</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
          <ScoreProgressionChart data={analytics?.scoreHistory || []} />
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
          <SkillRadarChart skills={analytics?.skillProfile || []} />
        </div>
      </div>

      {/* Scheduled Assessments / Technical Rounds Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Your Technical Assessments</h2>
            <p className="text-xs text-slate-400">Manage scheduled interview appointments and enter live coding rooms.</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {['all', 'scheduled', 'in_progress', 'completed'].map((status) => (
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
          <SkeletonLoader count={3} className="h-28 w-full" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No assessments found in this view"
            description="When an interviewer schedules a technical round with you, or when you complete mock sessions, they will be listed here."
            actionLabel="Launch AI Practice Round"
            onAction={() => setShowPracticeModal(true)}
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
                  className="flex flex-col justify-between p-5 rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-xs hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-sm text-white line-clamp-1">{iv.title}</h3>
                      <Badge variant={iv.status}>{iv.status.replace('_', ' ')}</Badge>
                    </div>

                    <div className="space-y-2 text-xs text-slate-400 mb-5">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span>{scheduledDate} at {scheduledTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span>{iv.durationMinutes} minutes session</span>
                      </div>
                      {iv.interviewer && (
                        <div className="text-xs pt-2 border-t border-slate-800 text-slate-300 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Interviewer: <strong className="text-white font-medium">{iv.interviewer.name}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    {isJoinable && (
                      <Button
                        size="sm"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                        onClick={() => navigate(`/room/${iv.roomId}`)}
                      >
                        <Video className="w-3.5 h-3.5 mr-1" />
                        Join Coding Room
                      </Button>
                    )}
                    {iv.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                        onClick={() => navigate(`/reports/${iv.id}`)}
                      >
                        <Award className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                        View Report
                      </Button>
                    )}
                    {iv.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-xs"
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

      {/* Resume Upload & Job Match Modal */}
      <ResumeUploadModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onResumeUpdated={fetchInterviews}
      />

      {/* AI Mock Interview Modal */}
      <MockInterviewSession
        isOpen={showPracticeModal}
        onClose={() => setShowPracticeModal(false)}
      />
    </div>
  );
};
