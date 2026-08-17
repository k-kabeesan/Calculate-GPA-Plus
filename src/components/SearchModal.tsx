import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight, AlertCircle, Link2, GraduationCap, Building2, BookOpen, Loader2 } from 'lucide-react';
import { fetchPublicProfiles } from '../services/dbService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (profileId: string) => void;
  initialQuery?: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onOpenProfile,
  initialQuery = ''
}) => {
  const [inputVal, setInputVal] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initial = initialQuery || '';
      setInputVal(initial);
      setError('');
      if (initial.trim()) {
        performSearch(initial.trim());
      } else {
        // Fetch default public profiles list
        performSearch('');
      }
    } else {
      setInputVal('');
      setSearchResults([]);
      setError('');
    }
  }, [isOpen, initialQuery]);

  const performSearch = async (query: string) => {
    setIsLoading(true);
    setError('');
    try {
      const results = await fetchPublicProfiles(query);
      setSearchResults(results || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    setError('');
    performSearch(val);
  };

  const handleSelectProfile = (profileId: string) => {
    onOpenProfile(profileId);
    onClose();
    setInputVal('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) {
      setError('Please enter a Profile Name, Profile ID, or share link.');
      return;
    }

    // Extract ID if user pasted full URL (e.g. http://localhost:5173/profile/ABC123)
    let extractedId = inputVal.trim();
    if (extractedId.includes('/profile/')) {
      const parts = extractedId.split('/profile/');
      extractedId = parts[parts.length - 1].split('?')[0].split('#')[0];
    } else if (extractedId.includes('#profile-')) {
      const parts = extractedId.split('#profile-');
      extractedId = parts[parts.length - 1].split('?')[0];
    }

    // Clean up profile ID format (uppercase letters and numbers)
    const cleanId = extractedId.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();

    // If input matches an exact result or clean 6-character profile ID format
    if (cleanId && (cleanId.length === 6 || searchResults.some(p => p.id === cleanId))) {
      onOpenProfile(cleanId);
      onClose();
      setInputVal('');
      return;
    }

    // If we have search results, open the first matching profile
    if (searchResults.length > 0) {
      onOpenProfile(searchResults[0].id);
      onClose();
      setInputVal('');
      return;
    }

    // Otherwise, try opening cleanId directly
    if (cleanId) {
      onOpenProfile(cleanId);
      onClose();
      setInputVal('');
    } else {
      setError('Invalid Profile Name, ID, or URL format.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold">Search & Open Shared GPA Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Section */}
        <form onSubmit={handleSubmit} className="p-6 pb-4 space-y-4 shrink-0 border-b border-slate-100">
          <p className="text-sm text-slate-600">
            Search by profile name, university, or enter a Profile ID / link (e.g. <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold text-xs">DEMO123</code>):
          </p>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={handleInputChange}
              placeholder="Search profile by name"
              className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 text-sm placeholder-slate-400 font-medium transition-all shadow-xs"
              autoFocus
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  performSearch('');
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Results Container */}
        <div className="overflow-y-auto p-6 space-y-3 flex-1 min-h-[200px] max-h-[400px] bg-slate-50/50">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1 mb-2">
            <span>
              {inputVal.trim() ? `Search Results for "${inputVal.trim()}"` : 'Available Profiles'}
            </span>
            {isLoading && (
              <span className="flex items-center text-indigo-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                Searching...
              </span>
            )}
          </div>

          {isLoading && searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span>Searching matching profiles...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors truncate">
                        {profile.profile_name}
                      </h4>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                        ID: {profile.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate"><strong>University:</strong> {profile.university}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate"><strong>Faculty:</strong> {profile.faculty}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-indigo-600 font-semibold sm:col-span-2">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span><strong>Semester:</strong> {profile.semester_count || (profile.semesters ? profile.semesters.length : 1)} Semester(s)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 sm:pt-0 shrink-0 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleSelectProfile(profile.id)}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <span>Open Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200 p-6 space-y-2">
              <p className="font-semibold text-slate-700">No matching profiles found</p>
              <p className="text-slate-400 max-w-xs mx-auto">
                {inputVal.trim()
                  ? `No profiles matched "${inputVal.trim()}". You can still try opening a Profile ID directly.`
                  : 'No public profiles are currently available.'}
              </p>
              {inputVal.trim() && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl inline-flex items-center space-x-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Try Opening "{inputVal.trim()}" as Profile ID/Link</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            Type profile name or paste Profile ID link
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
