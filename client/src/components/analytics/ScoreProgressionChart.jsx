import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Table, BarChart2 } from 'lucide-react';

export const ScoreProgressionChart = ({
  data = [],
  title = 'Score Progression Over Time',
  height = 240,
}) => {
  const [showTable, setShowTable] = useState(false);

  const formattedData = (data || []).map((item, idx) => ({
    index: idx + 1,
    name: item.date ? new Date(item.date).toLocaleDateString() : `Session ${idx + 1}`,
    score: item.score ?? 0,
    sessionTitle: item.title || `Interview ${idx + 1}`,
  }));

  if (!formattedData.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 py-8">
          No completed interview scores recorded yet. Complete an interview session to view progression trends.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Historical performance across completed interview assessments
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">Detailed table of candidate score progression over time</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-2 px-3 font-medium">Session #</th>
                <th scope="col" className="py-2 px-3 font-medium">Date</th>
                <th scope="col" className="py-2 px-3 font-medium">Title</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Score (/100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {formattedData.map((row) => (
                <tr key={row.index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">#{row.index}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.name}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.sessionTitle}</td>
                  <td className="py-2 px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                    {row.score}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ width: '100%', height }} aria-label="Area chart displaying score progression">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreProgressionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white dark:bg-slate-800 text-xs p-2.5 rounded-lg shadow-lg border border-slate-700">
                        <p className="font-semibold">{d.sessionTitle}</p>
                        <p className="text-slate-400 text-[11px]">{d.name}</p>
                        <p className="text-indigo-300 font-bold mt-1">Score: {d.score}/100</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scoreProgressionGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
