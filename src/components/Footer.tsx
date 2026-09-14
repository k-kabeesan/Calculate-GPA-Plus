import React from 'react';
import { Logo } from './Logo';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleNavClick = (e: React.MouseEvent, page: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.hash = page;
    }
  };

  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4 md:col-span-2">
          <Logo size="md" variant="dark" onClick={() => onNavigate ? onNavigate('home') : (window.location.hash = 'home')} />
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            The complete academic GPA & CGPA calculation platform for university students. Create reusable academic profiles with fixed subjects and credits, share with batchmates, and export official PDF transcripts.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Quick Navigation</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                type="button"
                onClick={(e) => handleNavClick(e, 'home')}
                className="hover:text-white transition-colors text-left"
              >
                Home Page
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => handleNavClick(e, 'normal')}
                className="hover:text-white transition-colors text-left"
              >
                Normal GPA Calculator
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => handleNavClick(e, 'create')}
                className="hover:text-white transition-colors text-left"
              >
                Create Shared Profile
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => handleNavClick(e, 'search')}
                className="hover:text-white transition-colors text-left"
              >
                Search Profiles
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => handleNavClick(e, 'about')}
                className="hover:text-white transition-colors text-left"
              >
                About
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => handleNavClick(e, 'privacy')}
                className="hover:text-indigo-400 transition-colors text-left font-semibold text-slate-300"
              >
                Privacy Policy
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Privacy & Security</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Student grade entries inside shared profiles remain 100% private to each viewer's session and are never saved to central master profiles.
          </p>
          <button
            type="button"
            onClick={(e) => handleNavClick(e, 'privacy')}
            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline block font-semibold"
          >
            Read Full Privacy Policy →
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} Calculate GPA Plus. All rights reserved.</span>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={(e) => handleNavClick(e, 'privacy')}
            className="hover:text-slate-300 transition-colors"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <span className="text-slate-400 font-medium">K.Kabeesan</span>
        </div>
      </div>
    </footer>
  );
};
