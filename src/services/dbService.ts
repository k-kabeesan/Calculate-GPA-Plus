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

export async function fetchPublicProfiles(searchQuery: string = ''): Promise<any[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('profiles')
      .select(`
        id, profile_name, university, faculty, degree, academic_year, visibility, created_at,
        semesters (
          id,
          subjects (
            id, credit
          )
        )
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(30);

    if (searchQuery.trim()) {
      const term = `%${searchQuery.trim()}%`;
      query = query.or(`profile_name.ilike.${term},university.ilike.${term},faculty.ilike.${term},id.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Format count and credit totals
    return (data || []).map(p => {
      let totalSubjects = 0;
      let totalCredits = 0;
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
        total_subjects: totalSubjects,
        total_credits: Math.round(totalCredits * 100) / 100
      };
    });
  } else {
    const url = searchQuery ? `/api/profiles?search=${encodeURIComponent(searchQuery)}` : '/api/profiles';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch profiles');
    return res.json();
  }
}

export async function fetchProfileById(profileId: string): Promise<Profile> {
  const cleanId = profileId.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    // 1. Get profile row
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, profile_name, university, faculty, degree, academic_year, description, visibility, created_at, updated_at, passcode_hash')
      .eq('id', cleanId)
      .single();

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
      degree: profile.degree,
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
  university: string;
  faculty: string;
  degree: string;
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
    const { error: pErr } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        profile_name: profileData.profile_name.trim(),
        university: profileData.university.trim(),
        faculty: profileData.faculty.trim(),
        degree: profileData.degree.trim(),
        academic_year: (profileData.academic_year || '').trim(),
        description: (profileData.description || '').trim(),
        visibility: profileData.visibility || 'public',
        passcode_hash: passcodeHash
      });

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
          .filter(sub => sub.subject_name && Number(sub.credit) > 0)
          .map(sub => ({
            semester_id: semRow.id,
            subject_code: sub.subject_code || '',
            subject_name: sub.subject_name.trim(),
            credit: Number(sub.credit)
          }));

        if (subjectRows.length > 0) {
          const { error: subErr } = await supabase.from('subjects').insert(subjectRows);
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
    degree: string;
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
    const { error: pErr } = await supabase
      .from('profiles')
      .update({
        profile_name: updateData.profile_name.trim(),
        university: updateData.university.trim(),
        faculty: updateData.faculty.trim(),
        degree: updateData.degree.trim(),
        academic_year: (updateData.academic_year || '').trim(),
        description: (updateData.description || '').trim(),
        visibility: updateData.visibility || 'public',
        updated_at: new Date().toISOString()
      })
      .eq('id', cleanId);

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
