import React, { useState } from 'react';
import { Calculator, PlusCircle, Search, Sparkles, Menu, X } from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Logo size="md" variant="dark" onClick={() => handleNav('home')} />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => handleNav('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'home'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('normal')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'normal'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Normal Calculator</span>
            </button>
            <button
              onClick={() => handleNav('create')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'create'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Profile</span>
            </button>
            <button
              onClick={() => handleNav('ai')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'ai'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI Generator</span>
            </button>
            <button
              onClick={() => handleNav('search')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Profiles</span>
            </button>
            <button
              onClick={() => handleNav('about')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'about'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              About
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2 animate-fade-in">
          <button
            onClick={() => handleNav('home')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-base font-medium ${
              activeTab === 'home' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNav('normal')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-base font-medium flex items-center space-x-2 ${
              activeTab === 'normal' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span>Normal Calculator</span>
          </button>
          <button
            onClick={() => handleNav('create')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-base font-medium flex items-center space-x-2 ${
              activeTab === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create Profile</span>
          </button>
          <button
            onClick={() => handleNav('ai')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-base font-medium flex items-center space-x-2 ${
              activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>AI Profile Generator</span>
          </button>
          <button
            onClick={() => handleNav('search')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-base font-medium flex items-center space-x-2 ${
              activeTab === 'search' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Search className="w-5 h-5" />
            <span>Search Profiles</span>
          </button>
          <button
            onClick={() => handleNav('about')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-base font-medium ${
              activeTab === 'about' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            About
          </button>
        </div>
      )}
    </nav>
  );
};
