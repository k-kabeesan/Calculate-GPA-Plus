import React, { useEffect, useState } from 'react';
import { Calculator, PlusCircle, Search, Sparkles, BookOpen, ShieldCheck, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { fetchPublicProfiles } from '../services/dbService';

interface HomePageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [publicProfiles, setPublicProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicProfiles()
      .then(data => {
        if (Array.isArray(data)) {
          setPublicProfiles(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-16 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-12 lg:p-16 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-gradient-to-tr from-blue-500/20 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fast, Modern & Academic Ready</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Calculate Your GPA Easily
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
            Calculate your GPA instantly or create a reusable academic profile with predefined subjects & credits for your university.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-4 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('normal')}
              className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <Calculator className="w-4.5 h-4.5" />
              <span>Calculate GPA</span>
            </button>

            <button
              onClick={() => onNavigate('create')}
              className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4.5 h-4.5 text-indigo-400" />
              <span>Create Profile</span>
            </button>

            <button
              onClick={() => onNavigate('ai')}
              className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4.5 h-4.5 text-amber-400" />
              <span>AI Profile Generator</span>
            </button>

            <button
              onClick={() => onNavigate('search')}
              className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <Search className="w-4.5 h-4.5 text-purple-400" />
              <span>Search Profiles</span>
            </button>
          </div>
        </div>
      </section>

      {/* Feature Explainers Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900">Choose Your Calculation Mode</h2>
          <p className="text-slate-600 text-sm">
            Whether you need a quick personal check or want to share predefined templates with your batchmates.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Calculator className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Normal GPA Calculator</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Calculate your GPA instantly without profile creation. Add subjects, enter credits, select grades, and customize grade scales on the fly.
              </p>
            </div>
            <button
              onClick={() => onNavigate('normal')}
              className="pt-4 text-indigo-600 font-bold text-sm flex items-center space-x-1.5 group-hover:translate-x-1 transition-transform"
            >
              <span>Calculate Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-8 border border-indigo-100 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-bl-xl">
              Most Popular
            </div>
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Shared GPA Profiles</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Create a profile once with predefined university subjects & fixed credits. Share the link so students only enter their grades.
              </p>
            </div>
            <button
              onClick={() => onNavigate('create')}
              className="pt-4 text-purple-600 font-bold text-sm flex items-center space-x-1.5 group-hover:translate-x-1 transition-transform"
            >
              <span>Create Academic Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Academic Reports</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Download high-quality professional PDF reports showing detailed credit calculations, semester GPAs, and cumulative CGPAs.
              </p>
            </div>
            <button
              onClick={() => onNavigate('normal')}
              className="pt-4 text-emerald-600 font-bold text-sm flex items-center space-x-1.5 group-hover:translate-x-1 transition-transform"
            >
              <span>Generate PDF Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Public Profiles Section */}
      <section className="space-y-6 bg-slate-100/70 p-8 rounded-3xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Explore Public Profiles</h2>
            <p className="text-sm text-slate-600">Select a pre-built profile to calculate your GPA instantly.</p>
          </div>
          <button
            onClick={() => onNavigate('search')}
            className="text-indigo-600 font-bold text-sm hover:underline flex items-center space-x-1"
          >
            <span>Search Profiles</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading available profiles...</div>
        ) : publicProfiles.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 space-y-3">
            <p className="text-slate-500 text-sm">No public profiles found yet.</p>
            <button
              onClick={() => onNavigate('create')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              Be the first to create one!
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicProfiles.map((p) => (
              <div
                key={p.id}
                onClick={() => onNavigate('viewer', { id: p.id })}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer hover:border-indigo-300 space-y-4 group"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                    ID: {p.id}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {p.total_credits || 0} Credits
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {p.profile_name}
                  </h4>
                  <p className="text-xs font-medium text-slate-600 line-clamp-1">{p.university}</p>
                  <p className="text-xs text-slate-400 line-clamp-1">{p.faculty}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>{p.total_subjects || 0} Subjects</span>
                  <span className="text-indigo-600 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center space-x-1">
                    <span>Use Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trust & Features list */}
      <section className="border-t border-slate-200 pt-10">
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Isolated Student Results</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Entering your grades inside a shared link will never overwrite other students' data or master profile structure.
            </p>
          </div>

          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-1">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Multi-Semester & CGPA</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Full credit-weighted CGPA calculations across all semester modules with clear step-by-step breakdown.
            </p>
          </div>

          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-purple-50 text-purple-600 mb-1">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Client PDF Generator</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Instantly generate clean, printable transcript reports formatted for academic verification.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
