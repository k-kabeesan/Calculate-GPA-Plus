import type { ProfileDraft } from '../src/domain/model.js';

export class InputError extends Error { constructor(message: string) { super(message); } }
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown, label: string, max: number, required = false): string => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new InputError(`${label} is invalid or missing.`);
  return value.trim();
};

export function validateDraft(value: unknown): ProfileDraft {
  if (!record(value)) throw new InputError('Profile data is required.');
  const name = string(value.name, 'Profile name', 150, true);
  const university = string(value.university, 'University', 150, true);
  const faculty = string(value.faculty, 'Faculty', 150, true);
  const department = string(value.department ?? '', 'Department', 150);
  const degree = string(value.degree, 'Degree programme', 150, true);
  const academicYear = string(value.academicYear, 'Academic year', 50, true);
  const description = string(value.description ?? '', 'Description', 2000);
  if (!Array.isArray(value.scale) || value.scale.length < 2 || value.scale.length > 30) throw new InputError('Grading scale is invalid.');
  const scale = value.scale.map((entry: unknown) => {
    if (!record(entry)) throw new InputError('Grading scale is invalid.');
    const grade = string(entry.grade, 'Grade', 20, true);
    if (typeof entry.points !== 'number' || !Number.isFinite(entry.points) || entry.points < 0 || entry.points > 10) throw new InputError('Grade points must be between 0 and 10.');
    return { grade, points: entry.points };
  });
  if (new Set(scale.map(item => item.grade.toUpperCase())).size !== scale.length) throw new InputError('Grades must be unique.');
  if (!Array.isArray(value.semesters) || value.semesters.length < 1 || value.semesters.length > 30) throw new InputError('Add at least one semester.');
  const semesters = value.semesters.map((entry: unknown, index: number) => {
    if (!record(entry) || !Array.isArray(entry.subjects) || entry.subjects.length < 1 || entry.subjects.length > 100) throw new InputError(`Semester ${index + 1} needs subjects.`);
    const name = string(entry.name, 'Semester name', 100, true);
    const subjects = entry.subjects.map((item: unknown, subjectIndex: number) => {
      if (!record(item)) throw new InputError(`Subject ${subjectIndex + 1} is invalid.`);
      const code = string(item.code, 'Module code', 50, true);
      const name = string(item.name, 'Subject name', 200, true);
      if (typeof item.credits !== 'number' || !Number.isFinite(item.credits) || item.credits < 0 || item.credits > 100) throw new InputError(`Credits for ${code} must be between 0 and 100.`);
      const grade = string(item.grade ?? '', 'Grade', 20);
      if (grade && !scale.some(point => point.grade === grade)) throw new InputError(`Grade for ${code} is outside the grading scale.`);
      return { id: typeof item.id === 'string' ? item.id : crypto.randomUUID(), code, name, credits: item.credits as number, grade };
    });
    return { id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(), name, subjects };
  });
  return { name, university, faculty, department, degree, academicYear, description, visibility: 'public', semesters, scale };
}

export function validatePasscode(value: unknown): string {
  if (typeof value !== 'string' || value.length < 4 || value.length > 200) throw new InputError('Owner passcode must have 4 to 200 characters.');
  return value;
}
