import { normalizeImportedProfile } from '../utils/profileImport';
import type { Profile, GradeOption, Semester } from '../types';
import { formatErrorMessage } from '../utils/formatError';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const globalProcess = (typeof globalThis !== 'undefined' && (globalThis as any).process) ? (globalThis as any).process.env : {};
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : globalProcess;

// Dynamic API Base URL: in Vercel production, relative '/api' is used; for external backends VITE_API_URL can be provided.
export const apiBase = (env.VITE_API_URL || '').replace(/\/+$/, '');
export const isSupabaseConfigured = true;

const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  env.SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPAB_URL ||
  env.VITE_URL ||
  '';

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_KEY ||
  env.SUPAB_KEY ||
  env.VITE_SUPABASE_KEY ||
  env.VITE_KEY ||
  '';

let clientSupabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    clientSupabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('Client Supabase initialization failed:', err);
  }
}

// Generate permanent unique Profile ID (e.g. GPA-N301-A82F91)
export function generateProfileId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let part2 = '';
  for (let i = 0; i < 6; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GPA-${part1}-${part2}`;
}

// -------------------------------------------------------------
// Client-side Local Storage Adapter (For static hosting e.g. GitHub Pages)
// -------------------------------------------------------------
const LOCAL_PROFILES_KEY = 'calc_gpa_public_profiles';

export function getLocalProfiles(filters?: ProfileFilterParams): any[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
    let profiles: any[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(profiles)) return [];

    if (filters) {
      if (filters.search && filters.search.trim()) {
        const sTerm = filters.search.trim().toLowerCase();
        profiles = profiles.filter((p: any) => {
          const matchesDirect =
            (p.profile_name && p.profile_name.toLowerCase().includes(sTerm)) ||
            (p.university && p.university.toLowerCase().includes(sTerm)) ||
            (p.faculty && p.faculty.toLowerCase().includes(sTerm)) ||
            (p.department && p.department.toLowerCase().includes(sTerm)) ||
            (p.id && p.id.toLowerCase().includes(sTerm));
          if (matchesDirect) return true;
          return p.semesters && p.semesters.some((s: any) =>
            s.subjects && s.subjects.some((sub: any) =>
              (sub.subject_code && sub.subject_code.toLowerCase().includes(sTerm)) ||
              (sub.subject_name && sub.subject_name.toLowerCase().includes(sTerm))
            )
          );
        });
      }
      if (filters.university) profiles = profiles.filter(p => p.university === filters.university);
      if (filters.faculty) profiles = profiles.filter(p => p.faculty === filters.faculty);
      if (filters.department) profiles = profiles.filter(p => p.department === filters.department);
      if (filters.academicYear) profiles = profiles.filter(p => p.academic_year === filters.academicYear);
      if (filters.sort === 'university_asc') {
        profiles.sort((a, b) => (a.university || '').localeCompare(b.university || ''));
      } else if (filters.sort === 'faculty_asc') {
        profiles.sort((a, b) => (a.faculty || '').localeCompare(b.faculty || ''));
      } else {
        profiles.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }
    }
    return profiles;
  } catch {
    return [];
  }
}

export function saveLocalProfile(profile: any): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = getLocalProfiles();
    const idx = existing.findIndex(p => p.id === profile.id);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...profile, updated_at: new Date().toISOString() };
    } else {
      existing.unshift(profile);
    }
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(existing));
    localStorage.setItem(`calc_gpa_profile_${profile.id}`, JSON.stringify(profile));
  } catch {}
}

export function getLocalProfileById(id: string): any | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const direct = localStorage.getItem(`calc_gpa_profile_${id}`);
    if (direct) return JSON.parse(direct);
    const existing = getLocalProfiles();
    return existing.find(p => p.id === id) || null;
  } catch {
    return null;
  }
}

export function deleteLocalProfile(id: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = getLocalProfiles().filter(p => p.id !== id);
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(existing));
    localStorage.removeItem(`calc_gpa_profile_${id}`);
  } catch {}
}

// -------------------------------------------------------------
// Public API Service Methods (Dual-mode: Supabase / Express)
// -------------------------------------------------------------

// Timeout wrapper to guarantee queries never hang indefinitely
export async function withTimeout<T>(promise: Promise<T>, ms = 5000, fallbackErrMsg = 'Request timed out'): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(fallbackErrMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Safe JSON fetch wrapper that guards against HTML error pages and invalid responses
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackErrMsg = 'Unable to complete request'
): Promise<T> {
  let targetUrl = input;
  if (typeof targetUrl === 'string' && targetUrl.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location) {
      targetUrl = `${window.location.origin}${targetUrl}`;
    } else {
      const host = env.VITE_API_URL || `http://127.0.0.1:${env.PORT || 5002}`;
      targetUrl = `${host.replace(/\/+$/, '')}${targetUrl}`;
    }
  }

  const mergedInit: RequestInit = {
    ...init,
    headers: {
      'Accept': 'application/json',
      ...(init?.headers || {})
    }
  };

  let res: Response;
  try {
    res = await fetch(targetUrl, mergedInit);
  } catch (netErr: any) {
    throw new Error(`Network error: ${netErr?.message || 'Unable to connect to the server'}`);
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  let text = '';
  try {
    text = await res.text();
  } catch {
    throw new Error('Unable to read server response.');
  }

  // Detect HTML response (which happens when SPA / Vercel rewrites API calls to index.html)
  const isHtml = contentType.includes('text/html') || /^\s*<!doctype\s+html/i.test(text) || /<html[\s>]/i.test(text);

  if (isHtml) {
    throw new Error(
      `API endpoint misconfigured: Server returned HTML instead of JSON. The backend route was not reached or was rewritten to index.html.`
    );
  }

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Invalid JSON response received from server.');
  }

  if (!res.ok || data?.success === false) {
    const errorMsg = formatErrorMessage(data, fallbackErrMsg || `Request failed with status ${res.status}`);
    throw new Error(errorMsg);
  }

  return data as T;
}

