import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Profile, ProfileCard, ProfileDraft, ProfileFilters, SearchResult } from '../src/domain/model';
import { defaultScale } from '../src/domain/model';

export interface ProfileRepository {
  search(filters: ProfileFilters): Promise<SearchResult>;
  filters(): Promise<{ universities: string[]; faculties: string[]; departments: string[]; degrees: string[]; academicYears: string[] }>;
  get(id: string): Promise<Profile | null>;
  getHash(id: string): Promise<string | null>;
  create(id: string, draft: ProfileDraft, hash: string): Promise<void>;
  update(id: string, draft: ProfileDraft): Promise<void>;
  remove(id: string): Promise<void>;
}

type Row = Record<string, unknown>;
const value = (row: Row, key: string): string => String(row[key] ?? '');
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const requireData = <T>(result: { data: T; error: { message: string } | null }): T => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};

export class SupabaseRepository implements ProfileRepository {
  constructor(private readonly db: SupabaseClient) {}
  async search(filters: ProfileFilters): Promise<SearchResult> {
    const page = Math.max(1, Math.min(100000, Number(filters.page) || 1));
    const pageSize = 12;
    let query = this.db.from('profiles').select('id,profile_name,university,faculty,department,degree,academic_year,created_at,semester_count,subject_count', { count: 'exact' }).eq('visibility', 'public');
    const term = filters.search?.trim().replace(/[%_,()]/g, '');
    if (term) query = query.ilike('search_text', `%${term}%`);
    if (filters.university) query = query.eq('university', filters.university);
    if (filters.faculty) query = query.eq('faculty', filters.faculty);
    if (filters.department) query = query.eq('department', filters.department);
    if (filters.degree) query = query.eq('degree', filters.degree);
    if (filters.academicYear) query = query.eq('academic_year', filters.academicYear);
    if (filters.semester) query = query.ilike('semester_names', `%${filters.semester.replace(/[%_]/g, '')}%`);
    const { data, count, error } = await query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw new Error(error.message);
    const profiles: ProfileCard[] = rows(data).map(row => ({
      id: value(row, 'id'), name: value(row, 'profile_name'), university: value(row, 'university'), faculty: value(row, 'faculty'), department: value(row, 'department'), degree: value(row, 'degree'), academicYear: value(row, 'academic_year'), createdAt: value(row, 'created_at'), semesterCount: Number(row.semester_count) || 0, subjectCount: Number(row.subject_count) || 0
    }));
    return { profiles, total: count || 0, page, pageSize };
  }
  async filters() {
    const all: Row[] = [];
    for (let offset = 0; ; offset += 500) {
      const data = requireData(await this.db.from('profiles').select('university,faculty,department,degree,academic_year').eq('visibility', 'public').order('id').range(offset, offset + 499));
      all.push(...rows(data));
      if (!data || data.length < 500) break;
    }
    const unique = (key: string) => [...new Set(all.map(row => value(row, key)).filter(Boolean))].sort();
    return { universities: unique('university'), faculties: unique('faculty'), departments: unique('department'), degrees: unique('degree'), academicYears: unique('academic_year').reverse() };
  }
  async get(id: string): Promise<Profile | null> {
    const { data, error } = await this.db.from('profiles').select('id,profile_name,university,faculty,department,degree,academic_year,description,visibility,created_at,updated_at,passcode_hash,password_hash,semesters(id,semester_name,semester_order,subjects(id,subject_code,subject_name,credit,selected_grade)),grading_scales(id,grade,grade_point)').eq('id', id).eq('visibility', 'public').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as Row;
    return { id: value(row, 'id'), name: value(row, 'profile_name'), university: value(row, 'university'), faculty: value(row, 'faculty'), department: value(row, 'department'), degree: value(row, 'degree'), academicYear: value(row, 'academic_year'), description: value(row, 'description'), visibility: 'public', createdAt: value(row, 'created_at'), updatedAt: value(row, 'updated_at'), hasPasscode: Boolean(row.passcode_hash || row.password_hash),
      semesters: rows(row.semesters).sort((a, b) => Number(a.semester_order) - Number(b.semester_order)).map(semester => ({ id: value(semester, 'id'), name: value(semester, 'semester_name'), subjects: rows(semester.subjects).sort((a, b) => Number(a.id) - Number(b.id)).map(subject => ({ id: value(subject, 'id'), code: value(subject, 'subject_code'), name: value(subject, 'subject_name'), credits: Number(subject.credit), grade: value(subject, 'selected_grade') })) })),
      scale: rows(row.grading_scales).length ? rows(row.grading_scales).sort((a, b) => Number(a.id) - Number(b.id)).map(item => ({ grade: value(item, 'grade'), points: Number(item.grade_point) })) : defaultScale.map(item => ({ ...item })) };
  }
  async getHash(id: string): Promise<string | null> {
    const { data, error } = await this.db.from('profiles').select('passcode_hash,password_hash').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return data.passcode_hash || data.password_hash || '';
  }
  async create(id: string, draft: ProfileDraft, hash: string) { await this.save(id, draft, true, hash); }
  async update(id: string, draft: ProfileDraft) { await this.save(id, draft, false); }
  private async save(id: string, draft: ProfileDraft, create: boolean, hash = '') {
    const payload = { profile_name: draft.name, university: draft.university, faculty: draft.faculty, department: draft.department, degree: draft.degree, academic_year: draft.academicYear, description: draft.description, visibility: 'public', passcode_hash: hash,
      semesters: draft.semesters.map(semester => ({ semester_name: semester.name, subjects: semester.subjects.map(subject => ({ subject_code: subject.code, subject_name: subject.name, credit: subject.credits, selected_grade: subject.grade })) })),
      gradingScale: draft.scale.map(item => ({ grade: item.grade, grade_point: item.points })) };
    const { error } = await this.db.rpc('save_gpa_profile', { p_id: id, p_create: create, p_data: payload });
    if (error) throw new Error(error.message);
  }
  async remove(id: string) { const { error } = await this.db.from('profiles').delete().eq('id', id); if (error) throw new Error(error.message); }
}

export function repositoryFromEnv(): ProfileRepository | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url?.startsWith('https://') && key && !/^https?:\/\//i.test(key) && !key.startsWith('sb_publishable_')
    ? new SupabaseRepository(createClient(url, key, { auth: { persistSession: false } })) : null;
}
