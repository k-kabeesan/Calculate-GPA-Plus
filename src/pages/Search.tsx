import { useEffect, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { api } from '../services/api';
import type { ProfileFilters, SearchResult } from '../domain/model';
import { Empty, Loading, Notice, PageHead } from '../components/ui';

export function SearchPage() {
  const [filters, setFilters] = useState<ProfileFilters>({ page: 1 });
  const [options, setOptions] = useState({ universities: [] as string[], faculties: [] as string[], departments: [] as string[], degrees: [] as string[], academicYears: [] as string[] });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.filters().then(setOptions).catch(() => undefined); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      api.search(filters).then(data => { if (!controller.signal.aborted) setResult(data); }).catch(error => { if (!controller.signal.aborted) setError(error.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, filters.search ? 300 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [filters]);
  const change = (key: keyof ProfileFilters, value: string) => setFilters(current => ({ ...current, [key]: value, page: 1 }));
  return <div className="container search-page"><PageHead eyebrow="PUBLIC ACADEMIC PROFILES" title="Search Profiles">Find a shared module list and explore its semesters and subjects.</PageHead>
    <section className="panel search-form"><div className="search-input"><SearchIcon size={19} /><input aria-label="Search profiles" placeholder="Search profile, university, or module" value={filters.search || ''} onChange={event => change('search', event.target.value)} /></div>
      <div className="filter-grid">{([['university', 'University', 'universities', options.universities], ['faculty', 'Faculty', 'faculties', options.faculties], ['department', 'Department', 'departments', options.departments], ['degree', 'Degree', 'degrees', options.degrees], ['academicYear', 'Academic year', 'academic years', options.academicYears]] as const).map(([key, label, plural, values]) => <label key={key}>{label}<select value={filters[key] || ''} onChange={event => change(key, event.target.value)}><option value="">All {plural}</option>{values.map(value => <option key={value}>{value}</option>)}</select></label>)}
        <label>Semester<input value={filters.semester || ''} onChange={event => change('semester', event.target.value)} placeholder="Any semester" /></label></div>
      <button className="button button-ghost" onClick={() => setFilters({ page: 1 })}>Clear filters</button></section>
    <div className="results-heading"><h2>Results</h2>{result && !error && <span>{result.total} profile{result.total === 1 ? '' : 's'} found</span>}</div>
    {loading ? <Loading label="Searching profiles…" /> : error ? <Notice kind="error">{error} <button className="text-button" onClick={() => setFilters(current => ({ ...current }))}>Retry</button></Notice> : result?.profiles.length ? <><div className="profile-grid">{result.profiles.map(profile => <a className="profile-card" href={`#/profile/${profile.id}`} key={profile.id}><span className="eyebrow">{profile.academicYear || 'ACADEMIC PROFILE'}</span><h3>{profile.name}</h3><p>{profile.university}</p><p>{profile.faculty}{profile.department && ` · ${profile.department}`}{profile.degree && ` · ${profile.degree}`}</p><div className="profile-card-foot"><span>{profile.semesterCount} semester{profile.semesterCount === 1 ? '' : 's'} · {profile.subjectCount} subject{profile.subjectCount === 1 ? '' : 's'}</span><strong>View profile →</strong></div></a>)}</div>
      <div className="pagination"><button className="button button-soft" disabled={(filters.page || 1) <= 1} onClick={() => setFilters(current => ({ ...current, page: (current.page || 1) - 1 }))}>Previous</button><span>Page {result.page}</span><button className="button button-soft" disabled={result.page * result.pageSize >= result.total} onClick={() => setFilters(current => ({ ...current, page: (current.page || 1) + 1 }))}>Next</button></div></> : <Empty title="No matching profiles found">Try another name or clear the filters.</Empty>}
  </div>;
}
