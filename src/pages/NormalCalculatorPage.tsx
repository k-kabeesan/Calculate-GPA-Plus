import React, { useState, useMemo } from 'react';
import { Plus, Trash2, RotateCcw, Download, Settings, Save, Calculator as CalcIcon } from 'lucide-react';
import type { Subject, GradeOption } from '../types';
import { DEFAULT_GRADING_SCALE, calculateSemesterGPA } from '../utils/gpa';
import { GradingScaleModal } from '../components/GradingScaleModal';
import { generateAcademicPDF } from '../utils/pdfGenerator';
import { GpaInsights } from '../components/GpaInsights';

interface NormalCalculatorPageProps {
  onConvertToProfile?: (subjects: Subject[], scale: GradeOption[]) => void;
}

const INITIAL_SUBJECTS: Subject[] = [
  { id: '1', subject_name: 'Chemistry', credit: 2, selectedGrade: 'A' },
  { id: '2', subject_name: 'Physics', credit: 3, selectedGrade: 'B+' },
  { id: '3', subject_name: 'Programming', credit: 3, selectedGrade: 'A-' },
];

export const NormalCalculatorPage: React.FC<NormalCalculatorPageProps> = ({ onConvertToProfile }) => {
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [scale, setScale] = useState<GradeOption[]>(DEFAULT_GRADING_SCALE);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);

  // Student details for PDF export
  const [studentName, setStudentName] = useState('');
  const [universityName, setUniversityName] = useState('');

  // Real-time calculation
  const result = useMemo(() => {
    return calculateSemesterGPA(subjects, scale);
  }, [subjects, scale]);

  const handleAddSubject = () => {
    const newSub: Subject = {
      id: Date.now().toString(),
      subject_name: `Subject ${subjects.length + 1}`,
      credit: 3,
      selectedGrade: 'A'
    };
    setSubjects([...subjects, newSub]);
  };

  const handleRemoveSubject = (id: string | number) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const handleUpdateSubject = (id: string | number, field: keyof Subject, value: any) => {
    setSubjects(subjects.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleReset = () => {
    setSubjects(INITIAL_SUBJECTS);
    setScale(DEFAULT_GRADING_SCALE);
    setStudentName('');
    setUniversityName('');
  };

  const handleDownloadPDF = () => {
    generateAcademicPDF({
      title: 'NORMAL GPA CALCULATION REPORT',
      studentName: studentName.trim() || undefined,
      profile: {
        profile_name: 'Personal GPA Calculation',
        university: universityName.trim() || 'General University',
        academic_year: new Date().getFullYear().toString()
      },
      cgpaResult: {
        semesterResults: [result],
        overall_credits: result.total_credits,
        overall_grade_points: result.total_grade_points,
        overall_cgpa: result.gpa,
        total_subjects: result.subjects_count
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CalcIcon className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Normal GPA Calculator</h1>
          </div>
          <p className="text-xs text-slate-500">
            Calculate your GPA instantly. Enter your subjects, credits, and grades. No account needed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsScaleModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-slate-200"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Customize Grade Scale</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-slate-200"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Main Inputs Table - 7 cols */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Subjects & Grades</h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {subjects.length} Subjects Added
            </span>
          </div>

          {/* Subjects Table */}
          <div className="space-y-3">
            {subjects.map((sub, index) => (
              <div
                key={sub.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-3 hover:border-indigo-200 transition-colors"
              >
                {/* Subject Name */}
                <div className="w-full sm:w-1/2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Subject Name #{index + 1}
                  </label>
                  <input
                    type="text"
                    value={sub.subject_name}
                    onChange={(e) => handleUpdateSubject(sub.id!, 'subject_name', e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Credit */}
                <div className="w-1/2 sm:w-1/4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Credit
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    max="30"
                    value={sub.credit !== undefined && sub.credit !== null ? sub.credit : ''}
                    onChange={(e) => handleUpdateSubject(sub.id!, 'credit', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Grade Dropdown */}
                <div className="w-1/2 sm:w-1/4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Grade
                  </label>
                  <select
                    value={sub.selectedGrade || 'A'}
                    onChange={(e) => handleUpdateSubject(sub.id!, 'selectedGrade', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {scale.map((g) => (
                      <option key={g.grade} value={g.grade}>
                        {g.grade} ({g.grade_point.toFixed(1)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remove button */}
                <div className="sm:pt-5">
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(sub.id!)}
                    disabled={subjects.length <= 1}
                    aria-label={`Delete ${sub.subject_name || 'subject'}`}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Remove subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleAddSubject}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center space-x-2 border border-indigo-100 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Subject</span>
            </button>

            {onConvertToProfile && (
              <button
                onClick={() => onConvertToProfile(subjects, scale)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all"
              >
                <Save className="w-4 h-4 text-purple-400" />
                <span>Save as Shared Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Calculation Results Card - 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main GPA Highlight Box */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <CalcIcon className="w-32 h-32" />
            </div>

            <div>
              <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Calculated Semester GPA</span>
              <div className="text-5xl font-black tracking-tight text-white mt-1">
                {result.gpa.toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Formula: Σ(Credit × Grade Point) / Σ(Credit)</p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-center">
              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Subjects</span>
                <span className="text-lg font-bold text-white">{result.subjects_count}</span>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Credits</span>
                <span className="text-lg font-bold text-white">{result.total_credits}</span>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Grade Points</span>
                <span className="text-lg font-bold text-white">{result.total_grade_points.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Detailed Calculation Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>Calculation Breakdown</span>
              <span className="text-xs text-slate-500 font-normal">Credit × Grade Point</span>
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              {result.calculations.map((c, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between font-medium">
                  <div>
                    <span className="text-slate-800 font-semibold block">{c.subject_name}</span>
                    <span className="text-[11px] text-slate-400">{c.credit} Cr × {c.grade_point.toFixed(1)} ({c.grade})</span>
                  </div>
                  <span className="font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    = {c.total_points.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>

            {/* Optional Student Info for PDF Export */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Personalize PDF Report (Optional)</label>
              <input
                type="text"
                placeholder="Student Full Name (e.g. John Doe)"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="University / Faculty (Optional)"
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                onClick={handleDownloadPDF}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Generate & Download PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GPA Insights & Target GPA Calculator */}
      {result.calculations.length > 0 && (
        <GpaInsights
          currentGpa={result.gpa}
          totalCredits={result.total_credits}
          calculations={result.calculations}
        />
      )}

      {/* Modal for editing grade scale */}
      <GradingScaleModal
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
        scale={scale}
        onSaveScale={setScale}
        editable={true}
      />
    </div>
  );
};
