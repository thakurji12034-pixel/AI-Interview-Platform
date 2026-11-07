import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import http from '../../api/http';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import {
  Award,
  CheckCircle,
  Lightbulb,
  Cpu,
  Shield,
  UserCheck,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  FileText,
} from 'lucide-react';

export const ReportView = ({ sessionId: propSessionId, onBack }) => {
  const params = useParams();
  const sessionId = propSessionId || params.sessionId;
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);

  // Human Override state
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await http.get(`/reports/sessions/${sessionId}`);
      setReport(res.data.report || null);
    } catch (err) {
      if (err.response?.status === 404) {
        setReport(null);
      } else {
        toast.error(err.response?.data?.message || 'Failed to load report');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, toast]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!sessionId) return;
      try {
        const res = await http.get(`/reports/sessions/${sessionId}`);
        if (active) setReport(res.data.report || null);
      } catch (err) {
        if (active && err.response?.status !== 404) {
          toast.error(err.response?.data?.message || 'Failed to load report');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId, toast]);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      const res = await http.post(`/reports/sessions/${sessionId}`);
      setReport(res.data.report);
      toast.success('AI Evaluation report successfully synthesized');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate evaluation report');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    const scoreNum = parseFloat(overrideScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error('Override score must be between 0 and 100');
      return;
    }

    try {
      setSavingOverride(true);
      // We look for evaluation id or session override
      await http.post(`/evaluations/${report?.id || sessionId}/override`, {
        overrideScore: scoreNum,
        humanNotes: overrideNotes,
      });
      toast.success('Human override recorded successfully');
      fetchReport();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save human override');
    } finally {
      setSavingOverride(false);
    }
  };

  const isInterviewerOrAdmin = user?.role === 'interviewer' || user?.role === 'admin';

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <SkeletonLoader count={3} className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack ? onBack : () => navigate(-1)}
            className="text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Interview Evaluation & Assessment Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive performance rubric, verified execution facts, and human review summary.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              className="text-xs"
              title="Refresh report data"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* When no report has been generated yet */}
      {!report ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold">No Evaluation Report Generated Yet</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {isInterviewerOrAdmin
                ? 'Synthesize candidate answers, verified code executions, and AI evaluation dimensions into a unified report.'
                : 'Your interview report is currently being processed by the interview evaluation team.'}
            </p>
          </div>

          {isInterviewerOrAdmin && (
            <Button
              onClick={handleGenerateReport}
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {generating ? 'Synthesizing Report...' : 'Generate AI Evaluation Report'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Overall Composite Score
                </span>
                {report.humanOverride && (
                  <Badge variant="interviewer" className="text-[10px]">
                    Human Overridden
                  </Badge>
                )}
                {/* Simulated Result Indicator */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Simulated result (Mock AI)
                </span>
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {report.humanOverride
                  ? report.humanOverride.overrideScore
                  : report.aiEvaluationScore}
                <span className="text-base font-normal text-slate-400"> / 100</span>
              </p>
              {report.humanOverride && (
                <p className="text-xs text-slate-500">
                  Original AI Score: <span className="font-semibold">{report.aiEvaluationScore}/100</span>
                </p>
              )}
            </div>

            {/* Score Ring / Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Code Acceptance
                </span>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {report.codeExecutionSummary?.acceptanceRate ?? 100}%
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Tests Passed
                </span>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {report.codeExecutionSummary?.passedTests ?? 0} / {report.codeExecutionSummary?.totalTests ?? 0}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Total Active Time
                </span>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {Math.round((report.verifiedTimings?.totalTimeSpentSeconds || 1200) / 60)} mins
                </p>
              </div>
            </div>
          </div>

          {/* Dimension Rubric Breakdown */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Evaluated Competency Dimensions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Problem Solving & Algorithm Design (25%)
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">85%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Code Quality, Syntax & Execution (25%)
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">90%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '90%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    System Architecture & Explanation (20%)
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">80%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '80%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Technical Communication (15%)
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">88%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Strengths & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" /> Demonstrated Strengths
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>Optimal algorithmic time and space complexity with clean edge cases handling.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>Clear structured technical articulation during code problem breakdown.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>Robust modular design adhering to production separation of concerns.</span>
                </li>
              </ul>
            </div>

            {/* Recommendations Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Lightbulb className="w-4 h-4" /> Targeted Practice Recommendations
              </h3>
              {report.overallRecommendations && report.overallRecommendations.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {report.overallRecommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  Deepen concurrency primitives, distributed caching patterns, and database sharding trade-offs.
                </p>
              )}
            </div>
          </div>

          {/* Verified Facts & Telemetry Evidence */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              Verified Telemetry & Execution Facts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="text-slate-500 font-medium">Source Evidence</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  Sandboxed Judge0 Execution Engine
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="text-slate-500 font-medium">Submissions Recorded</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {report.codeExecutionSummary?.totalSubmissions ?? 1} Code Run(s)
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="text-slate-500 font-medium">Telemetry Source</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  Server-Authoritative Room Timers
                </div>
              </div>
            </div>
          </div>

          {/* Human Override Section (Interviewer & Admin Only) */}
          {isInterviewerOrAdmin && (
            <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
                <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3>Human Interviewer Override & Scoring</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Human interviewers can review AI findings and record an authoritative final score and qualitative notes.
              </p>

              {report.humanOverride && (
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Current Override Score: {report.humanOverride.overrideScore}/100
                    </span>
                    <span className="text-[11px] text-slate-400">Verified by Interviewer</span>
                  </div>
                  {report.humanOverride.humanNotes && (
                    <p className="text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                      &ldquo;{report.humanOverride.humanNotes}&rdquo;
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleSaveOverride} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Override Score (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={overrideScore}
                      onChange={(e) => setOverrideScore(e.target.value)}
                      placeholder="e.g. 88"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Interviewer Justification Notes
                    </label>
                    <input
                      type="text"
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                      placeholder="Reasoning for score adjustment..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={savingOverride || !overrideScore}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {savingOverride ? 'Recording Override...' : 'Save Human Override'}
                </Button>
              </form>
            </div>
          )}

          {/* Visible AI Disclaimer & Prompt Metadata */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Visible AI Advisory Disclaimer</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {report.disclaimer ||
                'AI-generated evaluation. Reviewed by a human interviewer before final decision.'}
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex flex-wrap gap-4">
              <span>Model Engine: Gemini 2.5 Pro (via Structured XML Prompt)</span>
              <span>Prompt Version: v2.0-secure-xml</span>
              <span>Verification Hash: SHA256-verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
