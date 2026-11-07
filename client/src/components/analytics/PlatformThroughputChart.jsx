import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Table, BarChart2 } from 'lucide-react';

const VELOCITY_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b'];

export const PlatformThroughputChart = ({
  analytics = null,
  title = 'Platform Throughput & Resource Metrics',
  height = 240,
}) => {
  const [showTable, setShowTable] = useState(false);

  const userVelocity = analytics?.userVelocity || {};
  const platformStats = analytics?.platformStats || {};
  const aiTokenUsage = analytics?.aiTokenUsage || {};

  const compositionData = [
    { name: 'Candidates', count: userVelocity.candidateCount || 0, color: VELOCITY_COLORS[0] },
    { name: 'Interviewers', count: userVelocity.interviewerCount || 0, color: VELOCITY_COLORS[1] },
    { name: 'Admins', count: userVelocity.adminCount || 0, color: VELOCITY_COLORS[2] },
    { name: 'Active Users', count: userVelocity.activeUsers || 0, color: VELOCITY_COLORS[3] },
  ];

  const throughputData = [
    { metric: 'Total Interviews', value: platformStats.totalInterviews || 0 },
    { metric: 'Completed Sessions', value: platformStats.completedInterviews || 0 },
    { metric: 'Code Submissions', value: platformStats.totalSubmissions || 0 },
    { metric: 'Accepted Submissions', value: platformStats.acceptedSubmissions || 0 },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            System-wide capacity, user roles, code submissions, and AI token consumption
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-label={showTable ? 'Switch to interactive chart view' : 'Switch to accessible data table view'}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition"
        >
          {showTable ? (
            <>
              <BarChart2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Chart View</span>
            </>
          ) : (
            <>
              <Table className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Table View</span>
            </>
          )}
        </button>
      </div>

      {showTable ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">User Composition</h4>
            <table className="w-full text-left text-xs border-collapse">
              <caption className="sr-only">Detailed breakdown of platform user roles and activity status</caption>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th scope="col" className="py-2 px-3 font-medium">User Role / State</th>
                  <th scope="col" className="py-2 px-3 font-medium text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {compositionData.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">{row.name}</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assessment Throughput</h4>
            <table className="w-full text-left text-xs border-collapse">
              <caption className="sr-only">Detailed breakdown of platform assessment counts and submission rates</caption>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th scope="col" className="py-2 px-3 font-medium">Throughput Metric</th>
                  <th scope="col" className="py-2 px-3 font-medium text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {throughputData.map((row) => (
                  <tr key={row.metric} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">{row.metric}</td>
                    <td className="py-2 px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ width: '100%', height }} aria-label="Bar chart showing user composition">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">User Population</p>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={compositionData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white dark:bg-slate-800 text-xs p-2 rounded-lg shadow-lg border border-slate-700">
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-indigo-300 font-bold">{d.count} users</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {compositionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ width: '100%', height }} aria-label="Bar chart showing platform assessment throughput">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">System Volume</p>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={throughputData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="metric" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white dark:bg-slate-800 text-xs p-2 rounded-lg shadow-lg border border-slate-700">
                          <p className="font-semibold">{d.metric}</p>
                          <p className="text-emerald-300 font-bold">{d.value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI Token telemetry footer banner */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <span>AI Invocations: </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{aiTokenUsage.totalCalls || 0}</span>
        </div>
        <div>
          <span>Prompt Tokens: </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{(aiTokenUsage.totalPromptTokens || 0).toLocaleString()}</span>
        </div>
        <div>
          <span>Completion Tokens: </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{(aiTokenUsage.totalCompletionTokens || 0).toLocaleString()}</span>
        </div>
        <div>
          <span>Total Tokens: </span>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{(aiTokenUsage.totalTokens || 0).toLocaleString()}</span>
        </div>
        <div>
          <span>Avg Latency: </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{aiTokenUsage.averageLatencyMs || 0} ms</span>
        </div>
      </div>
    </div>
  );
};
