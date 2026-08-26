import React from 'react';
import type { SemesterResult } from '../types';

interface GpaProgressChartProps {
  semesterResults: SemesterResult[];
}

export const GpaProgressChart: React.FC<GpaProgressChartProps> = ({ semesterResults }) => {
  if (!semesterResults || semesterResults.length === 0) return null;

  const maxGpa = 4.0;
  const height = 180;
  const width = 500;
  const paddingX = 40;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = semesterResults.map((sem, idx) => {
    const x = semesterResults.length > 1
      ? paddingX + (idx / (semesterResults.length - 1)) * chartWidth
      : paddingX + chartWidth / 2;
    const gpa = Math.min(Math.max(sem.gpa, 0), maxGpa);
    const y = height - paddingY - (gpa / maxGpa) * chartHeight;
    return { x, y, gpa: sem.gpa, name: sem.semester_name || `Sem ${idx + 1}` };
  });

  const pathD = points.length > 1
    ? points.reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')
    : '';

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">GPA History & Progress</h3>
          <p className="text-xs text-slate-500">Semester-by-semester academic performance chart</p>
        </div>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
          Max: 4.00
        </span>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[320px] max-h-[200px]">
          {/* Background Grid lines */}
          {[1.0, 2.0, 3.0, 4.0].map((gridGpa) => {
            const gridY = height - paddingY - (gridGpa / maxGpa) * chartHeight;
            return (
              <g key={gridGpa}>
                <line
                  x1={paddingX}
                  y1={gridY}
                  x2={width - paddingX}
                  y2={gridY}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={gridY + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {gridGpa.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Line connecting points */}
          {points.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="#6366F1"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points with Tooltip Labels */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="6"
                className="fill-white stroke-indigo-600 stroke-[3] group-hover:r-8 transition-all"
              />
              {/* GPA Text above dot */}
              <text
                x={pt.x}
                y={pt.y - 12}
                textAnchor="middle"
                className="fill-indigo-700 font-bold text-[11px] font-mono"
              >
                {pt.gpa.toFixed(2)}
              </text>
              {/* Semester Name below chart */}
              <text
                x={pt.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-600 font-semibold text-[10px]"
              >
                {pt.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* GPA History List Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
        {semesterResults.map((sem, idx) => (
          <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 truncate mr-2">{sem.semester_name}</span>
            <span className="font-mono font-bold text-indigo-600 shrink-0">{sem.gpa.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
