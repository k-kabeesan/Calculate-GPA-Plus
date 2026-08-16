import React from 'react';
import { ExternalLink, User } from 'lucide-react';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
);

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto py-16 px-4 sm:px-6 space-y-8 animate-fade-in text-slate-900">
      {/* Title & Creator Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Calculate GPA Plus
        </h1>
        <div className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-800 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
          <User className="w-4 h-4 text-slate-600" />
          <span>Created by K.Kabeesan</span>
        </div>
      </div>

      {/* Social Links Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        {/* Instagram Link */}
        <a
          href="https://www.instagram.com/K_KABEESAN"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 transition-all group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-900">
              <InstagramIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Instagram</span>
              <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                @K_KABEESAN
              </span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
        </a>

        {/* Facebook Link */}
        <a
          href="https://www.facebook.com/share/1CTH7Bg4ri/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 transition-all group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-900">
              <FacebookIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Facebook</span>
              <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                K.Kabeesan
              </span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
        </a>

        {/* LinkedIn Link */}
        <a
          href="https://www.linkedin.com/in/k-kabeesan-9b1917394/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 transition-all group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-900">
              <LinkedInIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">LinkedIn</span>
              <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                K.Kabeesan
              </span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
        </a>
      </div>

      <div className="text-center text-xs text-slate-400 font-medium">
        © {new Date().getFullYear()} Calculate GPA Plus. All rights reserved.
      </div>
    </div>
  );
};
