import React, { useEffect, useState, useMemo } from 'react';
import { Share2, Download, RotateCcw, Building, Calendar, Lock, AlertCircle, FileText, Award } from 'lucide-react';
import type { Profile, Semester } from '../types';
import { calculateProfileCGPA } from '../utils/gpa';
import { generateAcademicPDF, getAcademicHonors } from '../utils/pdfGenerator';
import { ShareModal } from '../components/ShareModal';
import { fetchProfileById } from '../services/dbService';
import { GpaProgressChart } from '../components/GpaProgressChart';

interface ProfileViewerPageProps {
  profileId: string;
  onNavigateToManage?: (profileId: string) => void;
}

export const ProfileViewerPage: React.FC<ProfileViewerPageProps> = ({
  profileId,
  onNavigateToManage
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedGrades, setSelectedGrades] = useState<{ [key: string]: string }>({});
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchProfileById(profileId)
      .then((data: Profile) => {
        setProfile(data);
        const saved = localStorage.getItem(`gpa_viewer_grades_${profileId}`);
        if (saved) {
          try {
            setSelectedGrades(JSON.parse(saved));
          } catch {}
        }
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profileId]);

  const handleGradeChange = (semIdx: number, subIdx: number, gradeVal: string) => {
    const key = `${semIdx}_${subIdx}`;
    const updated = { ...selectedGrades, [key]: gradeVal };
    setSelectedGrades(updated);
    localStorage.setItem(`gpa_viewer_grades_${profileId}`, JSON.stringify(updated));
  };

  const handleResetGrades = () => {
    setSelectedGrades({});
    localStorage.removeItem(`gpa_viewer_grades_${profileId}`);
  };

  const activeSemestersWithGrades: Semester[] = useMemo(() => {
    if (!profile || !profile.semesters) return [];

    return profile.semesters.map((sem, semIdx) => ({
      ...sem,
      subjects: (sem.subjects || []).map((sub, subIdx) => {
        const key = `${semIdx}_${subIdx}`;
        return {
          ...sub,
          selectedGrade: selectedGrades[key] || ''
        };
      })
    }));
  }, [profile, selectedGrades]);

  const cgpaResult = useMemo(() => {
    if (!profile) return null;
    return calculateProfileCGPA(activeSemestersWithGrades, profile.gradingScale);
  }, [activeSemestersWithGrades, profile]);

  const handleDownloadPDF = () => {
    if (!cgpaResult || !profile) return;
    generateAcademicPDF({
      title: 'ACADEMIC RESULTS REPORT',
      studentName: studentName.trim() || undefined,
      studentId: studentId.trim() || undefined,
      profile: {
        profile_name: profile.profile_name,
        university: profile.university,
        faculty: profile.faculty,
        department: profile.department,
        academic_year: profile.academic_year
      },
      cgpaResult
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Loading profile data...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-200 flex items-center justify-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error || 'Profile not found.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Profile Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-mono font-bold">
                Profile ID: {profile.id}
              </span>
              {profile.academic_year && (
                <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{profile.academic_year}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">{profile.profile_name}</h1>

            <div className="text-xs sm:text-sm text-slate-300 space-y-1 font-medium">
              <p className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{profile.university}</span>
              </p>
              <p className="text-slate-400 pl-6">
                {profile.faculty}
                {profile.department ? ` • ${profile.department}` : ''}
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex flex-wrap items-center gap-2 relative z-10">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Link</span>
            </button>

            {onNavigateToManage && (
              <button
                onClick={() => onNavigateToManage(profile.id)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Manage Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Main Subject Results Input Table - 7 cols */}
        <div className="lg:col-span-7 space-y-8">
          {profile.semesters.map((sem, semIdx) => (
            <div key={sem.id || semIdx} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-900">{sem.semester_name}</h2>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {sem.subjects.length} Subjects • {sem.subjects.reduce((acc, s) => acc + Number(s.credit), 0)} Credits
                </span>
              </div>

              {/* Subject grade selector table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Subject</th>
                      <th className="py-3 px-3 text-center">Credit</th>
                      <th className="py-3 px-3 text-right">Your Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sem.subjects.map((sub, subIdx) => {
                      const currentGrade = selectedGrades[`${semIdx}_${subIdx}`] || '';
                      return (
                        <tr key={sub.id || subIdx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-slate-900 block">{sub.subject_name}</span>
                            {sub.subject_code && (
                              <span className="text-[10px] text-slate-400 font-mono">{sub.subject_code}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2.5 py-1 bg-slate-100 font-bold text-slate-700 rounded-lg">
                              {sub.credit} Cr
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <select
                              value={currentGrade}
                              onChange={(e) => handleGradeChange(semIdx, subIdx, e.target.value)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer focus:outline-none ${
                                currentGrade
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                                  : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400'
                              }`}
                            >
                              <option value="">-- Select Grade --</option>
                              {profile.gradingScale.map((gs) => (
                                <option key={gs.grade} value={gs.grade}>
                                  {gs.grade} ({gs.grade_point.toFixed(1)})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <button
              onClick={handleResetGrades}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Selected Grades</span>
            </button>
          </div>
        </div>

        {/* Live GPA & CGPA Calculation Summary Box - 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Summary Box */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Academic GPA Summary</span>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                Real-Time Calculation
              </span>
            </div>

            {cgpaResult && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Cumulative CGPA</span>
                  <div className="text-5xl font-black text-white tracking-tight mt-0.5">
                    {cgpaResult.overall_cgpa.toFixed(2)}
                  </div>
                  <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold">
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{getAcademicHonors(cgpaResult.overall_cgpa)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Subjects</span>
                    <span className="text-base font-bold text-white">{cgpaResult.total_subjects}</span>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Credits</span>
                    <span className="text-base font-bold text-white">{cgpaResult.overall_credits}</span>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Grade Points</span>
                    <span className="text-base font-bold text-white">{cgpaResult.overall_grade_points.toFixed(1)}</span>
                  </div>
                </div>

                {/* Per semester GPA breakdown */}
                {cgpaResult.semesterResults.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Semester GPAs
                    </span>
                    {cgpaResult.semesterResults.map((sr, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-300 font-medium">{sr.semester_name}</span>
                        <span className="font-bold text-indigo-400 font-mono">
                          GPA: {sr.gpa.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GPA History Progress Chart for Multi-Semester profiles */}
          {cgpaResult && cgpaResult.semesterResults.length > 0 && (
            <GpaProgressChart semesterResults={cgpaResult.semesterResults} />
          )}

          {/* PDF Personalization & Export Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Generate Official PDF Report</span>
            </h3>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Student Full Name (Optional)"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <input
                type="text"
                placeholder="Student ID / Index No. (Optional)"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />

              <button
                onClick={handleDownloadPDF}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Generate Academic PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        profileId={profile.id}
        profileName={profile.profile_name}
      />
    </div>
  );
};
