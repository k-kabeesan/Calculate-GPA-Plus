import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, ChevronDown, ArrowRight, Loader2, RotateCcw, X, Building2, GraduationCap, BookOpen, Layers, Calendar } from 'lucide-react';
import { fetchPublicProfiles, fetchFilterOptions, type ProfileFilterParams } from '../services/dbService';

interface SearchProfilesPageProps {
  onOpenProfile: (profileId: string) => void;
  initialSearchQuery?: string;
}

type PopoverType = 'university' | 'faculty' | 'department' | 'degree' | 'year' | 'semester' | null;

export const SearchProfilesPage: React.FC<SearchProfilesPageProps> = ({
  onOpenProfile,
  initialSearchQuery = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDegree, setSelectedDegree] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  const [openPopover, setOpenPopover] = useState<PopoverType>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Available Filter Options fetched from DB
  const [filterOptions, setFilterOptions] = useState<{
    universities: string[];
    faculties: string[];
    departments: string[];
    degrees: string[];
    academicYears: string[];
  }>({
    universities: [],
    faculties: [],
    departments: [],
    degrees: [],
    academicYears: []
  });

  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch filter dropdown options on mount
  useEffect(() => {
    fetchFilterOptions()
      .then(options => setFilterOptions(options))
      .catch(() => {});
  }, []);

  // Debounced search trigger when inputs/filters change
  useEffect(() => {
    const handler = setTimeout(() => {
      loadProfiles();
    }, 300);

    return () => clearTimeout(handler);
  }, [
    searchQuery,
    selectedUniversity,
    selectedFaculty,
    selectedDepartment,
    selectedDegree,
    selectedAcademicYear,
    selectedSemester
  ]);

  const loadProfiles = async () => {
    setLoading(true);
    setError('');

    try {
      const filterParams: ProfileFilterParams = {
        search: searchQuery.trim(),
        university: selectedUniversity,
        faculty: selectedFaculty,
        department: selectedDepartment,
        academicYear: selectedAcademicYear,
        semester: selectedSemester
      };

      const data = await fetchPublicProfiles(filterParams);
      setProfiles(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to search profiles.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedUniversity('');
    setSelectedFaculty('');
    setSelectedDepartment('');
    setSelectedDegree('');
    setSelectedAcademicYear('');
    setSelectedSemester('');
    setOpenPopover(null);
  };

  const activeFilterCount = [
    selectedUniversity,
    selectedFaculty,
    selectedDepartment,
    selectedDegree,
    selectedAcademicYear,
    selectedSemester
  ].filter(Boolean).length;

  const hasActiveFilters = Boolean(searchQuery || activeFilterCount > 0);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in text-slate-900" ref={containerRef}>
      {/* Top Search Bar & Header */}
      <div className="space-y-4 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Search Profiles</h1>
        <p className="text-sm text-slate-600">
          Find pre-built university profiles with fixed subjects and credits. Search by name or filter by university, faculty, department, degree, academic year, or semester.
        </p>

        {/* 🔍 Search profile by name... input */}
        <div className="relative max-w-2xl mx-auto pt-2">
          <Search className="absolute left-4 top-5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search profile by name..."
            className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-300 rounded-full text-slate-900 placeholder-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Pill-Shaped Filter Buttons Row */}
      <div className="space-y-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 overflow-x-auto py-1.5 no-scrollbar scroll-smooth">
          {/* Filters Toggle Pill */}
          <button
            onClick={() => {
              setShowFilterPanel(!showFilterPanel);
              setOpenPopover(null);
            }}
            className={`px-4 py-2 rounded-full text-xs font-extrabold flex items-center space-x-1.5 shrink-0 border transition-all ${
              showFilterPanel || activeFilterCount > 0
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px] font-black">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* University Pill */}
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenPopover(openPopover === 'university' ? null : 'university')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
                selectedUniversity
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <span>{selectedUniversity ? `Uni: ${selectedUniversity}` : 'University'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openPopover === 'university' && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 max-h-60 overflow-y-auto animate-fade-in">
                <button
                  onClick={() => { setSelectedUniversity(''); setOpenPopover(null); }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold ${!selectedUniversity ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  All Universities
                </button>
                {filterOptions.universities.map((u) => (
                  <button
                    key={u}
                    onClick={() => { setSelectedUniversity(u); setOpenPopover(null); }}
                    className={`w-full text-left px-4 py-2 text-xs truncate font-medium ${selectedUniversity === u ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Faculty Pill */}
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenPopover(openPopover === 'faculty' ? null : 'faculty')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
                selectedFaculty
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <span>{selectedFaculty ? `Faculty: ${selectedFaculty}` : 'Faculty'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openPopover === 'faculty' && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 max-h-60 overflow-y-auto animate-fade-in">
                <button
                  onClick={() => { setSelectedFaculty(''); setOpenPopover(null); }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold ${!selectedFaculty ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  All Faculties
                </button>
                {filterOptions.faculties.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setSelectedFaculty(f); setOpenPopover(null); }}
                    className={`w-full text-left px-4 py-2 text-xs truncate font-medium ${selectedFaculty === f ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Department Pill */}
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenPopover(openPopover === 'department' ? null : 'department')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
                selectedDepartment
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <span>{selectedDepartment ? `Dept: ${selectedDepartment}` : 'Department'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openPopover === 'department' && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 max-h-60 overflow-y-auto animate-fade-in">
                <button
                  onClick={() => { setSelectedDepartment(''); setOpenPopover(null); }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold ${!selectedDepartment ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  All Departments
                </button>
                {filterOptions.departments.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setSelectedDepartment(d); setOpenPopover(null); }}
                    className={`w-full text-left px-4 py-2 text-xs truncate font-medium ${selectedDepartment === d ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Academic Year Pill */}
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenPopover(openPopover === 'year' ? null : 'year')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
                selectedAcademicYear
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <span>{selectedAcademicYear ? `Year: ${selectedAcademicYear}` : 'Academic Year'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openPopover === 'year' && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 max-h-60 overflow-y-auto animate-fade-in">
                <button
                  onClick={() => { setSelectedAcademicYear(''); setOpenPopover(null); }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold ${!selectedAcademicYear ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  All Academic Years
                </button>
                {filterOptions.academicYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => { setSelectedAcademicYear(y); setOpenPopover(null); }}
                    className={`w-full text-left px-4 py-2 text-xs truncate font-medium ${selectedAcademicYear === y ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Semester Pill */}
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenPopover(openPopover === 'semester' ? null : 'semester')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
                selectedSemester
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <span>{selectedSemester ? `Sem: ${selectedSemester}` : 'Semester'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openPopover === 'semester' && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-30 animate-fade-in space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Filter by Semester</span>
                <input
                  type="text"
                  placeholder="e.g. Semester 1"
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {selectedSemester && (
                  <button
                    onClick={() => setSelectedSemester('')}
                    className="text-[11px] font-bold text-red-600 hover:underline block text-right"
                  >
                    Reset Semester Filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expandable Filter Panel when "Filters" is clicked */}
        {showFilterPanel && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in pt-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>University</span>
              </label>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Universities</option>
                {filterOptions.universities.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>Faculty</span>
              </label>
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Faculties</option>
                {filterOptions.faculties.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Department</span>
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Departments</option>
                {filterOptions.departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Degree / Programme</span>
              </label>
              <select
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Degrees / Programmes</option>
                {filterOptions.degrees.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Academic Year</span>
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Academic Years</option>
                {filterOptions.academicYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Semester</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Semester 1"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Active Filter Removable Tag Chips & Clear All */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400">Selected Filters:</span>

            {selectedUniversity && (
              <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                University: {selectedUniversity}
                <button onClick={() => setSelectedUniversity('')} className="ml-1.5 text-indigo-500 hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedFaculty && (
              <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                Faculty: {selectedFaculty}
                <button onClick={() => setSelectedFaculty('')} className="ml-1.5 text-indigo-500 hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedDepartment && (
              <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                Department: {selectedDepartment}
                <button onClick={() => setSelectedDepartment('')} className="ml-1.5 text-indigo-500 hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedDegree && (
              <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                Degree: {selectedDegree}
                <button onClick={() => setSelectedDegree('')} className="ml-1.5 text-indigo-500 hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedAcademicYear && (
              <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                Year: {selectedAcademicYear}
                <button onClick={() => setSelectedAcademicYear('')} className="ml-1.5 text-indigo-500 hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSemester && (
              <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                Semester: {selectedSemester}
                <button onClick={() => setSelectedSemester('')} className="ml-1.5 text-indigo-500 hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-red-600 hover:underline flex items-center space-x-1 ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* Profiles Search Results List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>Matching Profiles ({profiles.length})</span>
          {loading && (
            <span className="flex items-center text-indigo-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              Searching profiles...
            </span>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-200">
            {error}
          </div>
        )}

        {loading && profiles.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-2 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span>Searching academic profiles...</span>
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
            <p className="text-slate-700 font-bold text-base">No profiles found.</p>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              No profiles found matching your query. Try changing your search or filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-semibold inline-flex items-center space-x-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between group hover:border-indigo-300"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                      ID: {p.id}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {p.total_credits || 0} Fixed Credits
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {p.profile_name}
                    </h3>
                    <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                      <p className="line-clamp-1"><strong>University:</strong> {p.university}</p>
                      <p className="line-clamp-1"><strong>Faculty:</strong> {p.faculty}</p>
                      {p.department && (
                        <p className="line-clamp-1 text-slate-500"><strong>Department:</strong> {p.department}</p>
                      )}
                      {p.academic_year && (
                        <p className="line-clamp-1 text-slate-500"><strong>Academic Year:</strong> {p.academic_year}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-indigo-600">
                    {p.semester_count || 1} Semester(s)
                  </span>

                  <button
                    onClick={() => onOpenProfile(p.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-transform active:scale-95"
                  >
                    <span>Open Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
