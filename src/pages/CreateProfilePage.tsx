import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, Trash2, Lock, Building, CheckCircle, AlertCircle } from 'lucide-react';
import type { GradeOption, Semester, Subject } from '../types';
import { DEFAULT_GRADING_SCALE } from '../utils/gpa';
import { GradingScaleModal } from '../components/GradingScaleModal';
import { createProfile } from '../services/dbService';

interface CreateProfilePageProps {
  onProfileCreated: (profileId: string) => void;
  initialSubjects?: Subject[];
}

export const CreateProfilePage: React.FC<CreateProfilePageProps> = ({
  onProfileCreated,
  initialSubjects
}) => {
  const [step, setStep] = useState(1);

  // Form states - starting completely empty without default/example text
  const [profileName, setProfileName] = useState('');
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [degree, setDegree] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [description, setDescription] = useState('');
  const [visibility] = useState<'public' | 'shared' | 'private'>('public');
  const [passcode, setPasscode] = useState('');

  // Semesters & Subjects state - start empty without prefilled sample values
  const [semesters, setSemesters] = useState<Semester[]>([
    {
      semester_name: '',
      semester_order: 1,
      subjects: initialSubjects && initialSubjects.length > 0
        ? initialSubjects.map(s => ({ subject_name: s.subject_name || '', credit: s.credit || ('' as any) }))
        : [
            { subject_name: '', credit: '' as any },
            { subject_name: '', credit: '' as any },
          ]
    }
  ]);

  // Grading scale state
  const [gradingScale, setGradingScale] = useState<GradeOption[]>(DEFAULT_GRADING_SCALE);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);

  // Status & Created State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [copied, setCopied] = useState(false);

  // Handlers for Semesters
  const handleAddSemester = () => {
    const order = semesters.length + 1;
    setSemesters([
      ...semesters,
      {
        semester_name: '',
        semester_order: order,
        subjects: [
          { subject_name: '', credit: '' as any },
          { subject_name: '', credit: '' as any },
        ]
      }
    ]);
  };

  const handleRemoveSemester = (semIdx: number) => {
    setSemesters(semesters.filter((_, idx) => idx !== semIdx));
  };

  const handleUpdateSemesterName = (semIdx: number, val: string) => {
    const updated = [...semesters];
    updated[semIdx].semester_name = val;
    setSemesters(updated);
  };

  // Handlers for Subjects
  const handleAddSubject = (semIdx: number) => {
    const updated = [...semesters];
    updated[semIdx].subjects.push({
      subject_name: '',
      credit: '' as any
    });
    setSemesters(updated);
  };

  const handleRemoveSubject = (semIdx: number, subIdx: number) => {
    const updated = [...semesters];
    updated[semIdx].subjects = updated[semIdx].subjects.filter((_, idx) => idx !== subIdx);
    setSemesters(updated);
  };

  const handleUpdateSubject = (semIdx: number, subIdx: number, field: keyof Subject, val: any) => {
    const updated = [...semesters];
    updated[semIdx].subjects[subIdx] = {
      ...updated[semIdx].subjects[subIdx],
      [field]: val
    };
    setSemesters(updated);
  };

  // Submit Handler
  const handleSubmitProfile = async () => {
    setError('');

    if (!profileName.trim() || !university.trim() || !faculty.trim() || !degree.trim()) {
      setError('Please fill out Profile Name, University, Faculty, and Degree.');
      return;
    }

    // Filter valid semesters and subjects
    const cleanedSemesters = semesters.map((sem, idx) => ({
      ...sem,
      semester_name: sem.semester_name.trim() || `Semester ${idx + 1}`,
      subjects: sem.subjects.filter(sub => sub.subject_name.trim() && Number(sub.credit) > 0)
    })).filter(sem => sem.subjects.length > 0);

    if (cleanedSemesters.length === 0) {
      setError('Please add at least one subject with valid name and credit count (> 0).');
      return;
    }

    setSubmitting(true);

    try {
      const result = await createProfile({
        profile_name: profileName.trim(),
        university: university.trim(),
        faculty: faculty.trim(),
        degree: degree.trim(),
        academic_year: academicYear.trim(),
        description: description.trim(),
        visibility,
        passcode,
        semesters: cleanedSemesters,
        gradingScale
      });

      setCreatedId(result.id);
      setStep(5); // Confirmation screen
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl = createdId ? `${window.location.origin}/#profile-${createdId}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in">
      {/* Wizard Header Progress */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create Academic GPA Profile</h1>
            <p className="text-xs text-slate-500">
              Set up predefined subjects & fixed credits once so other students can calculate their GPA easily.
            </p>
          </div>
          {step <= 4 && (
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              Step {step} of 4
            </span>
          )}
        </div>

        {/* Progress Bar Steps */}
        {step <= 4 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: 'Basic Info' },
              { num: 2, label: 'Subjects & Credits' },
              { num: 3, label: 'Grading Scale' },
              { num: 4, label: 'Review & Security' },
            ].map((s) => (
              <div key={s.num} className="space-y-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    step >= s.num ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                />
                <span
                  className={`text-[11px] font-semibold block text-center ${
                    step === s.num ? 'text-indigo-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
            <Building className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Step 1: Academic Profile Information</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Profile Name *
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter profile name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                University *
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="Enter university name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Faculty *
              </label>
              <input
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                placeholder="Enter faculty name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Degree / Programme *
              </label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="Enter degree or programme"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Academic Year (Optional)
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2024/2025"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Description / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter optional description"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              onClick={() => {
                if (!profileName.trim() || !university.trim() || !faculty.trim() || !degree.trim()) {
                  alert('Please fill out Profile Name, University, Faculty, and Degree.');
                  return;
                }
                setStep(2);
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-md"
            >
              <span>Next: Add Subjects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Semesters & Fixed Credits */}
      {step === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 2: Semesters & Fixed Credits</h2>
              <p className="text-xs text-slate-500">
                Credits entered here are permanently stored. Students will NOT re-enter credits.
              </p>
            </div>
            <button
              onClick={handleAddSemester}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Semester</span>
            </button>
          </div>

          {/* Semesters list */}
          <div className="space-y-8">
            {semesters.map((sem, semIdx) => (
              <div key={semIdx} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={sem.semester_name}
                    onChange={(e) => handleUpdateSemesterName(semIdx, e.target.value)}
                    placeholder={`Enter semester name (e.g. Semester ${semIdx + 1})`}
                    className="font-bold text-slate-900 text-base bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 w-full max-w-sm"
                  />
                  {semesters.length > 1 && (
                    <button
                      onClick={() => handleRemoveSemester(semIdx)}
                      className="text-xs font-semibold text-red-600 hover:underline flex items-center space-x-1 shrink-0 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Semester</span>
                    </button>
                  )}
                </div>

                {/* Subjects Table */}
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    <span className="col-span-7">Subject Name</span>
                    <span className="col-span-4 text-center">Fixed Credit</span>
                    <span className="col-span-1 text-center">Action</span>
                  </div>

                  {sem.subjects.map((sub, subIdx) => (
                    <div key={subIdx} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200">
                      <div className="col-span-7">
                        <input
                          type="text"
                          value={sub.subject_name}
                          onChange={(e) => handleUpdateSubject(semIdx, subIdx, 'subject_name', e.target.value)}
                          placeholder="Enter subject name"
                          className="w-full px-3 py-1.5 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          max="20"
                          value={sub.credit || ''}
                          onChange={(e) => handleUpdateSubject(semIdx, subIdx, 'credit', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          placeholder="Enter credit"
                          className="w-full px-3 py-1.5 text-sm font-bold text-slate-900 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 font-normal"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          onClick={() => handleRemoveSubject(semIdx, subIdx)}
                          disabled={sem.subjects.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleAddSubject(semIdx)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-indigo-600 text-xs font-bold rounded-lg border border-slate-200 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-md"
            >
              <span>Next: Grading Scale</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Grading Scale */}
      {step === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 3: Grading Scale Configuration</h2>
              <p className="text-xs text-slate-500">Configure grade points (Standard 4.0 or custom points).</p>
            </div>
            <button
              onClick={() => setIsScaleModalOpen(true)}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200"
            >
              Edit Grade Points
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {gradingScale.map((item) => (
              <div key={item.grade} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">{item.grade}</span>
                <span className="font-mono text-xs font-bold text-indigo-600">{item.grade_point.toFixed(1)}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setStep(4)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-md"
            >
              <span>Next: Review & Save</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Owner Security */}
      {step === 4 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Step 4: Review Profile & Owner Security</h2>
            <p className="text-xs text-slate-500">Review all details before publishing your shared profile.</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Profile Overview Card */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">{profileName || 'Untitled Academic Profile'}</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg capitalize">
                {visibility} Profile
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {university || 'University not specified'} • {faculty || 'Faculty not specified'} • {degree || 'Degree not specified'}
            </p>
            <div className="pt-2 text-xs text-slate-500 flex items-center space-x-4">
              <span>{semesters.length} Semesters</span>
              <span>{semesters.reduce((acc, sem) => acc + sem.subjects.filter(s => s.subject_name.trim()).length, 0)} Total Subjects</span>
              <span>{semesters.reduce((acc, sem) => acc + sem.subjects.reduce((sAcc, s) => sAcc + Number(s.credit || 0), 0), 0)} Total Fixed Credits</span>
            </div>
          </div>

          {/* Security & Owner Passcode */}
          <div className="p-5 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-sm">Set Owner Edit Passcode (Optional)</h3>
            </div>
            <p className="text-xs text-slate-400">
              Set a passcode if you want to edit, manage, or delete this profile later. Viewers do NOT need this passcode to calculate their GPA.
            </p>
            <input
              type="password"
              placeholder="Enter owner passcode (optional)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              disabled={submitting}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleSubmitProfile}
              disabled={submitting}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-base rounded-2xl shadow-lg flex items-center space-x-2"
            >
              {submitting ? (
                <span>Creating Profile...</span>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Create Shared Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Created Confirmation Screen */}
      {step === 5 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900">Profile Successfully Created!</h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto">
              Your academic profile is published and ready for your batchmates to use.
            </p>
          </div>

          {/* Profile ID Card */}
          <div className="max-w-md mx-auto p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Public Profile ID</span>
            <div className="text-4xl font-black text-indigo-600 font-mono tracking-wider select-all">
              {createdId}
            </div>

            <div className="pt-3 space-y-2">
              <span className="text-xs font-semibold text-slate-600 block">Share Link:</span>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shrink-0 ${
                    copied ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onProfileCreated(createdId)}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md flex items-center space-x-2"
            >
              <span>Open & Test Profile</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal for editing grade scale */}
      <GradingScaleModal
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
        scale={gradingScale}
        onSaveScale={setGradingScale}
        editable={true}
      />
    </div>
  );
};
