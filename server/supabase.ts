import './env';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Server-side environment variable resolution (keeps all secret keys on server only)
// Only server-side names are accepted here. A VITE_/NEXT_PUBLIC_ value can be
// shipped to the browser, so accepting one as a server credential is unsafe.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// A partially configured cloud backend must fail instead of silently saving locally.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);


let supabaseClient: SupabaseClient | null = null;
let supabaseFailed = false;

if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
  } catch (err) {
    console.warn('Failed to initialize server-side Supabase client:', err);
    supabaseFailed = true;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseFailed) return null;
  return supabaseClient;
}

// Timeout wrapper for Supabase database operations to guarantee responsiveness
export async function withTimeout<T>(promise: Promise<T>, ms = 4000, fallbackErrMsg = 'Database query timed out'): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(fallbackErrMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// ------------------------------------------------------------------
// Server-Side Supabase Data Access Methods
// ------------------------------------------------------------------

export async function getSupabaseProfiles(filters: {
  search?: string;
  university?: string;
  faculty?: string;
  department?: string;
  academic_year?: string;
  semester?: string;
  sort?: string;
}): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client
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
      .limit(100);

    if (filters.sort === 'university_asc') {
      query = query.order('university', { ascending: true }).order('profile_name', { ascending: true });
    } else if (filters.sort === 'faculty_asc') {
      query = query.order('faculty', { ascending: true }).order('profile_name', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (filters.university) query = query.eq('university', filters.university.trim());
    if (filters.faculty) query = query.eq('faculty', filters.faculty.trim());
    if (filters.department) query = query.eq('department', filters.department.trim());
    if (filters.academic_year) query = query.eq('academic_year', filters.academic_year.trim());

    const { data, error } = await withTimeout(query as any, 3500);
    if (error || !data) return null;

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
      results = results.filter((p: any) =>
        p.semesters && p.semesters.some((s: any) =>
          (s.semester_name && s.semester_name.toLowerCase().includes(semTerm)) ||
          (s.semester_order && String(s.semester_order) === semTerm)
        )
      );
    }

    return results;
  } catch {
    return null;
  }
}

export async function getSupabaseFilterOptions(): Promise<{
  universities: string[];
  faculties: string[];
  departments: string[];
  degrees: string[];
  academicYears: string[];
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await withTimeout(
      client
        .from('profiles')
        .select('university, faculty, department, academic_year')
        .eq('visibility', 'public')
        .limit(200) as any,
      3000
    );

    if (error || !data) return null;

    const universities = Array.from(new Set((data as any[]).map(p => p.university).filter(Boolean))).sort();
    const faculties = Array.from(new Set((data as any[]).map(p => p.faculty).filter(Boolean))).sort();
    const departments = Array.from(new Set((data as any[]).map(p => p.department).filter(Boolean))).sort();
    const academicYears = Array.from(new Set((data as any[]).map(p => p.academic_year).filter(Boolean))).sort().reverse();

    return {
      universities,
      faculties,
      departments,
      degrees: [],
      academicYears
    };
  } catch {
    return null;
  }
}

export async function getSupabaseProfileById(profileId: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const cleanId = profileId.trim().toUpperCase();

    const { data: profile, error: pErr } = await withTimeout(
      client
        .from('profiles')
        .select('id, profile_name, university, faculty, department, academic_year, description, visibility, created_at, updated_at, passcode_hash, password_hash')
        .eq('id', cleanId)
        .single() as any,
      3000
    );

    if (pErr || !profile) return null;

    const { data: semesters } = await withTimeout(
      client
        .from('semesters')
        .select('id, semester_name, semester_order')
        .eq('profile_id', cleanId)
        .order('semester_order', { ascending: true }) as any,
      3000
    );

    const formattedSemesters: any[] = [];
    for (const sem of semesters || []) {
      const { data: subjects } = await client
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

    const { data: scales } = await client
      .from('grading_scales')
      .select('grade, grade_point')
      .eq('profile_id', cleanId)
      .order('grade_point', { ascending: false });

    const storedHash = profile.password_hash || profile.passcode_hash || '';

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
  } catch {
    return null;
  }
}

function requireCloudClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) throw new Error('Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.');
  return client;
}

