import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calculator,
  Target,
  BarChart3,
  Flame,
  Frown
} from 'lucide-react';
import type { SubjectCalculation } from '../types';

interface GpaInsightsProps {
  currentGpa: number;
  totalCredits: number;
  calculations: SubjectCalculation[];
  maxGradePoint?: number;
}

export const GpaInsights: React.FC<GpaInsightsProps> = ({
  currentGpa,
  totalCredits,
  calculations,
  maxGradePoint = 4.0
}) => {
  const [showTargetCalculator, setShowTargetCalculator] = useState(false);
  const [targetGpaInput, setTargetGpaInput] = useState<string>('3.50');
  const [futureCreditsInput, setFutureCreditsInput] = useState<string>('30');
  const [customCurrentGpa, setCustomCurrentGpa] = useState<string>(currentGpa.toFixed(2));
  const [customCompletedCredits, setCustomCompletedCredits] = useState<string>(totalCredits.toString());

  // Update defaults when props change
  React.useEffect(() => {
    setCustomCurrentGpa(currentGpa.toFixed(2));
    setCustomCompletedCredits(totalCredits.toString());
  }, [currentGpa, totalCredits]);

  // 1. Grade Distribution Analysis
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of calculations) {
      if (c.grade) {
        counts[c.grade] = (counts[c.grade] || 0) + 1;
      }
    }
    // Sort by grade point descending if possible
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [calculations]);

  // 2. Highest and Lowest Performing Modules
  const { highestModules, lowestModules } = useMemo(() => {
    const validCalcs = calculations.filter(c => c.grade_point !== undefined && !isNaN(c.grade_point));
    if (validCalcs.length === 0) return { highestModules: [], lowestModules: [] };

    const maxGp = Math.max(...validCalcs.map(c => c.grade_point));
    const minGp = Math.min(...validCalcs.map(c => c.grade_point));

    const highest = validCalcs.filter(c => c.grade_point === maxGp);
    const lowest = validCalcs.filter(c => c.grade_point === minGp);

    return { highestModules: highest, lowestModules: lowest };
  }, [calculations]);

  // 3. Target GPA Mathematical Calculation
  const targetResult = useMemo(() => {
    const cGpa = parseFloat(customCurrentGpa);
    const cCred = parseFloat(customCompletedCredits);
    const tGpa = parseFloat(targetGpaInput);
    const fCred = parseFloat(futureCreditsInput);

    if (isNaN(cGpa) || isNaN(cCred) || isNaN(tGpa) || isNaN(fCred)) {
      return { status: 'invalid', message: 'Please enter valid positive numbers for all fields.' };
    }

    if (fCred <= 0) {
      return { status: 'invalid', message: 'Future credits must be greater than 0.' };
    }

    if (tGpa < 0 || tGpa > maxGradePoint) {
      return {
        status: 'invalid',
        message: `Target GPA must be between 0.00 and ${maxGradePoint.toFixed(2)}.`
      };
    }

    // Required GPA formula:
    // (TargetGPA * (CompletedCredits + FutureCredits) - (CurrentGPA * CompletedCredits)) / FutureCredits
    const totalFutureCredits = cCred + fCred;
    const targetTotalPoints = tGpa * totalFutureCredits;
    const currentTotalPoints = cGpa * cCred;
    const requiredFuturePoints = targetTotalPoints - currentTotalPoints;
    const requiredFutureGpa = requiredFuturePoints / fCred;

    // Max possible achievable GPA if straight 4.0 in future credits:
    const maxAchievablePoints = currentTotalPoints + (maxGradePoint * fCred);
    const maxAchievableGpa = totalFutureCredits > 0 ? maxAchievablePoints / totalFutureCredits : 0;

    if (requiredFutureGpa > maxGradePoint) {
      return {
        status: 'impossible',
        requiredGpa: requiredFutureGpa,
        maxAchievableGpa,
        message: `Target is mathematically impossible. Even with straight ${maxGradePoint.toFixed(1)} grades in all future credits, the maximum achievable cumulative GPA is ${maxAchievableGpa.toFixed(2)}.`
      };
    }

    if (requiredFutureGpa <= 0) {
      return {
        status: 'already_achieved',
        requiredGpa: 0,
        message: `Target is already secured! Even with a 0.00 GPA in your next ${fCred} credits, your cumulative GPA will stay at or above ${tGpa.toFixed(2)}.`
      };
    }

    return {
      status: 'achievable',
      requiredGpa: requiredFutureGpa,
      message: `You need an average GPA of ${requiredFutureGpa.toFixed(2)} in your remaining ${fCred} credits to achieve a cumulative GPA of ${tGpa.toFixed(2)}.`
    };
  }, [customCurrentGpa, customCompletedCredits, targetGpaInput, futureCreditsInput, maxGradePoint]);

  if (calculations.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Academic GPA Insights</h3>
            <p className="text-xs text-slate-500">Performance summary, grade distribution & goals</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowTargetCalculator(!showTargetCalculator)}
          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
        >
          <Target className="w-4 h-4 text-indigo-600" />
          <span>{showTargetCalculator ? 'Hide Target Calculator' : 'Target GPA Calculator'}</span>
          {showTargetCalculator ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GPA */}
        <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">Overall GPA</span>
          <span className="text-2xl sm:text-3xl font-black text-indigo-900 font-mono">{currentGpa.toFixed(2)}</span>
          <span className="text-[10px] text-indigo-600/80 font-semibold block">Based on evaluated modules</span>
        </div>

        {/* Total Credits */}
        <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block">Total Credits</span>
          <span className="text-2xl sm:text-3xl font-black text-purple-900 font-mono">{totalCredits}</span>
          <span className="text-[10px] text-purple-600/80 font-semibold block">{calculations.length} modules evaluated</span>
        </div>

        {/* Highest Performing Module */}
        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-1">
          <div className="flex items-center space-x-1 text-emerald-700">
            <Flame className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Top Subject</span>
          </div>
          <div className="font-bold text-slate-900 text-xs line-clamp-1">
            {highestModules[0]?.subject_name || 'N/A'}
          </div>
          <span className="text-[10px] text-emerald-700 font-extrabold block">
            Grade: {highestModules[0]?.grade || '-'} ({highestModules[0]?.grade_point?.toFixed(1) || '-'} pts)
          </span>
        </div>

        {/* Lowest Performing Module */}
        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 space-y-1">
          <div className="flex items-center space-x-1 text-amber-700">
            <Frown className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Needs Focus</span>
          </div>
          <div className="font-bold text-slate-900 text-xs line-clamp-1">
            {lowestModules[0]?.subject_name || 'N/A'}
          </div>
          <span className="text-[10px] text-amber-700 font-extrabold block">
            Grade: {lowestModules[0]?.grade || '-'} ({lowestModules[0]?.grade_point?.toFixed(1) || '-'} pts)
          </span>
        </div>
      </div>

      {/* Grade Distribution Badges */}
      {gradeDistribution.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <span className="text-xs font-bold text-slate-700 block">Grade Distribution</span>
          <div className="flex flex-wrap gap-2">
            {gradeDistribution.map(([grade, count]) => {
              const isHigh = ['A+', 'A', 'A-'].includes(grade);
              const isMed = ['B+', 'B', 'B-'].includes(grade);
              return (
                <div
                  key={grade}
                  className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 text-xs font-bold shadow-xs ${
                    isHigh
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isMed
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="font-mono">{grade}:</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white text-slate-900 text-[11px] font-black shadow-2xs">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Target GPA Calculator Panel */}
      {showTargetCalculator && (
        <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-indigo-200 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-extrabold text-slate-900">Target GPA Calculator</h4>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-white px-2.5 py-0.5 rounded-full border border-indigo-100">
              Future Planning Tool
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label htmlFor="target-current-gpa" className="text-xs font-bold text-slate-700 block">Current GPA</label>
              <input
                id="target-current-gpa"
                type="number"
                step="0.01"
                min="0"
                max={maxGradePoint}
                value={customCurrentGpa}
                onChange={(e) => setCustomCurrentGpa(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="target-completed-credits" className="text-xs font-bold text-slate-700 block">Completed Credits</label>
              <input
                id="target-completed-credits"
                type="number"
                step="1"
                min="0"
                value={customCompletedCredits}
                onChange={(e) => setCustomCompletedCredits(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="target-desired-gpa" className="text-xs font-bold text-slate-700 block">Target GPA</label>
              <input
                id="target-desired-gpa"
                type="number"
                step="0.01"
                min="0"
                max={maxGradePoint}
                value={targetGpaInput}
                onChange={(e) => setTargetGpaInput(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="target-future-credits" className="text-xs font-bold text-slate-700 block">Future Credits</label>
              <input
                id="target-future-credits"
                type="number"
                step="1"
                min="1"
                value={futureCreditsInput}
                onChange={(e) => setFutureCreditsInput(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Result Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start space-x-3 transition-all ${
              targetResult.status === 'achievable'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : targetResult.status === 'already_achieved'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : targetResult.status === 'impossible'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {targetResult.status === 'achievable' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : targetResult.status === 'already_achieved' ? (
              <Award className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-extrabold text-xs sm:text-sm">
                {targetResult.status === 'achievable' && `Required Future GPA: ${targetResult.requiredGpa?.toFixed(2)}`}
                {targetResult.status === 'already_achieved' && 'Target Achieved!'}
                {targetResult.status === 'impossible' && 'Target Mathematically Impossible'}
                {targetResult.status === 'invalid' && 'Invalid Inputs'}
              </div>
              <p className="text-xs leading-relaxed font-medium opacity-90">{targetResult.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
