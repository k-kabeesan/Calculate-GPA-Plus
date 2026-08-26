import React, { useEffect, useState } from 'react';
import { Lock, Unlock, Save, Trash2, Plus, Share2, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import type { Profile, Semester, Subject, GradeOption } from '../types';
import { DEFAULT_GRADING_SCALE } from '../utils/gpa';
import { GradingScaleModal } from '../components/GradingScaleModal';
import { ShareModal } from '../components/ShareModal';
import { fetchProfileById, verifyOwnerPasscode, updateProfile, deleteProfile } from '../services/dbService';

interface ProfileManagePageProps {
  profileId: string;
  onNavigateToViewer: (id: string) => void;
  onNavigateHome: () => void;
}

export const ProfileManagePage: React.FC<ProfileManagePageProps> = ({
  profileId,
  onNavigateToViewer,
  onNavigateHome
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Passcode modal / unlock state
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passError, setPassError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Editable Profile fields
  const [profileName, setProfileName] = useState('');
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'shared' | 'private'>('public');

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [gradingScale, setGradingScale] = useState<GradeOption[]>(DEFAULT_GRADING_SCALE);

  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Load profile
  useEffect(() => {
    setLoading(true);
    fetchProfileById(profileId)
      .then((data: Profile) => {
        setProfile(data);
        setProfileName(data.profile_name);
        setUniversity(data.university || '');
        setFaculty(data.faculty || '');
        setAcademicYear(data.academic_year || '');
        setDescription(data.description || '');
        setVisibility(data.visibility || 'public');
        setSemesters(data.semesters || []);
        setGradingScale(data.gradingScale || DEFAULT_GRADING_SCALE);

        // If profile has no passcode set, unlock automatically
        if (!data.has_passcode) {
          setIsUnlocked(true);
        }
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profileId]);

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setPassError('');

    try {
      const isValid = await verifyOwnerPasscode(profileId, passcode);
      if (!isValid) {
        throw new Error('Incorrect owner passcode.');
      }
      setIsUnlocked(true);
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');

    if (!profileName.trim()) {
      setError('Please fill out Profile Name.');
      setSaving(false);
      return;
    }

    // Subject Credit Validation Rule:
    let hasInvalidCreditSubject = false;
    for (const sem of semesters) {
      for (const sub of sem.subjects) {
        const hasCode = Boolean((sub as any).subject_code && (sub as any).subject_code.trim());
        const hasName = Boolean(sub.subject_name && sub.subject_name.trim());
        if (hasCode || hasName) {
          if (!sub.credit || Number(sub.credit) <= 0) {
            hasInvalidCreditSubject = true;
            break;
          }
        }
      }
      if (hasInvalidCreditSubject) break;
    }

    if (hasInvalidCreditSubject) {
      setError('Credit is required for every subject or module.');
      setSaving(false);
      return;
    }

    // Filter non-empty subject rows
    const cleanedSemesters = semesters.map((sem, idx) => ({
      ...sem,
      semester_name: sem.semester_name.trim() || `Semester ${idx + 1}`,
      subjects: sem.subjects.filter(sub => (sub.subject_name.trim() || ((sub as any).subject_code && (sub as any).subject_code.trim())) && Number(sub.credit) > 0)
    }));

    try {
      await updateProfile(profileId, passcode, {
        profile_name: profileName.trim(),
        university: university.trim(),
        faculty: faculty.trim(),
        degree: '',
        academic_year: academicYear.trim(),
        description: description.trim(),
        visibility,
        semesters: cleanedSemesters,
        gradingScale
      });

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this profile? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProfile(profileId, passcode);
      alert('Profile deleted successfully.');
      onNavigateHome();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Semesters & Subjects Handlers
  const handleAddSemester = () => {
    const order = semesters.length + 1;
    setSemesters([
      ...semesters,
      {
        semester_name: `Semester ${order}`,
        semester_order: order,
        subjects: [{ subject_name: 'Subject 1', credit: 3 }]
      }
    ]);
  };

  const handleRemoveSemester = (sIdx: number) => {
    setSemesters(semesters.filter((_, idx) => idx !== sIdx));
  };

  const handleAddSubject = (sIdx: number) => {
    const updated = [...semesters];
    updated[sIdx].subjects.push({ subject_name: 'New Subject', credit: 3 });
    setSemesters(updated);
  };

  const handleRemoveSubject = (sIdx: number, subIdx: number) => {
    const updated = [...semesters];
    updated[sIdx].subjects = updated[sIdx].subjects.filter((_, idx) => idx !== subIdx);
    setSemesters(updated);
  };

  const handleUpdateSubject = (sIdx: number, subIdx: number, field: keyof Subject, val: any) => {
    const updated = [...semesters];
    updated[sIdx].subjects[subIdx] = {
      ...updated[sIdx].subjects[subIdx],
      [field]: val
    };
    setSemesters(updated);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500">
        Loading owner portal...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Profile Not Found</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <button onClick={onNavigateHome} className="text-indigo-600 font-bold text-xs hover:underline">
          Return Home
        </button>
      </div>
    );
  }

  // Passcode verification screen
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 space-y-6 animate-fade-in">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Owner Access Verification</h2>
            <p className="text-xs text-slate-500">
              Please enter the owner passcode for <code className="font-bold text-indigo-600">{profileId}</code>.
            </p>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <input
              type="password"
              placeholder="Enter passcode..."
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              autoFocus
            />

            {passError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 text-center">
                {passError}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              {verifying ? 'Verifying...' : 'Unlock Owner Dashboard'}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigateToViewer(profileId)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel and Return to Viewer Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Unlock className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold">Manage Profile ({profileId})</h1>
          </div>
          <p className="text-xs text-slate-400">
            Edit fixed subjects, credits, and profile parameters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateToViewer(profileId)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-slate-700"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Open Viewer</span>
          </button>
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Link</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-200">
          {error}
        </div>
      )}

      {/* Main Metadata Editor */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Academic Information</h2>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">Profile Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">University</label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Faculty</label>
            <input
              type="text"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Academic Year</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Semesters & Subjects Editor */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Manage Semesters & Fixed Credits</h2>
          <button
            onClick={handleAddSemester}
            className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Semester</span>
          </button>
        </div>

        <div className="space-y-6">
          {semesters.map((sem, semIdx) => (
            <div key={semIdx} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={sem.semester_name}
                  onChange={(e) => {
                    const updated = [...semesters];
                    updated[semIdx].semester_name = e.target.value;
                    setSemesters(updated);
                  }}
                  className="font-bold text-slate-900 text-sm bg-white border border-slate-300 rounded-xl px-3 py-1.5"
                />
                <button
                  onClick={() => handleRemoveSemester(semIdx)}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  Remove Semester
                </button>
              </div>

              {/* Subject Rows */}
              <div className="space-y-2">
                {sem.subjects.map((sub, subIdx) => (
                  <div key={subIdx} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200">
                    <div className="col-span-7">
                      <input
                        type="text"
                        value={sub.subject_name}
                        onChange={(e) => handleUpdateSubject(semIdx, subIdx, 'subject_name', e.target.value)}
                        className="w-full px-3 py-1 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={sub.credit || ''}
                        onChange={(e) => handleUpdateSubject(semIdx, subIdx, 'credit', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1 text-xs font-bold text-slate-900 text-center border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => handleRemoveSubject(semIdx, subIdx)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleAddSubject(semIdx)}
                className="px-3 py-1.5 bg-white text-indigo-600 font-bold text-xs rounded-lg border border-slate-200 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={handleDeleteProfile}
          className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center space-x-1.5"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Profile Permanently</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsScaleModalOpen(true)}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
          >
            Edit Grading Scale
          </button>

          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <GradingScaleModal
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
        scale={gradingScale}
        onSaveScale={setGradingScale}
        editable={true}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        profileId={profile.id}
        profileName={profile.profile_name}
      />
    </div>
  );
};
