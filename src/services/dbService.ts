import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Profile, GradeOption, Semester } from '../types';
import { DEFAULT_GRADING_SCALE } from '../utils/gpa';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

export interface ProfileFilterParams {
  search?: string;
  university?: string;
  faculty?: string;
  department?: string;
  academicYear?: string;
  semester?: string;
}

export async function fetchFilterOptions(): Promise<{
  universities: string[];
  faculties: string[];
  departments: string[];
  degrees: string[];
  academicYears: string[];
}> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('profiles')
      .select('university, faculty, department, academic_year')
      .eq('visibility', 'public');

    const universities = Array.from(new Set((data || []).map(p => p.university).filter(Boolean))).sort();
    const faculties = Array.from(new Set((data || []).map(p => p.faculty).filter(Boolean))).sort();
    const departments = Array.from(new Set((data || []).map(p => p.department).filter(Boolean))).sort();
    const academicYears = Array.from(new Set((data || []).map(p => p.academic_year).filter(Boolean))).sort().reverse();

    return { universities, faculties, departments, degrees: [], academicYears };
  } else {
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
  }
}

export async function fetchPublicProfiles(paramsOrQuery: string | ProfileFilterParams = ''): Promise<any[]> {
  const filters: ProfileFilterParams = typeof paramsOrQuery === 'string'
    ? { search: paramsOrQuery }
    : paramsOrQuery;

  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('profiles')
      .select(`
        id, profile_name, university, faculty, department, degree, academic_year, visibility, created_at,
        semesters (
          id, semester_name, semester_order,
          subjects (
            id, credit
          )
        )
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`profile_name.ilike.${term},university.ilike.${term},faculty.ilike.${term},department.ilike.${term},id.ilike.${term}`);
    }
    if (filters.university) query = query.eq('university', filters.university);
    if (filters.faculty) query = query.eq('faculty', filters.faculty);
    if (filters.department) query = query.eq('department', filters.department);
    if (filters.academicYear) query = query.eq('academic_year', filters.academicYear);

    let { data, error } = await query;
    if (error && (error.message.includes('department') || error.message.includes('schema cache'))) {
      // Retry without department column if missing in Supabase schema cache
      let fallbackQuery = supabase
        .from('profiles')
        .select(`
          id, profile_name, university, faculty, academic_year, visibility, created_at,
          semesters (
            id, semester_name, semester_order,
            subjects (
              id, credit
            )
          )
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        fallbackQuery = fallbackQuery.or(`profile_name.ilike.${term},university.ilike.${term},faculty.ilike.${term},id.ilike.${term}`);
      }
      if (filters.university) fallbackQuery = fallbackQuery.eq('university', filters.university);
      if (filters.faculty) fallbackQuery = fallbackQuery.eq('faculty', filters.faculty);
      if (filters.academicYear) fallbackQuery = fallbackQuery.eq('academic_year', filters.academicYear);

      const fbRes = await fallbackQuery;
      data = (fbRes.data || []).map(p => ({ ...p, department: '', degree: '' }));
      error = fbRes.error;
    }

    if (error) throw new Error(error.message);

    // Format count and credit totals, and apply client-side semester filter if provided
    let results = (data || []).map(p => {
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

    if (filters.semester && filters.semester.trim()) {
      const semTerm = filters.semester.trim().toLowerCase();
      results = results.filter(p => p.semesters && p.semesters.some((s: any) => 
        (s.semester_name && s.semester_name.toLowerCase().includes(semTerm)) ||
        (s.semester_order && String(s.semester_order) === semTerm)
      ));
    }

    return results;
  } else {
    const searchParams = new URLSearchParams();
    if (filters.search) searchParams.set('search', filters.search);
    if (filters.university) searchParams.set('university', filters.university);
    if (filters.faculty) searchParams.set('faculty', filters.faculty);
    if (filters.department) searchParams.set('department', filters.department);
    if (filters.academicYear) searchParams.set('academic_year', filters.academicYear);
    if (filters.semester) searchParams.set('semester', filters.semester);

    const queryString = searchParams.toString();
    const url = queryString ? `/api/profiles?${queryString}` : '/api/profiles';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch profiles');
    return res.json();
  }
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
          .filter(sub => sub.subject_name && Number(sub.credit) > 0)
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
  
  let profile_name = '';
  let university = 'Not detected';
  let faculty = 'Not detected';
  let department = 'Not detected';
  let academic_year = 'Not detected';
  let semesterName = 'Not detected';

  const extractedSubjects: Array<{ subject_code: string; subject_name: string; credit: number | null }> = [];

  for (const line of lines) {
    // Skip lecturer, staff, room, time, contact, or page number lines
    if (/^(?:Dr\.|Prof\.|Professor|Doctor|Lecturer|Instructor|Teacher|Taught\s+by|Staff|Email|Phone|Tel|Contact|Room|Lab|LH|Venue|Building|Time|Day|Date|Page\s*\d+)/i.test(line)) {
      continue;
    }
    if (/\b(?:@|http|www\.|AM|PM|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(line) && !/^[A-Z]{2,6}\s*[-–—]?\s*\d{3,5}/i.test(line)) {
      continue;
    }

    // 1. Explicit / Labelled Metadata Detection
    if (/^(?:PROFILE\s*NAME|PROFILE)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:PROFILE\s*NAME|PROFILE)\s*:\s*(.+)/i);
      if (match && match[1]) profile_name = match[1].trim();
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
      if (match && match[1]) academic_year = match[1].trim();
      continue;
    }
    if (/^(?:SEMESTER|TERM)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:SEMESTER|TERM)\s*:\s*(.+)/i);
      if (match && match[1]) semesterName = match[1].startsWith('Semester') ? match[1].trim() : `Semester ${match[1].trim()}`;
      continue;
    }

    // 2. Unlabelled Header Heuristics (Do NOT convert headings to subjects)
    if (university === 'Not detected' && /^(?:University|Institute|College|Academy)\b/i.test(line)) {
      university = line.trim();
      continue;
    }
    if (faculty === 'Not detected' && /^(?:Faculty|School)\s+of\b/i.test(line)) {
      faculty = line.trim();
      continue;
    }
    if (department === 'Not detected' && /^(?:Department|Dept\.)\s+of\b/i.test(line)) {
      department = line.trim();
      continue;
    }
    if (academic_year === 'Not detected' && /\b(20\d{2}[-/]20\d{2}|Year\s+[1-5]|Academic\s+Year\s+\d+)\b/i.test(line)) {
      const match = line.match(/\b(20\d{2}[-/]20\d{2}|Year\s+[1-5]|Academic\s+Year\s+\d+)\b/i);
      if (match) academic_year = match[1].trim();
      continue;
    }
    if (semesterName === 'Not detected' && /\b(Semester\s+[1-8]|Sem\s+[1-8]|Term\s+[1-4])\b/i.test(line)) {
      const match = line.match(/\b(Semester\s+[1-8]|Sem\s+[1-8]|Term\s+[1-4])\b/i);
      if (match) semesterName = match[1].trim();
      continue;
    }

    // Skip section headers, titles, or notes
    if (/^(?:SUBJECTS|MODULES|COURSES|INSTRUCTIONS?|NOTES?|TIMETABLE|RESULTS?|GRADES?|SYLLABUS|COURSE OUTLINE|MODULE LIST|SL\.\s*NO|SR\.\s*NO)\s*:?$/i.test(line)) {
      continue;
    }

    // 3. Subject Extraction Rule
    // Detect module code (e.g. NANO2112, ETCH2111, PDEV2110, CS 101, MATH-202)
    const codeMatch = line.match(/^([A-Z]{2,6}\s*[-–—]?\s*\d{3,5}[A-Z]?)\b\s*[-–—:|]?\s*(.*)$/i);
    let subjectCode = '';
    let remainingLine = '';

    if (codeMatch) {
      subjectCode = codeMatch[1].replace(/\s+/g, '').toUpperCase();
      remainingLine = codeMatch[2].trim();
    } else {
      const parts = line.split(/[-–—|]/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        if (/^[A-Z]{2,6}\s*\d{3,5}[A-Z]?$/i.test(parts[0])) {
          subjectCode = parts[0].replace(/\s+/g, '').toUpperCase();
          remainingLine = parts.slice(1).join(' - ');
        }
      }
    }

    if (subjectCode || (remainingLine && !/^(?:University|Faculty|Department|Semester|Academic Year|Grade|Point|Marks|Total|GPA|CGPA|Credit|Lecturer|Dr\.|Prof\.)/i.test(line))) {
      let credit: number | null = null; // null represents unassigned/undetected
      let subjectTitle = remainingLine || line;

      // Strip lecturer names, rooms, or times trailing in the subject title
      subjectTitle = subjectTitle
        .replace(/\b(?:by\s+)?(?:Dr\.|Prof\.|Professor|Mr\.|Ms\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi, '')
        .replace(/\b(?:Room|Lab|LH|Venue|Hall)\s*[-:\s]?\s*[A-Z0-9]+/gi, '')
        .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g, '')
        .trim();

      // Explicit credit regex matching (supports 0, 0.5, 1, 2, 3, 4, etc.)
      const trailingCreditMatch = subjectTitle.match(/[-–—:|]?\s*(\d+(?:\.\d+)?)\s*(?:credits?|cr|pts?)?\s*$/i);
      const explicitCreditMatch = subjectTitle.match(/(?:^|[-–—:|,\s])(\d+(?:\.\d+)?)\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)?(?:$|[\)\s])/i);

      if (trailingCreditMatch && trailingCreditMatch[1] !== undefined) {
        const val = parseFloat(trailingCreditMatch[1]);
        if (!isNaN(val) && val >= 0 && val <= 12) {
          credit = val;
          subjectTitle = subjectTitle.substring(0, trailingCreditMatch.index).trim();
        }
      } else if (explicitCreditMatch && explicitCreditMatch[1] !== undefined) {
        const val = parseFloat(explicitCreditMatch[1]);
        if (!isNaN(val) && val >= 0 && val <= 12) {
          credit = val;
        }
      }

      // Clean trailing punctuation
      subjectTitle = subjectTitle
        .replace(/^[-–—:|]+/, '')
        .replace(/[-–—:|]+$/, '')
        .replace(/\b\d+(?:\.\d+)?\s*(?:credits?|cr|pts?)\b/gi, '')
        .trim();

      if (!subjectTitle && subjectCode) {
        subjectTitle = subjectCode;
      }

      if (subjectTitle || subjectCode) {
        extractedSubjects.push({
          subject_code: subjectCode,
          subject_name: subjectTitle,
          credit: credit // null if missing/unspecified; 0 if explicitly 0
        });
      }
    }
  }

  if (!profile_name) {
    if (university !== 'Not detected') {
      profile_name = `${university}${academic_year !== 'Not detected' ? ' - ' + academic_year : ''}`;
    } else {
      profile_name = 'Academic Profile';
    }
  }

  return {
    profile_name,
    university,
    faculty,
    department,
    academic_year,
    semester: semesterName,
    semesters: [
      {
        semester_name: semesterName !== 'Not detected' ? semesterName : 'Semester 1',
        subjects: extractedSubjects
      }
    ]
  };
}