async function writeCloudProfile(profileId: string, profileData: any, create: boolean): Promise<boolean> {
  const client = requireCloudClient();

  if (create) {
    const { error: pErr } = await client.from('profiles').insert({
      id: profileId,
      profile_name: (profileData.profile_name || '').trim(),
      university: (profileData.university || '').trim(),
      faculty: (profileData.faculty || '').trim(),
      degree: (profileData.degree || '').trim(),
      academic_year: (profileData.academic_year || '').trim(),
      description: (profileData.description || '').trim(),
      visibility: 'public',
      passcode_hash: profileData.passcode_hash || ''
    });

    if (pErr) {
      console.error('Server Supabase profile create error:', pErr);
      throw new Error(`Unable to save cloud profile: ${pErr.message}`);
    }

    let semOrder = 1;
    for (const sem of profileData.semesters || []) {
      const { data: semData, error: sErr } = await client.from('semesters').insert({
        profile_id: profileId,
        semester_name: sem.semester_name || `Semester ${semOrder}`,
        semester_order: semOrder
      }).select('id').single();

      if (sErr || !semData) {
        console.error('Server Supabase semester create error:', sErr);
        await client.from('profiles').delete().eq('id', profileId);
        throw new Error(`Unable to save cloud profile semesters: ${sErr?.message || 'Unknown error'}`);
      }

      const semId = semData.id;
      for (const sub of sem.subjects || []) {
        const subCode = (sub as any).subject_code || (sub as any).module_number || '';
        const subName = sub.subject_name ? sub.subject_name.trim() : subCode;
        const creditVal = Number(sub.credit);

        const { error: subErr } = await client.from('subjects').insert({
          semester_id: semId,
          subject_code: subCode,
          subject_name: subName,
          credit: creditVal
        });

        if (subErr) {
          console.error('Server Supabase subject create error:', subErr);
          await client.from('profiles').delete().eq('id', profileId);
          throw new Error(`Unable to save cloud profile subjects: ${subErr.message}`);
        }
      }
      semOrder++;
    }

    if (profileData.gradingScale && Array.isArray(profileData.gradingScale)) {
      for (const gs of profileData.gradingScale) {
        await client.from('grading_scales').insert({
          profile_id: profileId,
          grade: (gs.grade || '').trim(),
          grade_point: Number(gs.grade_point || 0)
        });
      }
    }
    return true;
  } else {
    // Update existing profile
    const { error: pErr } = await client.from('profiles').update({
      profile_name: (profileData.profile_name || '').trim(),
      university: (profileData.university || '').trim(),
      faculty: (profileData.faculty || '').trim(),
      degree: (profileData.degree || '').trim(),
      academic_year: (profileData.academic_year || '').trim(),
      description: (profileData.description || '').trim(),
      visibility: 'public',
      updated_at: new Date().toISOString()
    }).eq('id', profileId);

    if (pErr) throw new Error(`Unable to update cloud profile: ${pErr.message}`);

    await client.from('semesters').delete().eq('profile_id', profileId);
    await client.from('grading_scales').delete().eq('profile_id', profileId);

    let semOrder = 1;
    for (const sem of profileData.semesters || []) {
      const { data: semData, error: sErr } = await client.from('semesters').insert({
        profile_id: profileId,
        semester_name: sem.semester_name || `Semester ${semOrder}`,
        semester_order: semOrder
      }).select('id').single();

      if (!sErr && semData) {
        const semId = semData.id;
        for (const sub of sem.subjects || []) {
          const subCode = (sub as any).subject_code || (sub as any).module_number || '';
          const subName = sub.subject_name ? sub.subject_name.trim() : subCode;
          const creditVal = Number(sub.credit);

          await client.from('subjects').insert({
            semester_id: semId,
            subject_code: subCode,
            subject_name: subName,
            credit: creditVal
          });
        }
      }
      semOrder++;
    }

    if (profileData.gradingScale && Array.isArray(profileData.gradingScale)) {
      for (const gs of profileData.gradingScale) {
        await client.from('grading_scales').insert({
          profile_id: profileId,
          grade: (gs.grade || '').trim(),
          grade_point: Number(gs.grade_point || 0)
        });
      }
    }
    return true;
  }
}

export async function createSupabaseProfile(profileId: string, profileData: any): Promise<boolean> {
  if (!isSupabaseConfigured) {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      throw new Error('Configure the Supabase server environment before creating shared profiles.');
    }
    return false;
  }
  return writeCloudProfile(profileId, profileData, true);
}

export async function updateSupabaseProfile(profileId: string, profileData: any): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  return writeCloudProfile(profileId, profileData, false);
}

export async function deleteSupabaseProfile(profileId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await requireCloudClient().from('profiles').delete().eq('id', profileId);
  if (error) throw new Error('Unable to delete cloud profile. Please retry.');
  return true;
}

function verifyStoredPasscode(passcode: string, storedHash: string): boolean {
  if (!storedHash) return true;
  if (storedHash.startsWith('scrypt$')) {
    const [, salt, expectedHex] = storedHash.split('$');
    if (!salt || !expectedHex) return false;
    const actual = crypto.scryptSync(passcode, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
  }
  const actual = crypto.createHash('sha256').update(passcode).digest('hex');
  return actual === storedHash;
}

export async function verifySupabasePasscode(profileId: string, passcode: string): Promise<{ exists: boolean; valid: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { exists: false, valid: false };

  try {
    const { data, error } = await client
      .from('profiles')
      .select('passcode_hash, password_hash')
      .eq('id', profileId)
      .single();

    if (error || !data) return { exists: false, valid: false };
    const hash = data.password_hash || data.passcode_hash || '';
    if (!hash) return { exists: true, valid: true };
    return { exists: true, valid: verifyStoredPasscode(passcode, hash) };
  } catch {
    return { exists: false, valid: false };
  }
}
