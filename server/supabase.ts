import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side environment variable resolution (keeps all secret keys on server only)
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

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
        .select('id, profile_name, university, faculty, department, academic_year, description, visibility, created_at, updated_at, passcode_hash')
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

    return {
      id: profile.id,
      profile_name: profile.profile_name,
      university: profile.university,
      faculty: profile.faculty,
      department: profile.department || '',
      academic_year: profile.academic_year || '',
      description: profile.description || '',
      visibility: profile.visibility || 'public',
      has_passcode: Boolean(profile.passcode_hash && profile.passcode_hash.length > 0),
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      semesters: formattedSemesters,
      gradingScale: scales || []
    };
  } catch {
    return null;
  }
}

export async function createSupabaseProfile(profileId: string, profileData: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error: pErr } = await client.from('profiles').insert({
      id: profileId,
      profile_name: (profileData.profile_name || '').trim(),
      university: (profileData.university || '').trim(),
      faculty: (profileData.faculty || '').trim(),
      department: (profileData.department || '').trim(),
      degree: (profileData.degree || '').trim(),
      academic_year: (profileData.academic_year || '').trim(),
      description: (profileData.description || '').trim(),
      visibility: profileData.visibility || 'public',
      passcode_hash: profileData.passcode_hash || ''
    });

    if (pErr) return false;

    let order = 1;
    for (const sem of profileData.semesters || []) {
      const { data: semRow, error: semErr } = await client
        .from('semesters')
        .insert({
          profile_id: profileId,
          semester_name: sem.semester_name || `Semester ${order}`,
          semester_order: sem.semester_order || order
        })
        .select('id')
        .single();

      if (!semErr && semRow && sem.subjects && Array.isArray(sem.subjects)) {
        const subjectRows = sem.subjects
          .filter((sub: any) => sub.subject_name)
          .map((sub: any) => ({
            semester_id: semRow.id,
            subject_code: (sub.subject_code || '').trim(),
            subject_name: (sub.subject_name || '').trim(),
            credit: parseFloat(sub.credit || 0)
          }));

        if (subjectRows.length > 0) {
          await client.from('subjects').insert(subjectRows);
        }
      }
      order++;
    }

    if (profileData.gradingScale && Array.isArray(profileData.gradingScale)) {
      const scaleRows = profileData.gradingScale.map((gs: any) => ({
        profile_id: profileId,
        grade: String(gs.grade).trim(),
        grade_point: parseFloat(gs.grade_point || 0)
      }));
      if (scaleRows.length > 0) {
        await client.from('grading_scales').insert(scaleRows);
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function updateSupabaseProfile(profileId: string, updateData: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error: pErr } = await client
      .from('profiles')
      .update({
        profile_name: (updateData.profile_name || '').trim(),
        university: (updateData.university || '').trim(),
        faculty: (updateData.faculty || '').trim(),
        department: (updateData.department || '').trim(),
        academic_year: (updateData.academic_year || '').trim(),
        description: (updateData.description || '').trim(),
        visibility: updateData.visibility || 'public',
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (pErr) return false;

    // Delete existing semesters and scales
    await client.from('semesters').delete().eq('profile_id', profileId);
    await client.from('grading_scales').delete().eq('profile_id', profileId);

    // Re-insert semesters & subjects
    let order = 1;
    for (const sem of updateData.semesters || []) {
      const { data: semRow, error: semErr } = await client
        .from('semesters')
        .insert({
          profile_id: profileId,
          semester_name: sem.semester_name || `Semester ${order}`,
          semester_order: sem.semester_order || order
        })
        .select('id')
        .single();

      if (!semErr && semRow && sem.subjects && Array.isArray(sem.subjects)) {
        const subjectRows = sem.subjects
          .filter((sub: any) => sub.subject_name)
          .map((sub: any) => ({
            semester_id: semRow.id,
            subject_code: (sub.subject_code || '').trim(),
            subject_name: (sub.subject_name || '').trim(),
            credit: parseFloat(sub.credit || 0)
          }));

        if (subjectRows.length > 0) {
          await client.from('subjects').insert(subjectRows);
        }
      }
      order++;
    }

    if (updateData.gradingScale && Array.isArray(updateData.gradingScale)) {
      const scaleRows = updateData.gradingScale.map((gs: any) => ({
        profile_id: profileId,
        grade: String(gs.grade).trim(),
        grade_point: parseFloat(gs.grade_point || 0)
      }));
      if (scaleRows.length > 0) {
        await client.from('grading_scales').insert(scaleRows);
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function deleteSupabaseProfile(profileId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('profiles').delete().eq('id', profileId);
    return !error;
  } catch {
    return false;
  }
}

export async function verifySupabasePasscode(profileId: string, inputHash: string): Promise<{ exists: boolean; valid: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { exists: false, valid: false };

  try {
    const { data, error } = await client
      .from('profiles')
      .select('passcode_hash')
      .eq('id', profileId)
      .single();

    if (error || !data) return { exists: false, valid: false };
    if (!data.passcode_hash) return { exists: true, valid: true };
    return { exists: true, valid: data.passcode_hash === inputHash };
  } catch {
    return { exists: false, valid: false };
  }
}
