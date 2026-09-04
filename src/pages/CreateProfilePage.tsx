import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Lock,
  Building,
  CheckCircle,
  AlertCircle,
  Save,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import type { GradeOption, Subject } from '../types';
import { DEFAULT_GRADING_SCALE } from '../utils/gpa';
import { GradingScaleModal } from '../components/GradingScaleModal';
import { createProfile } from '../services/dbService';

interface FormSubject {
  id?: string | number;
  subject_code?: string;
  subject_name: string;
  credit: number | string;
  selectedGrade?: string;
}

interface FormSemester {
  id?: string | number;
  semester_name: string;
  semester_order: number;
  subjects: FormSubject[];
}

interface CreateProfilePageProps {
  onProfileCreated: (profileId: string) => void;
  initialSubjects?: Subject[];
}

export const CreateProfilePage: React.FC<CreateProfilePageProps> = ({
  onProfileCreated,
  initialSubjects
}) => {
  const [step, setStep] = useState(1);

  // Form states - starting empty without default/example text
  const [profileName, setProfileName] = useState('');
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [description, setDescription] = useState('');
  const [visibility] = useState<'public' | 'shared' | 'private'>('public');
  const [passcode, setPasscode] = useState('');

  // Inline Validation States
  const [profileNameError, setProfileNameError] = useState('');
  const [subjectErrors, setSubjectErrors] = useState<{ [key: string]: string }>({});

  // Duplicate Module Codes Confirmation per semester (key: semIdx, val: boolean)
  const [confirmedDuplicates, setConfirmedDuplicates] = useState<{ [semIdx: number]: boolean }>({});

  // Draft Management State
  const [draftStatus, setDraftStatus] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Semesters & Subjects state - start empty without prefilled sample values
  const [semesters, setSemesters] = useState<FormSemester[]>([
    {
      semester_name: '',
      semester_order: 1,
      subjects: initialSubjects && initialSubjects.length > 0
        ? initialSubjects.map(s => ({
            subject_code: s.subject_code || '',
            subject_name: s.subject_name || '',
            credit: s.credit !== undefined && s.credit !== null ? s.credit : ''
          }))
        : [
            { subject_code: '', subject_name: '', credit: '' },
            { subject_code: '', subject_name: '', credit: '' },
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

  // Check if a saved draft exists on mount
  useEffect(() => {
    const saved = localStorage.getItem('gpa_profile_draft');
    if (saved) {
      setShowDraftBanner(true);
    }
  }, []);

  // Handlers for Draft
  const handleSaveDraft = () => {
    const draftData = {
      profileName,
      university,
      faculty,
      department,
      academicYear,
      description,
      semesters,
      gradingScale,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('gpa_profile_draft', JSON.stringify(draftData));
    setDraftStatus('Draft saved locally!');
    setShowDraftBanner(false);
    setTimeout(() => setDraftStatus(''), 3000);
  };

  const handleRestoreDraft = () => {
    const saved = localStorage.getItem('gpa_profile_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.profileName !== undefined) setProfileName(draft.profileName);
        if (draft.university !== undefined) setUniversity(draft.university);
        if (draft.faculty !== undefined) setFaculty(draft.faculty);
        if (draft.department !== undefined) setDepartment(draft.department);
        if (draft.academicYear !== undefined) setAcademicYear(draft.academicYear);
        if (draft.description !== undefined) setDescription(draft.description);
        if (draft.semesters && Array.isArray(draft.semesters)) setSemesters(draft.semesters);
        if (draft.gradingScale && Array.isArray(draft.gradingScale)) setGradingScale(draft.gradingScale);
        setShowDraftBanner(false);
        setDraftStatus('Draft restored successfully!');
        setTimeout(() => setDraftStatus(''), 3000);
      } catch {
        setDraftStatus('Failed to restore draft.');
      }
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('gpa_profile_draft');
    setShowDraftBanner(false);
    setDraftStatus('Draft cleared.');
    setTimeout(() => setDraftStatus(''), 3000);
  };

  // Handlers for Semesters
  const handleAddSemester = () => {
    const order = semesters.length + 1;
    setSemesters([
      ...semesters,
      {
        semester_name: '',
        semester_order: order,
        subjects: [
          { subject_code: '', subject_name: '', credit: '' },
          { subject_code: '', subject_name: '', credit: '' },
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
      subject_code: '',
      subject_name: '',
      credit: ''
    });
    setSemesters(updated);
  };

  const handleRemoveSubject = (semIdx: number, subIdx: number) => {
    const updated = [...semesters];
    updated[semIdx].subjects = updated[semIdx].subjects.filter((_, idx) => idx !== subIdx);
    setSemesters(updated);
  };

  const handleUpdateSubject = (semIdx: number, subIdx: number, field: keyof FormSubject, val: any) => {
    const updated = [...semesters];
    updated[semIdx].subjects[subIdx] = {
      ...updated[semIdx].subjects[subIdx],
      [field]: val
    };
    setSemesters(updated);

    // Clear error for this field if valid
    const key = `${semIdx}_${subIdx}_${field}`;
    if (subjectErrors[key]) {
      const newErrors = { ...subjectErrors };
      delete newErrors[key];
      setSubjectErrors(newErrors);
    }
  };

  // Validation function for Step 1
  const handleStep1Next = () => {
    if (!profileName.trim()) {
      setProfileNameError('Profile name is required.');
      return;
    }
    setProfileNameError('');
    setStep(2);
  };

  // Check for duplicate module codes in a semester
  const getSemesterDuplicates = (semIdx: number): string[] => {
    const sem = semesters[semIdx];
    if (!sem || !sem.subjects) return [];

    const codeCounts: { [code: string]: number } = {};
    for (const sub of sem.subjects) {
      const code = (sub.subject_code || '').trim().toUpperCase();
      if (code) {
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      }
    }

    return Object.entries(codeCounts)
      .filter(([_, count]) => count > 1)
      .map(([code]) => code);
  };

  // Validation function for Step 2
  const handleStep2Next = () => {
    const newErrors: { [key: string]: string } = {};
    let hasError = false;

    semesters.forEach((sem, semIdx) => {
      // Check duplicate module codes
      const duplicates = getSemesterDuplicates(semIdx);
      if (duplicates.length > 0 && !confirmedDuplicates[semIdx]) {
        hasError = true;
        newErrors[`sem_${semIdx}_duplicate`] = `Duplicate module code(s) detected: ${duplicates.join(', ')}. Please confirm duplicate before continuing.`;
      }

      sem.subjects.forEach((sub, subIdx) => {
        const hasCode = Boolean(sub.subject_code && sub.subject_code.trim());
        const hasName = Boolean(sub.subject_name && sub.subject_name.trim());

        if (hasCode || hasName) {
          // Subject is defined, validate credit (credit 0 is valid!)
          const isCreditMissing = sub.credit === '' || sub.credit === null || sub.credit === undefined || isNaN(Number(sub.credit));
          const isCreditNegative = !isCreditMissing && Number(sub.credit) < 0;

          if (isCreditMissing) {
            newErrors[`${semIdx}_${subIdx}_credit`] = 'Credit required';
            hasError = true;
          } else if (isCreditNegative) {
            newErrors[`${semIdx}_${subIdx}_credit`] = 'Cannot be negative';
            hasError = true;
          }
        }
      });
    });

    setSubjectErrors(newErrors);

    if (hasError) {
      return;
    }

    setStep(3);
  };

  // Submit Handler
  const handleSubmitProfile = async () => {
    setError('');

    if (!profileName.trim()) {
      setError('Please fill out Profile Name.');
      setStep(1);
      return;
    }

    // Filter valid semesters and subjects (credit 0 is valid!)
    const cleanedSemesters = semesters.map((sem, idx) => ({
      ...sem,
      semester_name: sem.semester_name.trim() || `Semester ${idx + 1}`,
      subjects: sem.subjects.filter(sub => {
        const hasText = Boolean(sub.subject_name.trim() || (sub.subject_code && sub.subject_code.trim()));
        const isValidCredit = sub.credit !== '' && sub.credit !== null && sub.credit !== undefined && !isNaN(Number(sub.credit)) && Number(sub.credit) >= 0;
        return hasText && isValidCredit;
      }).map(sub => ({
        ...sub,
        credit: Number(sub.credit)
      }))
    })).filter(sem => sem.subjects.length > 0);

    setSubmitting(true);

    try {
      const result = await createProfile({
        profile_name: profileName.trim(),
        university: university.trim(),
        faculty: faculty.trim(),
        department: department.trim(),
        degree: '',
        academic_year: academicYear.trim(),
        description: description.trim(),
        visibility,
        passcode,
        semesters: cleanedSemesters.length > 0 ? cleanedSemesters : [
          {
            semester_name: 'Semester 1',
            semester_order: 1,
            subjects: []
          }
        ],
        gradingScale
      });

      // Clear draft upon successful creation
      localStorage.removeItem('gpa_profile_draft');

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
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in text-slate-900">
      {/* Draft Notification Banner */}
      {showDraftBanner && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-900">
            <Save className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>You have an unfinished profile draft saved on this browser.</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Draft Action Toast */}
      {draftStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{draftStatus}</span>
        </div>
      )}

      {/* Wizard Header Progress */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Create Academic GPA Profile</h1>
            <p className="text-xs text-slate-500">
              Set up predefined subjects & fixed credits once so other students can calculate their GPA easily.
            </p>
          </div>

          {/* Draft Management Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center space-x-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={handleClearDraft}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Draft</span>
            </button>
          </div>
        </div>

        {/* Progress Bar Steps */}
        {step <= 4 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, title: 'Profile Details' },
              { num: 2, title: 'Semesters & Modules' },
              { num: 3, title: 'Grading Scale' },
              { num: 4, title: 'Security & Options' }
            ].map((s) => (
              <div
                key={s.num}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  step === s.num
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : step > s.num
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Step {s.num}</div>
                <div className="text-xs font-bold truncate">{s.title}</div>
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
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="create-profile-name" className="text-xs font-bold text-slate-700 block">
                  Profile Name <span className="text-indigo-600 font-extrabold">* (Required)</span>
                </label>
                {profileNameError && (
                  <span className="text-xs font-bold text-rose-600" role="alert">
                    {profileNameError}
                  </span>
                )}
              </div>
              <input
                id="create-profile-name"
                type="text"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value);
                  if (profileNameError && e.target.value.trim()) setProfileNameError('');
                }}
                placeholder="Enter profile name (e.g. N3-01)"
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 placeholder-slate-400 ${
                  profileNameError ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-slate-300 focus:ring-indigo-500'
                }`}
              />
            </div>

            <div>
              <label htmlFor="create-profile-uni" className="text-xs font-bold text-slate-700 block mb-1">
                University <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="create-profile-uni"
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="Enter university name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div>
              <label htmlFor="create-profile-faculty" className="text-xs font-bold text-slate-700 block mb-1">
                Faculty <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="create-profile-faculty"
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                placeholder="Enter faculty name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div>
              <label htmlFor="create-profile-dept" className="text-xs font-bold text-slate-700 block mb-1">
                Department <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="create-profile-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Enter department name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div>
              <label htmlFor="create-profile-year" className="text-xs font-bold text-slate-700 block mb-1">
                Academic Year <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="create-profile-year"
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2024/2025"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="create-profile-desc" className="text-xs font-bold text-slate-700 block mb-1">
                Description / Notes (Optional)
              </label>
              <textarea
                id="create-profile-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter optional description or degree programme details"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleStep1Next}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-md transition-colors active:scale-95"
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
                Credits entered here are permanently stored. Note: Credit 0 is accepted as a valid value.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddSemester}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Semester</span>
            </button>
          </div>

          {/* Semesters list */}
          <div className="space-y-8">
            {semesters.map((sem, semIdx) => {
              const semDupError = subjectErrors[`sem_${semIdx}_duplicate`];
              return (
                <div key={semIdx} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`semester-name-${semIdx}`} className="sr-only">Semester Name</label>
                    <input
                      id={`semester-name-${semIdx}`}
                      type="text"
                      value={sem.semester_name}
                      onChange={(e) => handleUpdateSemesterName(semIdx, e.target.value)}
                      placeholder={`Enter semester name (e.g. Semester ${semIdx + 1})`}
                      className="font-bold text-slate-900 text-base bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 w-full max-w-sm"
                    />
                    {semesters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSemester(semIdx)}
                        className="text-xs font-semibold text-red-600 hover:underline flex items-center space-x-1 shrink-0 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Semester</span>
                      </button>
                    )}
                  </div>

                  {/* Duplicate Module Code Warning */}
                  {semDupError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold space-y-2" role="alert">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{semDupError}</span>
                      </div>
                      <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={Boolean(confirmedDuplicates[semIdx])}
                          onChange={(e) => {
                            setConfirmedDuplicates({ ...confirmedDuplicates, [semIdx]: e.target.checked });
                            if (e.target.checked) {
                              const newErrors = { ...subjectErrors };
                              delete newErrors[`sem_${semIdx}_duplicate`];
                              setSubjectErrors(newErrors);
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Confirm and allow duplicate module codes in this semester</span>
                      </label>
                    </div>
                  )}

                  {/* Subjects Table */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      <span className="col-span-4 sm:col-span-3">Module Code</span>
                      <span className="col-span-5 sm:col-span-6">Subject Name</span>
                      <span className="col-span-2 text-center">Credit</span>
                      <span className="col-span-1 text-center">Action</span>
                    </div>

                    {sem.subjects.map((sub, subIdx) => {
                      const creditErrKey = `${semIdx}_${subIdx}_credit`;
                      const creditErr = subjectErrors[creditErrKey];
                      return (
                        <div
                          key={subIdx}
                          className={`grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border transition-colors ${
                            creditErr ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200'
                          }`}
                        >
                          {/* Module Code */}
                          <div className="col-span-4 sm:col-span-3">
                            <input
                              type="text"
                              value={sub.subject_code || ''}
                              onChange={(e) => handleUpdateSubject(semIdx, subIdx, 'subject_code', e.target.value.toUpperCase())}
                              placeholder="e.g. NANO2112"
                              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                            />
                          </div>

                          {/* Subject Name */}
                          <div className="col-span-5 sm:col-span-6">
                            <input
                              type="text"
                              value={sub.subject_name}
                              onChange={(e) => handleUpdateSubject(semIdx, subIdx, 'subject_name', e.target.value)}
                              placeholder="Enter subject name"
                              className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                            />
                          </div>

                          {/* Fixed Credit */}
                          <div className="col-span-2 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              max="20"
                              value={sub.credit !== undefined && sub.credit !== null ? sub.credit : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                handleUpdateSubject(semIdx, subIdx, 'credit', val);
                              }}
                              placeholder="Credit"
                              className={`w-full px-2 py-1.5 text-xs font-bold text-center border rounded-lg focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 ${
                                creditErr ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-900'
                              }`}
                            />
                            {creditErr && (
                              <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{creditErr}</span>
                            )}
                          </div>

                          {/* Accessible Delete Button */}
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(semIdx, subIdx)}
                              disabled={sem.subjects.length <= 1}
                              aria-label={`Delete ${sub.subject_name || sub.subject_code || 'subject'}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSubject(semIdx)}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-indigo-600 text-xs font-bold rounded-lg border border-slate-200 flex items-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subject</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleStep2Next}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-md transition-colors active:scale-95"
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
              type="button"
              onClick={() => setIsScaleModalOpen(true)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors"
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
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-md transition-colors active:scale-95"
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
            <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 flex items-center space-x-2" role="alert">
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
              {university || 'University not specified'}{faculty ? ` • ${faculty}` : ''}
            </p>
            <div className="pt-2 text-xs text-slate-500 flex items-center space-x-4">
              <span>{semesters.length} Semesters</span>
              <span>
                {semesters.reduce((acc, sem) => acc + sem.subjects.filter(s => s.subject_name.trim() || (s as any).subject_code).length, 0)} Total Subjects
              </span>
              <span>
                {semesters.reduce((acc, sem) => acc + sem.subjects.reduce((sAcc, s) => sAcc + (Number(s.credit) >= 0 ? Number(s.credit) : 0), 0), 0)} Total Fixed Credits
              </span>
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
            <label htmlFor="create-profile-passcode" className="sr-only">Owner Passcode</label>
            <input
              id="create-profile-passcode"
              type="password"
              placeholder="Enter owner passcode (optional)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={submitting}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitProfile}
              disabled={submitting}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-base rounded-2xl shadow-lg flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
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
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shrink-0 transition-colors ${
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
              type="button"
              onClick={() => onProfileCreated(createdId)}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md flex items-center space-x-2 transition-transform active:scale-95"
            >
              <span>Open & Test Profile</span>
              <ArrowRight className="w-4 h-4" />
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
