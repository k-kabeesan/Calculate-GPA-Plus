import React, { useState, useRef } from 'react';
import {
  Bot,
  Sparkles,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  Copy,
  Check,
  Upload,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  X,
  RefreshCw
} from 'lucide-react';
import { extractAiProfile, extractAiProfileFromImage, createProfile } from '../services/dbService';

interface AiProfileGeneratorPageProps {
  onProfileCreated: (profileId: string) => void;
}

type InputMode = 'text' | 'image';

export const AiProfileGeneratorPage: React.FC<AiProfileGeneratorPageProps> = ({
  onProfileCreated
}) => {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Active Extracted Profile being reviewed
  const [reviewProfile, setReviewProfile] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sample syllabus loader helper for user convenience
  const handleLoadSampleText = () => {
    const sample = `UNIVERSITY: University of Colombo
FACULTY: Faculty of Science
DEPARTMENT: Department of Computer Science
ACADEMIC YEAR: 2024/2025
SEMESTER: Semester 1

NANO1211 - Introduction to Nanotechnology - 3.0 Credits
SCS1201 - Data Structures and Algorithms - 3 Credits
SCS1202 - Programming Techniques - 2.0 Credits
SCS1203 - Database Management Systems (No credit listed)
PDEV2110 - Career Development II - 0 Credits`;
    setInputText(sample);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!file.type.startsWith('image/') && !validExtensions.includes(ext)) {
      setError('Please upload a valid image file (.jpg, .jpeg, .png, .webp).');
      return;
    }
    setError('');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleExtractProfile = async () => {
    setError('');
    setReviewProfile(null);
    setLoading(true);
    setOcrProgress(0);

    try {
      let extracted: any = null;

      if (inputMode === 'text') {
        if (!inputText.trim()) {
          setError('Please paste university or course text to analyze.');
          setLoading(false);
          return;
        }
        setStatusMessage('AI is extracting profile metadata and subjects...');
        extracted = await extractAiProfile(inputText.trim());
      } else {
        if (!selectedFile) {
          setError('Please select or drag & drop an image file first.');
          setLoading(false);
          return;
        }
        setStatusMessage('Running OpenRouter Vision AI on your image document...');
        extracted = await extractAiProfileFromImage(selectedFile, (progressPct) => {
          setOcrProgress(progressPct);
        });
      }

      if (!extracted || (!extracted.subjects || extracted.subjects.length === 0)) {
        throw new Error('Could not identify academic subjects from the input. Please verify your text/image.');
      }

      setReviewProfile(extracted);
    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err.message || 'The AI response was incomplete. Please try again.');
    } finally {
      setLoading(false);
      setOcrProgress(0);
      setStatusMessage('');
    }
  };

  const handleCreateFinalProfile = async () => {
    if (!reviewProfile) return;
    setSubmitting(true);
    setError('');

    try {
      const pName = (reviewProfile.profileName || '').trim();
      if (!pName) {
        setError('Profile Name is required. Please enter a valid profile name.');
        setSubmitting(false);
        return;
      }

      const uName = (reviewProfile.university || '').trim();
      const fName = (reviewProfile.faculty || '').trim();
      const deptName = (reviewProfile.department || '').trim();
      const yearName = (reviewProfile.academicYear || '').trim();
      const semName = (reviewProfile.semester || 'Semester 1').trim();

      // Check strict credit requirement: Every subject/module MUST have a valid credit (0, 1, 2, 3, etc.)
      let missingCreditSubjectName = '';
      for (const sub of reviewProfile.subjects || []) {
        const code = (sub.moduleNumber || '').trim();
        const name = (sub.subjectName || '').trim();
        if (code || name) {
          const hasValidCredit = sub.credit !== null && sub.credit !== undefined && sub.credit !== '' && !isNaN(Number(sub.credit)) && Number(sub.credit) >= 0;
          if (!hasValidCredit) {
            missingCreditSubjectName = name || code || 'Untitled Subject';
            break;
          }
        }
      }

      if (missingCreditSubjectName) {
        setError(`Credit is required for every subject or module ("${missingCreditSubjectName}" has no credit specified). Please enter all missing credits before creating the profile.`);
        setSubmitting(false);
        return;
      }

      const cleanedSubjects = (reviewProfile.subjects || [])
        .map((sub: any) => ({
          subject_code: (sub.moduleNumber || '').trim(),
          subject_name: (sub.subjectName || '').trim(),
          credit: Number(sub.credit)
        }))
        .filter((sub: any) => (sub.subject_name || sub.subject_code) && !isNaN(sub.credit) && sub.credit >= 0);

      const res = await createProfile({
        profile_name: pName,
        university: uName,
        faculty: fName,
        department: deptName,
        academic_year: yearName,
        description: 'Profile created using AI Profile Generator.',
        visibility: 'public',
        semesters: [
          {
            semester_name: semName,
            semester_order: 1,
            subjects: cleanedSubjects
          }
        ]
      });

      setCreatedProfileId(res.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl = createdProfileId ? `${window.location.origin}/#profile-${createdProfileId}` : '';

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Check if current review profile has any unassigned credit subjects (0 is VALID!)
  const getMissingCreditsCount = (): number => {
    if (!reviewProfile || !reviewProfile.subjects) return 0;
    let count = 0;
    for (const sub of reviewProfile.subjects) {
      if (sub.subjectName || sub.moduleNumber) {
        const isMissing = sub.credit === null || sub.credit === undefined || sub.credit === '' || isNaN(Number(sub.credit)) || Number(sub.credit) < 0;
        if (isMissing) count++;
      }
    }
    return count;
  };

  const missingCreditsCount = getMissingCreditsCount();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in text-slate-900">
      {/* Page Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 shrink-0">
            <Bot className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">AI Profile Generator</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Instantly create a shareable university GPA profile from <strong>Pasted Text</strong> or <strong>Uploaded Images</strong> (OCR/Vision).
            </p>
          </div>
        </div>

        {/* Step Indicator Flow */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center text-xs font-bold">
          <div className={`py-2 px-1 rounded-xl transition-colors ${!reviewProfile && !createdProfileId ? 'bg-indigo-600 text-white' : 'bg-slate-800/80 text-slate-400'}`}>
            1. Input (Text/Image)
          </div>
          <div className={`py-2 px-1 rounded-xl transition-colors ${loading ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-800/80 text-slate-400'}`}>
            2. AI Extract
          </div>
          <div className={`py-2 px-1 rounded-xl transition-colors ${reviewProfile && !createdProfileId ? 'bg-indigo-600 text-white' : 'bg-slate-800/80 text-slate-400'}`}>
            3. Review & Edit
          </div>
          <div className={`py-2 px-1 rounded-xl transition-colors ${createdProfileId ? 'bg-emerald-600 text-white' : 'bg-slate-800/80 text-slate-400'}`}>
            4. Profile Ready
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Input Column - 5 Cols */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-5">
            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all ${
                  inputMode === 'text'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Pasted Text</span>
              </button>

              <button
                type="button"
                onClick={() => setInputMode('image')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all ${
                  inputMode === 'image'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Upload Image</span>
              </button>
            </div>

            {/* Mode 1: Text Input */}
            {inputMode === 'text' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 block">
                    Paste Course Text or Syllabus
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSampleText}
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Try Sample</span>
                  </button>
                </div>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Paste your university course details, syllabus, or result list here...\n\nExample:\nNANO01232 Fundamentals of Physics II\nNANO01242 Computer Programming\nETCH1210 English For Technology II\nPDEV1210 Career Development I`}
                  rows={10}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                />
              </div>
            ) : (
              /* Mode 2: Image Upload */
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-800 block">
                  Upload Screenshot / Photo / Document
                </label>

                {!imagePreviewUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 flex flex-col items-center justify-center min-h-[220px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center border border-indigo-200">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">
                        Click to upload or drag & drop image
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Supports PNG, JPG, JPEG, WEBP screenshots & photos
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 group">
                    <img
                      src={imagePreviewUrl}
                      alt="Uploaded document preview"
                      className="w-full max-h-[260px] object-contain mx-auto py-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-full transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="p-2 bg-slate-900/90 text-white text-[11px] font-semibold text-center truncate px-4">
                      {selectedFile?.name} ({(selectedFile?.size ? (selectedFile.size / 1024).toFixed(0) : 0)} KB)
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                  className="hidden"
                />
              </div>
            )}

            {/* Error Message display */}
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 flex items-start space-x-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              onClick={handleExtractProfile}
              disabled={loading || (inputMode === 'text' ? !inputText.trim() : !selectedFile)}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{statusMessage || 'Extracting Profile...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Analyze & Extract Profile</span>
                </>
              )}
            </button>

            {/* OCR Progress Indicator */}
            {loading && ocrProgress > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>OCR Text Recognition</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Output Column: Review & Edit or Confirmation - 7 Cols */}
        <div className="lg:col-span-7 space-y-4">
          {createdProfileId ? (
            /* Confirmation & Success Screen */
            <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-lg space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Profile Created Successfully!</h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Your academic profile has been published. Share this unique link so students can calculate their GPA directly.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Custom Profile Share Link</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-indigo-700 font-bold select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => onProfileCreated(createdProfileId)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md"
                >
                  <span>Open Profile & Calculate GPA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedProfileId(null);
                    setReviewProfile(null);
                    setInputText('');
                    setSelectedFile(null);
                    setImagePreviewUrl(null);
                  }}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Create Another Profile</span>
                </button>
              </div>
            </div>
          ) : reviewProfile ? (
            /* Review & Edit Screen */
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-black text-slate-900">Review & Edit Profile</h2>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Step 3: Confirm Details
                </span>
              </div>

              {missingCreditsCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2 text-amber-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Credit Required ({missingCreditsCount} subject{missingCreditsCount > 1 ? 's' : ''})</span>
                    <span>AI detected subjects without explicit credits. Please enter the credits manually before creating your profile.</span>
                  </div>
                </div>
              )}

              {/* Extracted Metadata Fields */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">Profile Metadata</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Profile Name <span className="text-indigo-600 font-extrabold">* (Required)</span>
                    </label>
                    <input
                      type="text"
                      value={reviewProfile.profileName || ''}
                      onChange={(e) => setReviewProfile({ ...reviewProfile, profileName: e.target.value })}
                      placeholder="e.g. BSc Computer Science - Batch 2024"
                      className="w-full px-3 py-2 border border-indigo-300 rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">University</label>
                    <input
                      type="text"
                      value={reviewProfile.university || ''}
                      onChange={(e) => setReviewProfile({ ...reviewProfile, university: e.target.value })}
                      placeholder="University Name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Faculty</label>
                    <input
                      type="text"
                      value={reviewProfile.faculty || ''}
                      onChange={(e) => setReviewProfile({ ...reviewProfile, faculty: e.target.value })}
                      placeholder="Faculty Name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Department</label>
                    <input
                      type="text"
                      value={reviewProfile.department || ''}
                      onChange={(e) => setReviewProfile({ ...reviewProfile, department: e.target.value })}
                      placeholder="Department Name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Academic Year</label>
                    <input
                      type="text"
                      value={reviewProfile.academicYear || ''}
                      onChange={(e) => setReviewProfile({ ...reviewProfile, academicYear: e.target.value })}
                      placeholder="e.g. 2024/2025"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Semester</label>
                    <input
                      type="text"
                      value={reviewProfile.semester || ''}
                      onChange={(e) => setReviewProfile({ ...reviewProfile, semester: e.target.value })}
                      placeholder="e.g. Semester 1"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Subjects Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">Extracted Subjects & Modules</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedSubs = [...(reviewProfile.subjects || []), { moduleNumber: '', subjectName: '', credit: null }];
                      setReviewProfile({ ...reviewProfile, subjects: updatedSubs });
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subject</span>
                  </button>
                </div>

                {/* Subjects Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-extrabold">
                        <th className="py-2.5 px-3 w-1/4">Module Number</th>
                        <th className="py-2.5 px-3 w-1/2">Subject Name</th>
                        <th className="py-2.5 px-3 w-1/4 text-right">Credit</th>
                        <th className="py-2.5 px-3 w-10 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(reviewProfile.subjects || []).map((sub: any, subIdx: number) => {
                        const isCreditMissing = (sub.credit === null || sub.credit === undefined || sub.credit === '' || isNaN(Number(sub.credit))) && (sub.subjectName || sub.moduleNumber);
                        return (
                          <tr key={subIdx} className={`hover:bg-slate-50/80 transition-colors ${isCreditMissing ? 'bg-amber-50/30' : ''}`}>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="e.g. NANO01232"
                                value={sub.moduleNumber || ''}
                                onChange={(e) => {
                                  const updatedSubs = [...reviewProfile.subjects];
                                  updatedSubs[subIdx].moduleNumber = e.target.value;
                                  setReviewProfile({ ...reviewProfile, subjects: updatedSubs });
                                }}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-semibold uppercase"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Subject Name"
                                value={sub.subjectName || ''}
                                onChange={(e) => {
                                  const updatedSubs = [...reviewProfile.subjects];
                                  updatedSubs[subIdx].subjectName = e.target.value;
                                  setReviewProfile({ ...reviewProfile, subjects: updatedSubs });
                                }}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex flex-col items-end space-y-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  placeholder="Credit"
                                  value={sub.credit === null || sub.credit === undefined || sub.credit === '' ? '' : sub.credit}
                                  onChange={(e) => {
                                    const updatedSubs = [...reviewProfile.subjects];
                                    const rawVal = e.target.value;
                                    if (rawVal === '') {
                                      updatedSubs[subIdx].credit = null;
                                    } else {
                                      const parsed = parseFloat(rawVal);
                                      updatedSubs[subIdx].credit = !isNaN(parsed) && parsed >= 0 ? parsed : null;
                                    }
                                    setReviewProfile({ ...reviewProfile, subjects: updatedSubs });
                                  }}
                                  className={`w-20 px-2 py-1.5 rounded-lg text-xs font-bold text-right transition-colors ${
                                    isCreditMissing
                                      ? 'border-2 border-amber-500 bg-amber-50 focus:ring-amber-500'
                                      : 'bg-slate-50 border border-slate-200'
                                  }`}
                                />
                                {isCreditMissing && (
                                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 shrink-0">
                                    Credit Required
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedSubs = reviewProfile.subjects.filter((_: any, i: number) => i !== subIdx);
                                  setReviewProfile({ ...reviewProfile, subjects: updatedSubs });
                                }}
                                aria-label={`Delete ${sub.subjectName || sub.moduleNumber || 'subject'}`}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Final Action Bar */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setReviewProfile(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold"
                >
                  Discard & Start Over
                </button>

                <button
                  type="button"
                  onClick={handleCreateFinalProfile}
                  disabled={submitting || missingCreditsCount > 0 || !reviewProfile.profileName?.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md transition-transform active:scale-95"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{submitting ? 'Creating Profile...' : 'Create Profile'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Placeholder before extraction */
            <div className="bg-slate-100/70 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3 flex flex-col items-center justify-center min-h-[440px]">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Profile Analyzed Yet</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Paste your course details or upload an image on the left, then click <strong>"Analyze & Extract Profile"</strong>. Your extracted profile will appear here for review & edit before creation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
