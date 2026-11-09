import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Table, BarChart2 } from 'lucide-react';

export const RubricAveragesChart = ({
  rubricAverages = {},
  title = 'Evaluation Rubric Dimension Averages',
  height = 240,
}) => {
  const [showTable, setShowTable] = useState(false);

  const formattedData = [
    { key: 'technicalCorrectness', label: 'Technical Correctness', score: rubricAverages?.technicalCorrectness || 0 },
    { key: 'problemSolving', label: 'Problem Solving', score: rubricAverages?.problemSolving || 0 },
    { key: 'explanationQuality', label: 'Explanation Quality', score: rubricAverages?.explanationQuality || 0 },
    { key: 'relevance', label: 'Relevance', score: rubricAverages?.relevance || 0 },
    { key: 'communicationClarity', label: 'Communication Clarity', score: rubricAverages?.communicationClarity || 0 },
  ];

  const evaluationsCount = rubricAverages?.evaluationsCount || 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Average ratings across {evaluationsCount} submitted evaluation{evaluationsCount === 1 ? '' : 's'}
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
            <caption className="sr-only">Detailed breakdown of evaluation rubric dimension averages</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-2 px-3 font-medium">Dimension</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Average Score (/100)</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {formattedData.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">{row.label}</td>
                  <td className="py-2 px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                    {row.score}%
                  </td>
                  <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400">
                    {row.key === 'technicalCorrectness'
                      ? '35%'
                      : row.key === 'problemSolving'
                      ? '25%'
                      : row.key === 'explanationQuality'
                      ? '20%'
                      : '10%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : evaluationsCount === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
          No candidate evaluations recorded yet to calculate rubric averages.
        </p>
      ) : (
        <div style={{ width: '100%', height }} aria-label="Bar chart displaying rubric dimension performance averages">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white dark:bg-slate-800 text-xs p-2.5 rounded-lg shadow-lg border border-slate-700">
                        <p className="font-semibold">{d.label}</p>
                        <p className="text-indigo-300 font-bold mt-1">Average: {d.score}/100</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