export async function extractAiProfile(text: string): Promise<any> {
  try {
    const res = await fetch('/api/ai/extract-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.profile) return data.profile;
    }
  } catch (err) {
    console.warn('Backend AI endpoint fetch failed, using client-side fallback:', err);
  }

  // Pure client-side fallback guarantee
  return extractProfileFallbackClient(text);
}

export async function extractAiProfileFromImage(
  imageFile: File,
  onProgress?: (progressPct: number) => void
): Promise<any> {
  // 1. Try server-side multimodal image vision endpoint if available
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

    if (res.ok) {
      const data = await res.json();
      if (data.profile && data.method === 'ai_vision') {
        onProgress?.(100);
        return data.profile;
      }
    }
  } catch (err) {
    console.warn('Backend AI vision endpoint unavailable, continuing to client-side OCR:', err);
  }

  // 2. Perform client-side OCR via Tesseract.js
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
      throw new Error('No readable text found in image. Please ensure the image is clear and readable.');
    }

    // Process extracted OCR text using extractAiProfile
    const profile = await extractAiProfile(text);
    onProgress?.(100);
    return profile;
  } catch (err: any) {
    console.error('Tesseract OCR failed:', err);
    throw new Error(err.message || 'Failed to perform OCR on uploaded image. Please try a clearer image or paste text manually.');
  }
}

