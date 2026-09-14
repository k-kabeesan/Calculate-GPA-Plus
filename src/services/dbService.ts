import type { Profile, GradeOption, Semester } from '../types';
import { formatErrorMessage } from '../utils/formatError';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const globalProcess = (typeof globalThis !== 'undefined' && (globalThis as any).process) ? (globalThis as any).process.env : {};
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : globalProcess;

// Dynamic API Base URL: in Vercel production, relative '/api' is used; for external backends VITE_API_URL can be provided.
export const apiBase = (env.VITE_API_URL || '').replace(/\/+$/, '');
export const isSupabaseConfigured = true;

const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

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

// Clean extracted subject names automatically
export function cleanSubjectTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let title = rawTitle
    .replace(/\b(?:Room|Lab|LH|Venue|Hall|Building)\s*[-:\s]?\s*[A-Z0-9]+/gi, '')
    .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g, '')
    .replace(/\b(?:by\s+)?(?:Dr\.|Prof\.|Professor|Mr\.|Ms\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)\b/gi, '')
    .replace(/[\(\[\{]\s*(?:credit[s]?|cr|pts?|units?)?\s*[\)\]\}]/gi, '')
    .replace(/^[\s\-–—:•*#|.]+/, '')
    .replace(/[\s\-–—:•*#|.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip trailing hyphens, dashes, colons, extra spaces, or duplicate punctuation
  title = title.replace(/[\s\-–—:;,\.]*$/, '').trim();
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
  degrees: string[];
  academicYears: string[];
}> {
  try {
    const data = await safeFetchJson<any>(`${apiBase}/api/profiles/filters`);
    return {
      universities: data.universities || [],
      faculties: data.faculties || [],
      departments: data.departments || [],
      degrees: [],
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
          return { universities, faculties, departments, degrees: [], academicYears };
        }
      } catch {}
    }

    const local = getLocalProfiles();
    const universities = Array.from(new Set(local.map((p: any) => p.university).filter(Boolean))).sort();
    const faculties = Array.from(new Set(local.map((p: any) => p.faculty).filter(Boolean))).sort();
    const departments = Array.from(new Set(local.map((p: any) => p.department).filter(Boolean))).sort();
    const academicYears = Array.from(new Set(local.map((p: any) => p.academic_year).filter(Boolean))).sort().reverse();
    return { universities, faculties, departments, degrees: [], academicYears };
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
            id, profile_name, university, faculty, department, degree, academic_year, visibility, created_at,
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
    throw err;
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
          .select('id, profile_name, university, faculty, department, academic_year, description, visibility, created_at, updated_at, passcode_hash, password_hash')
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

          const storedHash = (profile as any).password_hash || (profile as any).passcode_hash || '';

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
  // Always force visibility to 'public' as per Requirement 1
  const payload = {
    ...profileData,
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
  } catch (err) {
    if (clientSupabase) {
      try {
        const profileId = generateProfileId();
        let passHash = '';
        if (payload.passcode) {
          const encoder = new TextEncoder();
          const dataBuf = encoder.encode(payload.passcode);
          const hashBuf = await crypto.subtle.digest('SHA-256', dataBuf);
          const hashArray = Array.from(new Uint8Array(hashBuf));
          passHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        const { error: pErr } = await clientSupabase.from('profiles').insert({
          id: profileId,
          profile_id: profileId,
          profile_name: payload.profile_name.trim(),
          university: (payload.university || '').trim(),
          faculty: (payload.faculty || '').trim(),
          department: (payload.department || '').trim(),
          degree: '',
          academic_year: (payload.academic_year || '').trim(),
          description: (payload.description || '').trim(),
          visibility: 'public',
          passcode_hash: passHash,
          password_hash: passHash
        });

        if (!pErr) {
          let semOrder = 1;
          for (const sem of payload.semesters || []) {
            const { data: semData, error: sErr } = await clientSupabase.from('semesters').insert({
              profile_id: profileId,
              semester_name: sem.semester_name || `Semester ${semOrder}`,
              semester_order: semOrder
            }).select('id').single();

            if (!sErr && semData) {
              const semId = semData.id;
              for (const sub of sem.subjects || []) {
                if (sub.subject_name && Number(sub.credit) >= 0) {
                  await clientSupabase.from('subjects').insert({
                    semester_id: semId,
                    subject_code: (sub as any).subject_code || '',
                    module_number: (sub as any).subject_code || '',
                    subject_name: sub.subject_name.trim(),
                    credit: Number(sub.credit)
                  });
                }
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
        }
      } catch {}
    }
    throw err;
  }

  throw new Error('Failed to create profile.');
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

export function extractProfileFallbackClient(inputText: string): any {
  const lines = inputText.split('\n').map(l => l.trim()).filter(Boolean);
  
  let profileName = '';
  let university = '';
  let faculty = '';
  let department = '';
  let academicYear = '';
  let semester = '';

  const subjects: Array<{ moduleNumber: string; subjectName: string; credit: number | null }> = [];

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
    if (!semester && /\b(Semester\s+[1-8]|Sem\s+[1-8]|Term\s+[1-4])\b/i.test(line)) {
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

    if (moduleNumber || (remainingLine && !/^(?:University|Faculty|Department|Semester|Academic Year|Grade|Point|Marks|Total|GPA|CGPA|Credit|Lecturer|Dr\.|Prof\.)/i.test(line))) {
      let credit: number | null = null;
      let subjectTitle = remainingLine || line;

      // Parse explicit credits before cleaning removes them.
      const explicitCreditMatch = subjectTitle.match(/(?:^|[-–—:|,\s])(\d+(?:\.\d+)?)\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)(?:$|[\)\s])/i);
      const trailingCreditMatch = subjectTitle.match(/[-–—:|]?\s*(\d+(?:\.\d+)?)\s*(?:credits?|cr|pts?)?\s*$/i);

      if (explicitCreditMatch && explicitCreditMatch[1] !== undefined) {
        const val = parseFloat(explicitCreditMatch[1]);
        if (!isNaN(val) && val >= 0 && val <= 12) {
          credit = val;
        }
      } else if (trailingCreditMatch && trailingCreditMatch[1] !== undefined && /(?:credits?|cr|pts?)/i.test(line)) {
        const val = parseFloat(trailingCreditMatch[1]);
        if (!isNaN(val) && val >= 0 && val <= 12) {
          credit = val;
          subjectTitle = subjectTitle.substring(0, trailingCreditMatch.index).trim();
        }
      }

      if (credit === null && moduleNumber) {
        const digits = moduleNumber.match(/\d/g);
        if (digits && digits.length > 0) {
          const lastDigitVal = parseInt(digits[digits.length - 1], 10);
          if (!isNaN(lastDigitVal)) {
            credit = lastDigitVal;
          }
        }
      }

      subjectTitle = cleanSubjectTitle(subjectTitle);

      if (!subjectTitle && moduleNumber) {
        subjectTitle = moduleNumber;
      }

      if (subjectTitle || moduleNumber) {
        subjects.push({
          moduleNumber,
          subjectName: subjectTitle,
          credit
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

export function normalizeExtractedProfileClient(raw: any) {
  if (!raw || typeof raw !== 'object') return extractProfileFallbackClient('');
  let profileName = raw.profileName || raw.profile_name || '';
  if (
    profileName === 'Not detected' ||
    /Academic Profile/i.test(profileName) ||
    /Semester\s*\d+/i.test(profileName) ||
    /University/i.test(profileName) ||
    /Faculty/i.test(profileName) ||
    /Department/i.test(profileName) ||
    /Bachelor|BSc|MSc|Master|Degree|Diploma/i.test(profileName)
  ) {
    profileName = '';
  }

  let university = raw.university === 'Not detected' ? '' : (raw.university || '');
  let faculty = raw.faculty === 'Not detected' ? '' : (raw.faculty || '');
  let department = raw.department === 'Not detected' ? '' : (raw.department || '');
  let academicYear = raw.academicYear || raw.academic_year || '';
  if (academicYear === 'Not detected') academicYear = '';
  let semester = raw.semester || '';
  if (semester === 'Not detected') semester = '';

interface ExtractedSubject {
  moduleNumber: string;
  subjectName: string;
  credit: number | null;
}

  let subjects: ExtractedSubject[] = [];

  const extractSubjectObj = (s: any): ExtractedSubject => {
    const mod = (s.moduleNumber || s.subject_code || s.code || '').trim();
    let name = (s.subjectName || s.subject_name || s.name || mod || '').trim();

    name = name
      .replace(/\b(?:by\s+)?(?:Dr\.|Prof\.|Professor|Mr\.|Ms\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi, '')
      .replace(/\b(?:Room|Lab|LH|Venue|Hall)\s*[-:\s]?\s*[A-Z0-9]+/gi, '')
      .trim();

    let cr: number | null = null;
    if (s.credit !== null && s.credit !== undefined && s.credit !== '' && !isNaN(Number(s.credit))) {
      cr = Number(s.credit);
    } else if (mod) {
      const digits = mod.match(/\d/g);
      if (digits && digits.length > 0) {
        const lastDigitVal = parseInt(digits[digits.length - 1], 10);
        if (!isNaN(lastDigitVal)) cr = lastDigitVal;
      }
    }

    return {
      moduleNumber: mod === 'Not detected' ? '' : mod,
      subjectName: name === 'Not detected' ? '' : name,
      credit: cr
    };
  };

  if (Array.isArray(raw.subjects)) {
    subjects = raw.subjects.map(extractSubjectObj).filter((s: ExtractedSubject) => s.moduleNumber || s.subjectName);
  } else if (Array.isArray(raw.semesters)) {
    raw.semesters.forEach((sem: any) => {
      if (!semester && sem.semester_name) {
        semester = sem.semester_name;
      }
      if (Array.isArray(sem.subjects)) {
        sem.subjects.forEach((s: any) => {
          const extractedSub = extractSubjectObj(s);
          if (extractedSub.moduleNumber || extractedSub.subjectName) {
            subjects.push(extractedSub);
          }
        });
      }
    });
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

export async function extractAiProfileFromImage(
  imageFile: File,
  onProgress?: (progressPct: number) => void
): Promise<any> {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (imageFile.type && !validTypes.includes(imageFile.type.toLowerCase())) {
    throw new Error('Invalid image format. Please upload a JPG, JPEG, PNG, or WEBP image.');
  }

  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
    });
    reader.readAsDataURL(imageFile);
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
    if (err.message && (err.message.includes('Unable to analyze') || err.message.includes('Invalid image'))) {
      throw err;
    }
    console.warn('Backend AI vision endpoint unavailable or failed, continuing to client-side OCR:', err);
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

    const { data: { text } } = await worker.recognize(imageFile);
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
    throw new Error('Unable to analyze the image. Please try again.');
  }
}