// Clean extracted subject names automatically according to strict academic rules
export function cleanSubjectTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let title = rawTitle
    // 1. Remove room numbers and building/venue markers e.g. N3-04, N3-01, LH-1, Lab 2, Room 101
    .replace(/\b[A-Z]{1,3}\s*[-–—:]\s*\d{1,4}\b/g, '')
    .replace(/\b(?:Room|LH|Venue|Hall|Building|Campus|Classroom|Block)\s*[-:\s]?\s*[A-Z0-9]+\b/gi, '')
    .replace(/\bLab\s*[-:\s]?\s*\d+\b/gi, '')
    // 2. Remove lecturer names with titles (Dr., Prof., Mr., Ms., Mrs., Professor, Doctor, Lecturer, Instructor)
    .replace(/\b(?:by\s+)?(?:Dr\.|Prof\.|Professor|Doctor|Mr\.|Ms\.|Mrs\.|Lecturer|Instructor|Teacher)\s+[A-Z][a-zA-Z'\-]*(?:\s+[A-Z][a-zA-Z'\-]*)*/gi, '')
    // 3. Remove timetable times, days, periods e.g. 8:00 AM, 12:30, Monday, Tuesday
    .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g, '')
    .replace(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi, '')
    // 4. Remove timetable indicators e.g. (P), (T), (E), (L), [P], [T], Practical, Tutorial, Lecture, Exam
    .replace(/[\(\[\{]\s*(?:P|T|E|L|Practical|Tutorial|Lecture|Exam)\s*[\)\]\}]/gi, '')
    .replace(/\b(?:Practical\s+Session|Tutorial\s+Session|Lecture\s+Session|Exam\s+Session|Group\s*\d+|Batch\s*\d+)\b/gi, '')
    // 5. Remove explicit credit expressions e.g. 3.0 Credits, 3 cr, 2.0
    .replace(/\b\d+(?:\.\d+)?\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)\b/gi, '')
    .replace(/[\(\[\{]\s*(?:credit[s]?|cr|pts?|units?)?\s*[\)\]\}]/gi, '')
    // 6. Remove leading/trailing hyphens, dashes, colons, bullets, punctuation
    .replace(/^[\s\-–—:•*#|.]+/, '')
    .replace(/[\s\-–—:•*#|.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return title;
}

export interface ProfileFilterParams {
  search?: string;
  university?: string;
  faculty?: string;
  department?: string;
  academicYear?: string;
  semester?: string;
  sort?: 'newest' | 'university_asc' | 'faculty_asc';
}

export async function fetchFilterOptions(): Promise<{
  universities: string[];
  faculties: string[];
  departments: string[];
  academicYears: string[];
}> {
  try {
    const data = await safeFetchJson<any>(`${apiBase}/api/profiles/filters`);
    return {
      universities: data.universities || [],
      faculties: data.faculties || [],
      departments: data.departments || [],
      academicYears: data.academicYears || []
    };
  } catch {
    if (clientSupabase) {
      try {
        const { data } = await clientSupabase
          .from('profiles')
          .select('university, faculty, department, academic_year')
          .eq('visibility', 'public')
          .limit(200);

        if (data) {
          const universities = Array.from(new Set(data.map(p => p.university).filter(Boolean))).sort();
          const faculties = Array.from(new Set(data.map(p => p.faculty).filter(Boolean))).sort();
          const departments = Array.from(new Set(data.map(p => p.department).filter(Boolean))).sort();
          const academicYears = Array.from(new Set(data.map(p => p.academic_year).filter(Boolean))).sort().reverse();
          return { universities, faculties, departments, academicYears };
        }
      } catch {}
    }

    const local = getLocalProfiles();
    const universities = Array.from(new Set(local.map((p: any) => p.university).filter(Boolean))).sort();
    const faculties = Array.from(new Set(local.map((p: any) => p.faculty).filter(Boolean))).sort();
    const departments = Array.from(new Set(local.map((p: any) => p.department).filter(Boolean))).sort();
    const academicYears = Array.from(new Set(local.map((p: any) => p.academic_year).filter(Boolean))).sort().reverse();
    return { universities, faculties, departments, academicYears };
  }
}

export async function fetchPublicProfiles(paramsOrQuery: string | ProfileFilterParams = ''): Promise<any[]> {
  const filters: ProfileFilterParams = typeof paramsOrQuery === 'string'
    ? { search: paramsOrQuery }
    : paramsOrQuery;

  const searchParams = new URLSearchParams();
  if (filters.search) searchParams.set('search', filters.search);
  if (filters.university) searchParams.set('university', filters.university);
  if (filters.faculty) searchParams.set('faculty', filters.faculty);
  if (filters.department) searchParams.set('department', filters.department);
  if (filters.academicYear) searchParams.set('academic_year', filters.academicYear);
  if (filters.semester) searchParams.set('semester', filters.semester);
  if (filters.sort) searchParams.set('sort', filters.sort);

  const queryString = searchParams.toString();
  const url = queryString ? `${apiBase}/api/profiles?${queryString}` : `${apiBase}/api/profiles`;
  
  try {
    const data = await safeFetchJson<any>(url, undefined, 'Failed to fetch profiles. Please try again.');
    if (data && Array.isArray(data.profiles)) {
      return data.profiles;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err) {
    if (clientSupabase) {
      try {
        let query = clientSupabase
          .from('profiles')
          .select(`
            id, profile_name, university, faculty, department, academic_year, visibility, created_at,
            semesters (
              id, semester_name, semester_order,
              subjects (
                id, subject_code, subject_name, credit
              )
            )
          `)
          .eq('visibility', 'public')
          .limit(50);

        if (filters.sort === 'university_asc') {
          query = query.order('university', { ascending: true }).order('profile_name', { ascending: true });
        } else if (filters.sort === 'faculty_asc') {
          query = query.order('faculty', { ascending: true }).order('profile_name', { ascending: true });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        if (filters.search && filters.search.trim()) {
          const term = `%${filters.search.trim()}%`;
          query = query.or(`profile_name.ilike.${term},university.ilike.${term},faculty.ilike.${term},department.ilike.${term},id.ilike.${term}`);
        }
        if (filters.university) query = query.eq('university', filters.university.trim());
        if (filters.faculty) query = query.eq('faculty', filters.faculty.trim());
        if (filters.department) query = query.eq('department', filters.department.trim());
        if (filters.academicYear) query = query.eq('academic_year', filters.academicYear.trim());

        const { data, error: supaErr } = await query;
        if (!supaErr && data) {
          let results = (data || []).map((p: any) => {
            let totalSubjects = 0;
            let totalCredits = 0;
            const sems = p.semesters || [];
            sems.forEach((sem: any) => {
              const subs = sem.subjects || [];
              totalSubjects += subs.length;
              subs.forEach((sub: any) => {
                totalCredits += Number(sub.credit || 0);
              });
            });
            return {
              ...p,
              semester_count: sems.length,
              total_subjects: totalSubjects,
              total_credits: Math.round(totalCredits * 100) / 100
            };
          });

          if (filters.semester && filters.semester.trim()) {
            const semTerm = filters.semester.trim().toLowerCase();
            results = results.filter((p: any) =>
              p.semesters && p.semesters.some((s: any) =>
                (s.semester_name && s.semester_name.toLowerCase().includes(semTerm)) ||
                (s.semester_order && String(s.semester_order) === semTerm)
              )
            );
          }
          return results;
        }
      } catch {}
    }

    const localProfiles = getLocalProfiles(filters);
    if (localProfiles.length > 0) {
      return localProfiles;
    }
    return [];
  }
}

export async function fetchProfileById(profileId: string): Promise<Profile> {
  const cleanId = profileId.trim().toUpperCase();

  try {
    const data = await safeFetchJson<any>(`${apiBase}/api/profiles/${cleanId}`, undefined, 'Profile not found. Please check the Profile ID or link.');
    if (data && data.profile) {
      return data.profile;
    }
    if (data && data.id) {
      return data;
    }
  } catch (err) {
    if (clientSupabase) {
      try {
        const { data: profile, error: pErr } = await clientSupabase
          .from('profiles')
          .select('id, profile_name, university, faculty, department, academic_year, description, visibility, created_at, updated_at, passcode_hash')
          .eq('id', cleanId)
          .single();

        if (!pErr && profile) {
          const { data: semesters } = await clientSupabase
            .from('semesters')
            .select('id, semester_name, semester_order')
            .eq('profile_id', cleanId)
            .order('semester_order', { ascending: true });

          const formattedSemesters: any[] = [];
          for (const sem of semesters || []) {
            const { data: subjects } = await clientSupabase
              .from('subjects')
              .select('id, subject_code, subject_name, credit')
              .eq('semester_id', sem.id)
              .order('id', { ascending: true });

            formattedSemesters.push({
              id: sem.id,
              semester_name: sem.semester_name,
              semester_order: sem.semester_order,
              subjects: (subjects || []).map((sub: any) => ({
                id: sub.id,
                subject_code: sub.subject_code || '',
                subject_name: sub.subject_name,
                credit: Number(sub.credit)
              }))
            });
          }

          const { data: scales } = await clientSupabase
            .from('grading_scales')
            .select('grade, grade_point')
            .eq('profile_id', cleanId)
            .order('grade_point', { ascending: false });

          const storedHash = (profile as any).passcode_hash || '';

          return {
            id: profile.id,
            profile_name: profile.profile_name,
            university: profile.university,
            faculty: profile.faculty,
            department: profile.department || '',
            academic_year: profile.academic_year || '',
            description: profile.description || '',
            visibility: profile.visibility || 'public',
            has_passcode: Boolean(storedHash && storedHash.length > 0),
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            semesters: formattedSemesters,
            gradingScale: scales || []
          };
        }
      } catch {}
    }

    const local = getLocalProfileById(cleanId);
    if (local) return local;
    throw err;
  }

  throw new Error('Profile not found. Please check the Profile ID or link.');
}

export function extractProfileFallbackClient(inputText: string): any {
  const lines = inputText.split('\n').map(l => l.trim()).filter(Boolean);
  
  let profileName = '';
  let university = '';
  let faculty = '';
  let department = '';
  let academicYear = '';
  let semester = '';

  const subjects: Array<{ moduleNumber: string; subjectName: string; credit: number | null; semester: string }> = [];
  const seenCodes = new Set<string>();

  for (const line of lines) {
    if (/^(?:Dr\.|Prof\.|Professor|Doctor|Lecturer|Instructor|Teacher|Taught\s+by|Staff|Email|Phone|Tel|Contact|Room|Lab|LH|Venue|Building|Time|Day|Date|Page\s*\d+)/i.test(line)) {
      continue;
    }
    if (/\b(?:@|http|www\.|AM|PM|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(line) && !/^[A-Z]{2,6}\s*[-–—]?\s*\d{3,5}/i.test(line)) {
      continue;
    }

    if (/^(?:PROFILE\s*NAME|PROFILE)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:PROFILE\s*NAME|PROFILE)\s*:\s*(.+)/i);
      if (match && match[1]) profileName = match[1].trim();
      continue;
    }
    if (/^(?:UNIVERSITY|UNI|INSTITUTION)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:UNIVERSITY|UNI|INSTITUTION)\s*:\s*(.+)/i);
      if (match && match[1]) university = match[1].trim();
      continue;
    }
    if (/^(?:FACULTY|SCHOOL|COLLEGE)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:FACULTY|SCHOOL|COLLEGE)\s*:\s*(.+)/i);
      if (match && match[1]) faculty = match[1].trim();
      continue;
    }
    if (/^(?:DEPARTMENT|DEPT)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:DEPARTMENT|DEPT)\s*:\s*(.+)/i);
      if (match && match[1]) department = match[1].trim();
      continue;
    }
    if (/^(?:ACADEMIC\s*YEAR|YEAR|BATCH)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:ACADEMIC\s*YEAR|YEAR|BATCH)\s*:\s*(.+)/i);
      if (match && match[1]) academicYear = match[1].trim();
      continue;
    }
    if (/^(?:SEMESTER|TERM)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:SEMESTER|TERM)\s*:\s*(.+)/i);
      if (match && match[1]) semester = match[1].toLowerCase().startsWith('semester') ? match[1].trim() : `Semester ${match[1].trim()}`;
      continue;
    }

    if (!university && /^(?:University|Institute|College|Academy)\b/i.test(line)) {
      university = line.trim();
      continue;
    }
    if (!faculty && /^(?:Faculty|School)\s+of\b/i.test(line)) {
      faculty = line.trim();
      continue;
    }
    if (!department && /^(?:Department|Dept\.)\s+of\b/i.test(line)) {
      department = line.trim();
      continue;
    }
    if (!academicYear && /\b(20\d{2}[-/]20\d{2}|Year\s+[1-5]|Academic\s+Year\s+\d+)\b/i.test(line)) {
      const match = line.match(/\b(20\d{2}[-/]20\d{2}|Year\s+[1-5]|Academic\s+Year\s+\d+)\b/i);
      if (match) academicYear = match[1].trim();
      continue;
    }
    if (/\b(Semester\s+[1-8]|Sem\s+[1-8]|Term\s+[1-4])\b/i.test(line)) {
      const match = line.match(/\b(Semester\s+[1-8]|Sem\s+[1-8]|Term\s+[1-4])\b/i);
      if (match) semester = match[1].trim();
      continue;
    }

    if (/^(?:SUBJECTS|MODULES|COURSES|INSTRUCTIONS?|NOTES?|TIMETABLE|RESULTS?|GRADES?|SYLLABUS|COURSE OUTLINE|MODULE LIST|SL\.\s*NO|SR\.\s*NO|MODULE CODE|SUBJECT NAME|CREDITS?)\s*:?$/i.test(line)) {
      continue;
    }

    const codeMatch = line.match(/^([A-Z]{2,6}\s*[-–—]?\s*\d{3,5}[A-Z]?)\b\s*[-–—:|]?\s*(.*)$/i);
    let moduleNumber = '';
    let remainingLine = '';

    if (codeMatch) {
      moduleNumber = codeMatch[1].replace(/\s+/g, '').toUpperCase();
      remainingLine = codeMatch[2].trim();
    } else {
      const inlineCodeMatch = line.match(/\b([A-Z]{2,6}\s*[-–—]?\s*\d{3,5}[A-Z]?)\b/i);
      if (inlineCodeMatch) {
        moduleNumber = inlineCodeMatch[1].replace(/\s+/g, '').toUpperCase();
        remainingLine = line.replace(inlineCodeMatch[0], '').replace(/^[-–—:|]+/, '').trim();
      }
    }

    if (moduleNumber) {
      if (seenCodes.has(semester + ':' + moduleNumber)) continue; // Requirement 8: De-duplicate duplicate module entries
    }

    if (moduleNumber || (remainingLine && !/^(?:University|Faculty|Department|Semester|Academic Year|Grade|Point|Marks|Total|GPA|CGPA|Credit|Lecturer|Dr\.|Prof\.)/i.test(line))) {
      let credit: number | null = null;
      let subjectTitle = remainingLine || line;

      // Priority 1: Explicit credit in text
      const explicitCreditMatch = subjectTitle.match(/(?:^|[-–—:|,\s])(\d+(?:\.\d+)?)\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)(?:$|[\)\s])/i);
      if (explicitCreditMatch && explicitCreditMatch[1] !== undefined) {
        const val = parseFloat(explicitCreditMatch[1]);
        if (!isNaN(val) && val >= 0 && val <= 12) credit = val;
      }

      subjectTitle = cleanSubjectTitle(subjectTitle);

      if (!subjectTitle && moduleNumber) {
        subjectTitle = moduleNumber;
      }

      if (subjectTitle || moduleNumber) {
        if (moduleNumber) seenCodes.add(semester + ':' + moduleNumber);
        subjects.push({
          moduleNumber,
          subjectName: subjectTitle,
          credit, semester
        });
      }
    }
  }

  return {
    profileName,
    university,
    faculty,
    department,
    academicYear,
    semester,
    subjects
  };
}

