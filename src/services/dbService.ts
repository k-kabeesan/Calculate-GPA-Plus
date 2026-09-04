import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Profile, GradeOption, Semester } from '../types';
import { DEFAULT_GRADING_SCALE } from '../utils/gpa';

const globalProcess = (typeof globalThis !== 'undefined' && (globalThis as any).process) ? (globalThis as any).process.env : {};
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : globalProcess;
const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabase: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// Generate readable 6-character profile ID (e.g., ABC123, WUSL77)
function generateProfileId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Client-side SHA-256 hash helper using Web Crypto API
async function hashPasscode(passcode: string): Promise<string> {
  if (!passcode) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
  if (isSupabaseConfigured && supabase) {
    try {
      const res: any = await withTimeout(
        supabase
          .from('profiles')
          .select('university, faculty, department, academic_year')
          .eq('visibility', 'public') as any,
        5000
      );
      const data: any[] = res?.data || [];

      const universities: string[] = Array.from(new Set(data.map((p: any) => p.university).filter(Boolean)));
      universities.sort();
      const faculties: string[] = Array.from(new Set(data.map((p: any) => p.faculty).filter(Boolean)));
      faculties.sort();
      const departments: string[] = Array.from(new Set(data.map((p: any) => p.department).filter(Boolean)));
      departments.sort();
      const academicYears: string[] = Array.from(new Set(data.map((p: any) => p.academic_year).filter(Boolean)));
      academicYears.sort().reverse();

      return { universities, faculties, departments, degrees: [], academicYears };
    } catch {
      // Fallback to Express backend
    }
  }

  try {
    const res = await fetch('/api/profiles/filters');
    if (!res.ok) return { universities: [], faculties: [], departments: [], degrees: [], academicYears: [] };
    const data = await res.json();
    return {
      universities: data.universities || [],
      faculties: data.faculties || [],
      departments: data.departments || [],
      degrees: [],
      academicYears: data.academicYears || []
    };
  } catch {
    return { universities: [], faculties: [], departments: [], degrees: [], academicYears: [] };
  }
}

