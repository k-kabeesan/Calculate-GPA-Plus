import React, { useState } from 'react';
import { Search, X, ArrowRight, AlertCircle, Link2 } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (profileId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onOpenProfile }) => {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) {
      setError('Please enter a Profile ID or share link.');
      return;
    }

    // Extract ID if user pasted full URL (e.g. http://localhost:5173/profile/ABC123)
    let extractedId = inputVal.trim();
    if (extractedId.includes('/profile/')) {
      const parts = extractedId.split('/profile/');
      extractedId = parts[parts.length - 1].split('?')[0].split('#')[0];
    }

    extractedId = extractedId.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();

    if (!extractedId) {
      setError('Invalid Profile ID or URL format.');
      return;
    }

    setError('');
    onOpenProfile(extractedId);
    onClose();
    setInputVal('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold">Open Shared GPA Profile</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Enter a Profile ID (e.g. <code className="text-indigo-600 bg-indigo-50 font-bold">DEMO123</code>) or paste a shared profile URL link:
          </p>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Link2 className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setError('');
              }}
              placeholder="e.g. ABC123 or https://gpa.app/profile/ABC123"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 text-sm placeholder-slate-400 font-medium"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 shadow-md transition-transform active:scale-95"
            >
              <span>Open Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
          <span className="text-xs text-slate-500">
            Enter the Profile ID shared by your creator or university.
          </span>
        </div>
      </div>
    </div>
  );
};
