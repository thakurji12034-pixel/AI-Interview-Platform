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

const BUCKET_COLORS = [
  '#ef4444', // <50 (rose-500)
  '#f59e0b', // 50-69 (amber-500)
  '#3b82f6', // 70-84 (blue-500)
  '#10b981', // 85-100 (emerald-500)
];

export const ScoreDistributionChart = ({
  distribution = { below50: 0, range50To69: 0, range70To84: 0, range85To100: 0 },
  title = 'Candidate Score Distribution',
  height = 240,
}) => {
  const [showTable, setShowTable] = useState(false);

  const formattedData = [
    { range: '< 50', label: 'Needs Improvement (<50)', count: distribution.below50 || 0, color: BUCKET_COLORS[0] },
    { range: '50 - 69', label: 'Competent (50-69)', count: distribution.range50To69 || 0, color: BUCKET_COLORS[1] },
    { range: '70 - 84', label: 'Strong (70-84)', count: distribution.range70To84 || 0, color: BUCKET_COLORS[2] },
    { range: '85 - 100', label: 'Exemplary (85-100)', count: distribution.range85To100 || 0, color: BUCKET_COLORS[3] },
  ];

  const totalEvaluated = formattedData.reduce((acc, cur) => acc + cur.count, 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Performance histogram across {totalEvaluated} conducted candidate assessment{totalEvaluated === 1 ? '' : 's'}
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
            <caption className="sr-only">Detailed breakdown of candidate scores across performance brackets</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-2 px-3 font-medium">Score Range</th>
                <th scope="col" className="py-2 px-3 font-medium">Rating Level</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Candidates</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {formattedData.map((row) => (
                <tr key={row.range} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">{row.range}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.label}</td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">{row.count}</td>
                  <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400">
                    {totalEvaluated > 0 ? Math.round((row.count / totalEvaluated) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : totalEvaluated === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
          No candidates evaluated yet in this date range.
        </p>
      ) : (
        <div style={{ width: '100%', height }} aria-label="Bar chart displaying candidate score distribution across performance tiers">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white dark:bg-slate-800 text-xs p-2.5 rounded-lg shadow-lg border border-slate-700">
                        <p className="font-semibold">{d.label}</p>
                        <p className="text-indigo-300 font-bold mt-1">
                          {d.count} candidate{d.count === 1 ? '' : 's'} (
                          {totalEvaluated > 0 ? Math.round((d.count / totalEvaluated) * 100) : 0}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {formattedData.map((entry) => (
                  <Cell key={entry.range} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