export function normalizeExtractedProfileClient(raw: any) { return normalizeImportedProfile(raw, cleanSubjectTitle); }

export async function createProfile(profileData: {
  profile_name: string;
  university?: string;
  faculty?: string;
  department?: string;
  degree?: string;
  academic_year?: string;
  description?: string;
  visibility?: 'public' | 'shared' | 'private';
  passcode?: string;
  semesters: Semester[];
  gradingScale?: GradeOption[];
}): Promise<{ id: string }> {
  // Requirement 2: Profile Name is required
  if (!profileData.profile_name || !profileData.profile_name.trim()) {
    throw new Error('Profile name is required.');
  }

  // Requirement 3: Owner passcode is required
  if (!profileData.passcode || !profileData.passcode.trim()) {
    throw new Error('Owner edit passcode is required.');
  }

  // Requirement 6: Validate every subject has valid credit
  for (const sem of profileData.semesters || []) {
    for (const sub of sem.subjects || []) {
      const code = ((sub as any).subject_code || (sub as any).module_number || '').trim();
      const name = (sub.subject_name || '').trim();
      if (code || name) {
        const isCreditMissing = (sub.credit as any) === '' || sub.credit === null || sub.credit === undefined || isNaN(Number(sub.credit)) || Number(sub.credit) < 0;
        if (isCreditMissing) {
          throw new Error('Credit is required for every subject.');
        }
      }
    }
  }

  // Always force visibility to 'public' as per Requirement 9
  const payload = {
    ...profileData,
    profile_name: profileData.profile_name.trim(),
    passcode: profileData.passcode.trim(),
    visibility: 'public' as const
  };

  try {
    const data = await safeFetchJson<{ success?: boolean; id: string; error?: string }>(
      `${apiBase}/api/profiles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      'Failed to create profile.'
    );

    if (data && data.id) {
      saveLocalProfile({
        ...Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'passcode')),
        id: data.id,
        created_at: new Date().toISOString(),
        total_credits: (payload.semesters || []).reduce((acc, sem) => 
          acc + (sem.subjects || []).reduce((sAcc, sub) => sAcc + Number(sub.credit || 0), 0), 0),
        total_subjects: (payload.semesters || []).reduce((acc, sem) => acc + (sem.subjects || []).length, 0),
        semester_count: (payload.semesters || []).length
      });
      return { id: data.id };
    }
  } catch (err: any) {
    if (clientSupabase) {
      try {
        const profileId = generateProfileId();
        
        // Hash passcode using SHA-256
        const encoder = new TextEncoder();
        const dataBuf = encoder.encode(payload.passcode);
        const hashBuf = await crypto.subtle.digest('SHA-256', dataBuf);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        const passHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Direct table insert with exact existing columns in Supabase
        const { error: pErr } = await clientSupabase.from('profiles').insert({
          id: profileId,
          profile_name: payload.profile_name,
          university: (payload.university || '').trim(),
          faculty: (payload.faculty || '').trim(),
          degree: (payload.degree || '').trim(),
          academic_year: (payload.academic_year || '').trim(),
          description: (payload.description || '').trim(),
          visibility: 'public',
          passcode_hash: passHash
        });

        if (pErr) {
          console.error('Supabase error inserting profile:', {
            code: pErr.code,
            message: pErr.message,
            details: pErr.details,
            hint: pErr.hint
          });
          const formatted = formatErrorMessage(pErr, 'Unable to create profile. Please check your profile data and try again.');
          throw new Error(formatted);
        }

        let semOrder = 1;
        for (const sem of payload.semesters || []) {
          const { data: semData, error: sErr } = await clientSupabase.from('semesters').insert({
            profile_id: profileId,
            semester_name: sem.semester_name || `Semester ${semOrder}`,
            semester_order: semOrder
          }).select('id').single();

          if (sErr || !semData) {
            console.error('Supabase error inserting semester:', {
              code: sErr?.code,
              message: sErr?.message,
              details: sErr?.details,
              hint: sErr?.hint
            });
            // Cleanup orphan profile
            await clientSupabase.from('profiles').delete().eq('id', profileId);
            const formatted = formatErrorMessage(sErr, 'Unable to save semesters for profile.');
            throw new Error(formatted);
          }

          const semId = semData.id;
          for (const sub of sem.subjects || []) {
            const subCode = (sub as any).subject_code || (sub as any).module_number || '';
            const subName = sub.subject_name ? sub.subject_name.trim() : subCode;
            const creditVal = Number(sub.credit);

            const { error: subErr } = await clientSupabase.from('subjects').insert({
              semester_id: semId,
              subject_code: subCode,
              subject_name: subName,
              credit: creditVal
            });

            if (subErr) {
              console.error('Supabase error inserting subject:', {
                code: subErr.code,
                message: subErr.message,
                details: subErr.details,
                hint: subErr.hint
              });
              // Cleanup orphan profile
              await clientSupabase.from('profiles').delete().eq('id', profileId);
              const formatted = formatErrorMessage(subErr, 'Unable to save subjects for profile.');
              throw new Error(formatted);
            }
          }
          semOrder++;
        }

        saveLocalProfile({
          ...payload,
          id: profileId,
          created_at: new Date().toISOString()
        });

        return { id: profileId };
      } catch (clientErr: any) {
        throw new Error(formatErrorMessage(clientErr, 'Unable to create profile. Please check your profile data and try again.'));
      }
    }
    throw new Error(formatErrorMessage(err, 'Unable to create profile. Please check your profile data and try again.'));
  }

  throw new Error('Unable to create profile. Please check your profile data and try again.');
}

export async function verifyOwnerPasscode(profileId: string, passcode: string): Promise<boolean> {
  const cleanId = profileId.trim().toUpperCase();

  try {
    const data = await safeFetchJson<{ success?: boolean; valid: boolean; error?: string }>(
      `${apiBase}/api/profiles/${cleanId}/verify-passcode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      }
    );
    return Boolean(data.valid);
  } catch {
    if (clientSupabase) {
      try {
        const { data: p } = await clientSupabase
          .from('profiles')
          .select('passcode_hash, password_hash')
          .eq('id', cleanId)
          .single();

        if (p) {
          const hash = p.password_hash || p.passcode_hash || '';
          if (!hash) return true;
          const encoder = new TextEncoder();
          const dataBuf = encoder.encode(passcode || '');
          const hashBuf = await crypto.subtle.digest('SHA-256', dataBuf);
          const hashArray = Array.from(new Uint8Array(hashBuf));
          const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          return hash === inputHash;
        }
      } catch {}
    }
    return false;
  }
}

