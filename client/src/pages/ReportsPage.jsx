import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import http from '../api/http';
import { AppShell } from '../components/layout/AppShell';
import { ReportView } from '../features/reports/ReportView';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { EmptyState } from '../components/ui/EmptyState';
import { Award, Calendar, ChevronRight } from 'lucide-react';

export default function ReportsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(!sessionId);

  useEffect(() => {
    let active = true;
    if (!sessionId) {
      const fetchReportsList = async () => {
        try {
          setLoading(true);
          const res = await http.get('/reports');
          if (active) {
            setReports(res.data.reports || []);
          }
        } catch {
          // Handled gracefully
        } finally {
          if (active) setLoading(false);
        }
      };
      fetchReportsList();
    }
    return () => {
      active = false;
    };
  }, [sessionId]);

  return (
    <AppShell activeTab="reports">
      {sessionId ? (
        <ReportView sessionId={sessionId} onBack={() => navigate('/reports')} />
      ) : (
        <div className="space-y-6">
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
            <h1 className="text-xl font-bold tracking-tight">Assessment Evaluation Reports</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Review comprehensive multi-dimensional evaluations, verified execution facts, and human review overrides.
            </p>
          </div>

          {loading ? (
            <SkeletonLoader count={3} className="h-24 w-full" />
          ) : reports.length === 0 ? (
            <EmptyState
              title="No evaluation reports found"
              description="Completed interview sessions with generated evaluations will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-sm">Session #{r.sessionId}</span>
                      </div>
                      <Badge variant={r.humanOverride ? 'interviewer' : 'completed'}>
                        {r.humanOverride ? 'Human Overridden' : 'AI Evaluated'}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 pt-1">
                        Score:{' '}
                        {r.humanOverride ? r.humanOverride.overrideScore : r.aiEvaluationScore} / 100
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                    <Button
                      size="sm"
                      className="w-full justify-between text-xs"
                      onClick={() => navigate(`/reports/${r.sessionId}`)}
                    >
                      <span>View Full Evaluation</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
