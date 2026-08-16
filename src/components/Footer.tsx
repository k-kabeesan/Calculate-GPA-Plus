import React from 'react';
import { GraduationCap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white">Calculate GPA Plus</span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            The complete academic GPA & CGPA calculation platform for university students. Create reusable academic profiles with fixed subjects and credits, share with batchmates, and export official PDF transcripts.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Quick Navigation</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#home" className="hover:text-white transition-colors">Home Page</a></li>
            <li><a href="#normal" className="hover:text-white transition-colors">Normal GPA Calculator</a></li>
            <li><a href="#create" className="hover:text-white transition-colors">Create Shared Profile</a></li>
            <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Privacy & Security</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Student grade entries inside shared profiles remain 100% private to each viewer's session and are never saved to central master profiles.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} Calculate GPA Plus. All rights reserved.</span>
        <span className="flex items-center space-x-1">
          <span className="text-slate-400 font-medium">K.Kabeesan</span>
        </span>
      </div>
    </footer>
  );
};
