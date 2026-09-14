import React from 'react';
import { ShieldCheck, Lock, Database, EyeOff, UserCheck, CheckCircle2, ArrowLeft } from 'lucide-react';

interface PrivacyPageProps {
  onNavigateHome?: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigateHome }) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10 animate-fade-in text-slate-900">
      {/* Back Button */}
      {onNavigateHome && (
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Transparent & Technical Privacy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          How Calculate GPA Plus handles your academic profiles, grade calculations, and session privacy.
        </p>
      </div>

      {/* Core Architectural Privacy Rules */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">100% Private Grade Calculations</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            When you open a shared academic profile or use the Normal Calculator, all grade selections, credit point math, and GPA values are computed entirely inside your browser memory. Your grades are never transmitted to or saved on any central server or public database.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Shared Profiles Structure</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Profile creators publish university metadata (University, Faculty, Department, Semester, Modules, and Credits). This structure serves as a template. Viewers fill in their own grades independently without altering or viewing anyone else's data.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Passcode Protection</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Profile creators can set an optional owner passcode. Only the owner who provides this passcode can edit or delete the master template. Passcodes are hashed using standard cryptographic algorithms (SHA-256) and cannot be read in plaintext.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Local Draft Storage</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            To prevent losing work while filling out detailed profiles, unsubmitted form drafts are saved exclusively in your browser's private <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">localStorage</code>. Sensitive secrets like passcodes are never included in drafts.
          </p>
        </div>
      </div>

      {/* Summary Checklist */}
      <div className="bg-slate-100/80 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Privacy Guarantees Summary</h2>
        <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
          <li className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>No Account Required:</strong> Calculate your GPA immediately without creating an account or providing your email address.</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Isolated Student Results:</strong> Entering grades in a shared link will never overwrite other students' data or master profile structures.</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Local PDF Rendering:</strong> Academic PDF reports are compiled on your device via client-side libraries. No personal student transcripts are logged.</span>
          </li>
        </ul>
      </div>

      <div className="text-center text-xs text-slate-400 pt-4">
        Last updated: September 2026 • Calculate GPA Plus
      </div>
    </div>
  );
};