export async function fetchPublicProfiles(paramsOrQuery: string | ProfileFilterParams = ''): Promise<any[]> {
  const filters: ProfileFilterParams = typeof paramsOrQuery === 'string'
    ? { search: paramsOrQuery }
    : paramsOrQuery;

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
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
      if (filters.university) query = query.eq('university', filters.university);
      if (filters.faculty) query = query.eq('faculty', filters.faculty);
      if (filters.department) query = query.eq('department', filters.department);
      if (filters.academicYear) query = query.eq('academic_year', filters.academicYear);

      const queryRes: any = await withTimeout(query as any, 5000);
      let data: any = queryRes?.data;
      let error: any = queryRes?.error;
      if (error && (error.message.includes('department') || error.message.includes('schema cache'))) {
        let fallbackQuery = supabase
          .from('profiles')
          .select(`
            id, profile_name, university, faculty, academic_year, visibility, created_at,
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
          fallbackQuery = fallbackQuery.order('university', { ascending: true });
        } else if (filters.sort === 'faculty_asc') {
          fallbackQuery = fallbackQuery.order('faculty', { ascending: true });
        } else {
          fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
        }

        if (filters.search && filters.search.trim()) {
          const term = `%${filters.search.trim()}%`;
          fallbackQuery = fallbackQuery.or(`profile_name.ilike.${term},university.ilike.${term},faculty.ilike.${term},id.ilike.${term}`);
        }
        if (filters.university) fallbackQuery = fallbackQuery.eq('university', filters.university);
        if (filters.faculty) fallbackQuery = fallbackQuery.eq('faculty', filters.faculty);
        if (filters.academicYear) fallbackQuery = fallbackQuery.eq('academic_year', filters.academicYear);

        const fbRes: any = await withTimeout(fallbackQuery as any, 5000);
        data = (fbRes?.data || []).map((p: any) => ({ ...p, department: '', degree: '' }));
        error = fbRes?.error;
      }

      if (!error && data) {
        let results = (data || []).map((p: any) => {
          let totalSubjects = 0;
          let totalCredits = 0;
          const semesterCount = p.semesters && Array.isArray(p.semesters) ? p.semesters.length : 0;
          if (p.semesters && Array.isArray(p.semesters)) {
            p.semesters.forEach((sem: any) => {
              if (sem.subjects && Array.isArray(sem.subjects)) {
                totalSubjects += sem.subjects.length;
                sem.subjects.forEach((sub: any) => {
                  totalCredits += Number(sub.credit || 0);
                });
              }
            });
          }
          return {
            ...p,
            semester_count: semesterCount,
            total_subjects: totalSubjects,
            total_credits: Math.round(totalCredits * 100) / 100
          };
        });

        // Search in module code or subject name if provided
        if (filters.search && filters.search.trim()) {
          const sTerm = filters.search.trim().toLowerCase();
          results = results.filter((p: any) => {
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

        if (filters.semester && filters.semester.trim()) {
          const semTerm = filters.semester.trim().toLowerCase();
          results = results.filter((p: any) => p.semesters && p.semesters.some((s: any) => 
            (s.semester_name && s.semester_name.toLowerCase().includes(semTerm)) ||
            (s.semester_order && String(s.semester_order) === semTerm)
          ));
        }

        // Apply sorting
        if (filters.sort === 'university_asc') {
          results.sort((a: any, b: any) => (a.university || '').localeCompare(b.university || ''));
        } else if (filters.sort === 'faculty_asc') {
          results.sort((a: any, b: any) => (a.faculty || '').localeCompare(b.faculty || ''));
        }

        return results;
      }
    } catch {
      // Supabase failed or timed out, seamlessly fallback to SQLite Express API
    }
  }

  // Fallback to Express backend endpoint
  const searchParams = new URLSearchParams();
  if (filters.search) searchParams.set('search', filters.search);
  if (filters.university) searchParams.set('university', filters.university);
  if (filters.faculty) searchParams.set('faculty', filters.faculty);
  if (filters.department) searchParams.set('department', filters.department);
  if (filters.academicYear) searchParams.set('academic_year', filters.academicYear);
  if (filters.semester) searchParams.set('semester', filters.semester);
  if (filters.sort) searchParams.set('sort', filters.sort);

  const queryString = searchParams.toString();
  const url = queryString ? `/api/profiles?${queryString}` : '/api/profiles';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch profiles. Please try again.');
  return res.json();
}

export async function fetchProfileById(profileId: string): Promise<Profile> {
  const cleanId = profileId.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    // 1. Get profile row
    let { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, profile_name, university, faculty, department, academic_year, description, visibility, created_at, updated_at, passcode_hash')
      .eq('id', cleanId)
      .single();

    if (pErr && (pErr.message.includes('department') || pErr.message.includes('schema cache'))) {
      const fb = await supabase
        .from('profiles')
        .select('id, profile_name, university, faculty, academic_year, description, visibility, created_at, updated_at, passcode_hash')
        .eq('id', cleanId)
        .single();
      profile = fb.data ? { ...fb.data, department: '' } : null;
      pErr = fb.error;
    }

    if (pErr || !profile) {
      throw new Error('Profile not found. Please check the Profile ID or URL link.');
    }

    // 2. Get semesters & subjects
    const { data: semesters, error: sErr } = await supabase
      .from('semesters')
      .select('id, semester_name, semester_order')
      .eq('profile_id', cleanId)
      .order('semester_order', { ascending: true });

    if (sErr) throw new Error(sErr.message);

    const formattedSemesters: Semester[] = [];
    for (const sem of semesters || []) {
      const { data: subjects, error: subErr } = await supabase
        .from('subjects')
        .select('id, subject_code, subject_name, credit')
        .eq('semester_id', sem.id)
        .order('id', { ascending: true });

      if (subErr) throw new Error(subErr.message);

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

    // 3. Get grading scale
    const { data: scales } = await supabase
      .from('grading_scales')
      .select('grade, grade_point')
      .eq('profile_id', cleanId)
      .order('grade_point', { ascending: false });

    const gradingScale: GradeOption[] = (scales && scales.length > 0)
      ? scales.map((s: any) => ({ grade: s.grade, grade_point: Number(s.grade_point) }))
      : DEFAULT_GRADING_SCALE;

    return {
      id: profile.id,
      profile_name: profile.profile_name,
      university: profile.university,
      faculty: profile.faculty,
      department: profile.department || '',
      academic_year: profile.academic_year || '',
      description: profile.description || '',
      visibility: profile.visibility as any,
      has_passcode: Boolean(profile.passcode_hash && profile.passcode_hash.length > 0),
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      semesters: formattedSemesters,
      gradingScale
    };
  } else {
    const res = await fetch(`/api/profiles/${cleanId}`);
    if (!res.ok) throw new Error('Profile not found. Please check the Profile ID or link.');
    return res.json();
  }
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
  if (isSupabaseConfigured && supabase) {
    const profileId = generateProfileId();
    const passcodeHash = profileData.passcode ? await hashPasscode(profileData.passcode) : '';

    // Insert profile
    let { error: pErr } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        profile_name: profileData.profile_name.trim(),
        university: (profileData.university || '').trim(),
        faculty: (profileData.faculty || '').trim(),
        department: (profileData.department || '').trim(),
        degree: (profileData.degree || '').trim(),
        academic_year: (profileData.academic_year || '').trim(),
        description: (profileData.description || '').trim(),
        visibility: profileData.visibility || 'public',
        passcode_hash: passcodeHash
      });

    if (pErr && (pErr.message.includes('department') || pErr.message.includes('schema cache'))) {
      const fb = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          profile_name: profileData.profile_name.trim(),
          university: (profileData.university || '').trim(),
          faculty: (profileData.faculty || '').trim(),
          degree: (profileData.degree || '').trim(),
          academic_year: (profileData.academic_year || '').trim(),
          description: (profileData.description || '').trim(),
          visibility: profileData.visibility || 'public',
          passcode_hash: passcodeHash
        });
      pErr = fb.error;
    }

    if (pErr) throw new Error(pErr.message);

    // Insert semesters & subjects
    let semOrder = 1;
    for (const sem of profileData.semesters) {
      const { data: semRow, error: semErr } = await supabase
        .from('semesters')
        .insert({
          profile_id: profileId,
          semester_name: sem.semester_name || `Semester ${semOrder}`,
          semester_order: semOrder
        })
        .select('id')
        .single();

      if (semErr) throw new Error(semErr.message);

      if (sem.subjects && Array.isArray(sem.subjects)) {
        const subjectRows = sem.subjects
          .filter(sub => sub.subject_name)
          .map(sub => ({
            semester_id: semRow.id,
            subject_code: (sub.subject_code || '').trim(),
            subject_name: (sub.subject_name || '').trim(),
            credit: Number(sub.credit) || 0
          }));

        if (subjectRows.length > 0) {
          const { error: subErr } = await supabase
            .from('subjects')
            .insert(subjectRows);
          if (subErr) throw new Error(subErr.message);
        }
      }
      semOrder++;
    }

    // Insert grading scale
    const scaleToInsert = (profileData.gradingScale && profileData.gradingScale.length > 0)
      ? profileData.gradingScale
      : DEFAULT_GRADING_SCALE;

    const scaleRows = scaleToInsert.map(gs => ({
      profile_id: profileId,
      grade: gs.grade.trim(),
      grade_point: Number(gs.grade_point)
    }));

    const { error: scaleErr } = await supabase.from('grading_scales').insert(scaleRows);
    if (scaleErr) throw new Error(scaleErr.message);

    return { id: profileId };
  } else {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create profile.');
    return { id: data.id };
  }
}

export async function verifyOwnerPasscode(profileId: string, passcode: string): Promise<boolean> {
  const cleanId = profileId.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('passcode_hash')
      .eq('id', cleanId)
      .single();

    if (error || !data) throw new Error('Profile not found');
    if (!data.passcode_hash) return true; // No passcode required

    const inputHash = await hashPasscode(passcode || '');
    return inputHash === data.passcode_hash;
  } else {
    const res = await fetch(`/api/profiles/${cleanId}/verify-passcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    const data = await res.json();
    return Boolean(data.valid);
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

  if (isSupabaseConfigured && supabase) {
    // Verify passcode first
    const isValid = await verifyOwnerPasscode(cleanId, passcode);
    if (!isValid) throw new Error('Unauthorized. Invalid owner passcode.');

    // Update profile row
    let { error: pErr } = await supabase
      .from('profiles')
      .update({
        profile_name: updateData.profile_name.trim(),
        university: updateData.university.trim(),
        faculty: updateData.faculty.trim(),
        department: (updateData.department || '').trim(),
        degree: (updateData.degree || '').trim(),
        academic_year: (updateData.academic_year || '').trim(),
        description: (updateData.description || '').trim(),
        visibility: updateData.visibility || 'public',
        updated_at: new Date().toISOString()
      })
      .eq('id', cleanId);

    if (pErr && (pErr.message.includes('department') || pErr.message.includes('schema cache'))) {
      const fb = await supabase
        .from('profiles')
        .update({
          profile_name: updateData.profile_name.trim(),
          university: updateData.university.trim(),
          faculty: updateData.faculty.trim(),
          degree: (updateData.degree || '').trim(),
          academic_year: (updateData.academic_year || '').trim(),
          description: (updateData.description || '').trim(),
          visibility: updateData.visibility || 'public',
          updated_at: new Date().toISOString()
        })
        .eq('id', cleanId);
      pErr = fb.error;
    }

    if (pErr) throw new Error(pErr.message);

    // Delete old semesters and scales
    await supabase.from('semesters').delete().eq('profile_id', cleanId);
    await supabase.from('grading_scales').delete().eq('profile_id', cleanId);

    // Re-insert semesters & subjects
    let semOrder = 1;
    for (const sem of updateData.semesters) {
      const { data: semRow, error: semErr } = await supabase
        .from('semesters')
        .insert({
          profile_id: cleanId,
          semester_name: sem.semester_name || `Semester ${semOrder}`,
          semester_order: semOrder
        })
        .select('id')
        .single();

      if (semErr) throw new Error(semErr.message);

      if (sem.subjects && Array.isArray(sem.subjects)) {
        const subjectRows = sem.subjects
          .filter(sub => sub.subject_name && Number(sub.credit) >= 0)
          .map(sub => ({
            semester_id: semRow.id,
            subject_code: sub.subject_code || '',
            subject_name: sub.subject_name.trim(),
            credit: Number(sub.credit)
          }));

        if (subjectRows.length > 0) {
          await supabase.from('subjects').insert(subjectRows);
        }
      }
      semOrder++;
    }

    // Re-insert scales
    const scaleToInsert = (updateData.gradingScale && updateData.gradingScale.length > 0)
      ? updateData.gradingScale
      : DEFAULT_GRADING_SCALE;

    const scaleRows = scaleToInsert.map(gs => ({
      profile_id: cleanId,
      grade: gs.grade.trim(),
      grade_point: Number(gs.grade_point)
    }));

    await supabase.from('grading_scales').insert(scaleRows);

    return true;
  } else {
    const res = await fetch(`/api/profiles/${cleanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, ...updateData })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update profile.');
    }
    return true;
  }
}

export async function deleteProfile(profileId: string, passcode: string): Promise<boolean> {
  const cleanId = profileId.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    const isValid = await verifyOwnerPasscode(cleanId, passcode);
    if (!isValid) throw new Error('Unauthorized. Invalid owner passcode.');

    const { error } = await supabase.from('profiles').delete().eq('id', cleanId);
    if (error) throw new Error(error.message);
    return true;
  } else {
    const res = await fetch(`/api/profiles/${cleanId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete profile.');
    }
    return true;
  }
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

      subjectTitle = cleanSubjectTitle(subjectTitle);

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

  let subjects: Array<{ moduleNumber: string; subjectName: string; credit: number | null }> = [];

  const extractSubjectObj = (s: any) => {
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
    subjects = raw.subjects.map(extractSubjectObj).filter(s => s.moduleNumber || s.subjectName);
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
    const res = await fetch('/api/ai/extract-profile', {
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

    const res = await fetch('/api/ai/extract-profile', {
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