export async function updateProfile(
  profileId: string,
  passcode: string,
  updateData: {
    profile_name: string;
    university: string;
    faculty: string;
    department?: string;
    degree?: string;
    academic_year?: string;
    description?: string;
    visibility?: 'public' | 'shared' | 'private';
    semesters: Semester[];
    gradingScale?: GradeOption[];
  }
): Promise<boolean> {
  const cleanId = profileId.trim().toUpperCase();

  await safeFetchJson(
    `${apiBase}/api/profiles/${cleanId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, ...updateData })
    },
    'Failed to update profile.'
  );
  saveLocalProfile({ ...updateData, id: cleanId, updated_at: new Date().toISOString() });
  return true;
}

export async function deleteProfile(profileId: string, passcode: string): Promise<boolean> {
  const cleanId = profileId.trim().toUpperCase();

  await safeFetchJson(
    `${apiBase}/api/profiles/${cleanId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    },
    'Failed to delete profile.'
  );
  deleteLocalProfile(cleanId);
  return true;
}



export async function safeFetchJsonResponse(res: Response): Promise<any> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    throw new Error('The AI response was incomplete. Please try again.');
  }

  if (!text || !text.trim()) {
    throw new Error('The AI response was incomplete. Please try again.');
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The AI response was incomplete. Please try again.');
  }

  if (!res.ok) {
    const errorMsg = data && typeof data === 'object' && data.error ? data.error : 'The AI response was incomplete. Please try again.';
    throw new Error(errorMsg);
  }

  return data;
}

