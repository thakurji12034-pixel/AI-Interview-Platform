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
import { Table, BarChart2, CheckCircle2 } from 'lucide-react';

const PROFICIENCY_VALUES = {
  beginner: 35,
  intermediate: 70,
  expert: 100,
};

const COLOR_MAP = {
  beginner: '#38bdf8', // sky-400
  intermediate: '#6366f1', // indigo-500
  expert: '#10b981', // emerald-500
};

export const SkillRadarChart = ({
  skills = [],
  title = 'Assessed Skills & Proficiencies',
  height = 240,
}) => {
  const [showTable, setShowTable] = useState(false);

  const formattedData = (skills || []).map((s) => ({
    name: s.skill,
    level: s.proficiencyLevel || 'intermediate',
    score: PROFICIENCY_VALUES[s.proficiencyLevel] || 60,
    verified: Boolean(s.verified),
    yearsExperience: s.yearsExperience || 0,
  }));

  if (!formattedData.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 py-8">
          No skills parsed or verified yet. Upload a resume or complete an assessment to populate skill proficiencies.
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
            Assessed technical domain proficiencies and verification status
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
            <caption className="sr-only">Detailed breakdown of skills, proficiency tiers, and verification</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-2 px-3 font-medium">Skill</th>
                <th scope="col" className="py-2 px-3 font-medium">Proficiency Tier</th>
                <th scope="col" className="py-2 px-3 font-medium">Experience</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {formattedData.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">{row.name}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400 capitalize">{row.level}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                    {row.yearsExperience > 0 ? `${row.yearsExperience} yrs` : 'N/A'}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {row.verified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Unverified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ width: '100%', height }} aria-label="Horizontal bar chart displaying skills and proficiency tiers">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white dark:bg-slate-800 text-xs p-2.5 rounded-lg shadow-lg border border-slate-700">
                        <p className="font-semibold flex items-center gap-1.5">
                          {d.name}
                          {d.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </p>
                        <p className="text-slate-300 text-[11px] capitalize">Tier: {d.level}</p>
                        {d.yearsExperience > 0 && (
                          <p className="text-slate-400 text-[11px]">Experience: {d.yearsExperience} yrs</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {formattedData.map((entry) => (
                  <Cell key={entry.name} fill={COLOR_MAP[entry.level] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
