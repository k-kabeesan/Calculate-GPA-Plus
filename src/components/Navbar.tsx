import React, { useState } from 'react';
import { Calculator, PlusCircle, Search, Menu, X } from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openSearchModal: (query?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, openSearchModal }) => {
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
              <span>Create Shared Profile</span>
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

          {/* Quick Search trigger button */}
          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={() => openSearchModal()}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all shadow-inner"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Search profile by name...</span>
              <kbd className="bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400 rounded border border-slate-700">⌘K</kbd>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
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
            <span>Create Shared Profile</span>
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