export async function extractAiProfile(text: string): Promise<any> {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Please paste university or course text to analyze.');
  }

  try {
    const res = await fetch(`${apiBase}/api/ai/extract-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await safeFetchJsonResponse(res);
    if (data && data.success && data.profile) {
      const normalized = normalizeExtractedProfileClient(data.profile);
      if (normalized && normalized.subjects && normalized.subjects.length > 0) {
        return normalized;
      }
    } else if (data && data.error) {
      throw new Error(data.error);
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('incomplete') || err.message.includes('required') || err.message.includes('Please'))) {
      const fallback = extractProfileFallbackClient(text);
      if (fallback && fallback.subjects && fallback.subjects.length > 0) {
        return fallback;
      }
      throw err;
    }
    console.warn('Backend AI endpoint fetch failed, trying client-side fallback:', err);
  }

  const fallback = extractProfileFallbackClient(text);
  if (fallback && fallback.subjects && fallback.subjects.length > 0) {
    return fallback;
  }
  throw new Error('The AI response was incomplete. Please try again.');
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('latin1');
    const pdfText = decoder.decode(bytes);

    // Extract text strings inside brackets e.g. (Text) Tj or (Text) TJ
    const TjMatches = pdfText.match(/\(([^()]+)\)\s*Tj/g) || [];
    const TJMatches = pdfText.match(/\[([^\]]+)\]\s*TJ/g) || [];

    let extractedLines: string[] = [];

    for (const m of TjMatches) {
      const clean = m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
      if (clean && clean.length > 1) extractedLines.push(clean);
    }

    for (const m of TJMatches) {
      const parts = m.match(/\(([^()]+)\)/g) || [];
      const clean = parts.map(p => p.replace(/[()]/g, '')).join(' ').trim();
      if (clean && clean.length > 1) extractedLines.push(clean);
    }

    if (extractedLines.length === 0) {
      const asciiLines = pdfText.match(/[A-Z0-9\s.,\-:()/]{4,}/gi) || [];
      extractedLines = asciiLines.map(l => l.trim()).filter(l => l.length > 3);
    }

    return extractedLines.join('\n');
  } catch {
    throw new Error('Unable to read PDF file content. Please try pasting the course text directly.');
  }
}

export async function extractAiProfileFromFile(
  file: File,
  onProgress?: (progressPct: number) => void
): Promise<any> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const isImage = file.type ? validImageTypes.includes(file.type.toLowerCase()) : false;

  if (!isPdf && !isImage) {
    throw new Error('Invalid file format. Please upload a PDF document or a JPG, JPEG, PNG, or WEBP image.');
  }

  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
    });
    reader.readAsDataURL(file);
    const base64Data = await base64Promise;

    onProgress?.(20);

    const res = await fetch(`${apiBase}/api/ai/extract-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Data })
    });

    const text = await res.text().catch(() => '');
    if (text && text.trim()) {
      try {
        const data = JSON.parse(text);
        if (data.success && data.profile && data.profile.subjects && data.profile.subjects.length > 0) {
          onProgress?.(100);
          return normalizeExtractedProfileClient(data.profile);
        } else if (data.error && res.ok === false) {
          throw new Error(data.error);
        }
      } catch (jsonErr: any) {
        if (jsonErr.message && jsonErr.message.includes('Unable to analyze')) {
          throw jsonErr;
        }
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('Unable to analyze') || err.message.includes('Invalid file'))) {
      throw err;
    }
    console.warn('Backend AI vision endpoint unavailable or failed, continuing to client-side fallback:', err);
  }

  if (isPdf) {
    onProgress?.(50);
    const pdfText = await extractTextFromPdfFile(file);
    onProgress?.(90);
    if (pdfText && pdfText.trim()) {
      const profile = await extractAiProfile(pdfText);
      onProgress?.(100);
      return profile;
    }
    throw new Error('Unable to analyze the PDF file. Please try pasting the course text directly.');
  }

  onProgress?.(30);
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && m.progress) {
          const pct = 30 + Math.round(m.progress * 60);
          onProgress?.(pct);
        }
      }
    });

    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();

    onProgress?.(95);

    if (!text || !text.trim()) {
      throw new Error('Unable to analyze the image. Please try again.');
    }

    const profile = await extractAiProfile(text);
    onProgress?.(100);
    return profile;
  } catch (err: any) {
    console.error('Vision OCR processing error:', err);
    throw new Error('Unable to analyze the file. Please try again.');
  }
}

export const extractAiProfileFromImage = extractAiProfileFromFile;


