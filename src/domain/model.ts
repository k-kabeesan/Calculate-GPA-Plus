export interface GradePoint { grade: string; points: number }

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number | '';
  grade: string;
}

export interface Semester {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface ProfileDraft {
  name: string;
  university: string;
  faculty: string;
  department: string;
  degree: string;
  academicYear: string;
  description: string;
  visibility: 'public';
  semesters: Semester[];
  scale: GradePoint[];
}

export interface Profile extends ProfileDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  hasPasscode: boolean;
}

export interface ProfileCard {
  id: string;
  name: string;
  university: string;
  faculty: string;
  department: string;
  degree: string;
  academicYear: string;
  subjectCount: number;
  semesterCount: number;
  createdAt: string;
}

export interface ProfileFilters {
  search?: string;
  university?: string;
  faculty?: string;
  department?: string;
  degree?: string;
  academicYear?: string;
  semester?: string;
  page?: number;
}

export interface SearchResult {
  profiles: ProfileCard[];
  total: number;
  page: number;
  pageSize: number;
}

export const newSubject = (): Subject => ({ id: crypto.randomUUID(), code: '', name: '', credits: '', grade: '' });
export const newSemester = (index: number): Semester => ({ id: crypto.randomUUID(), name: `Semester ${index}`, subjects: [newSubject()] });
export const defaultScale: GradePoint[] = [
  ['A+', 4], ['A', 4], ['A-', 3.7], ['B+', 3.3], ['B', 3], ['B-', 2.7],
  ['C+', 2.3], ['C', 2], ['C-', 1.7], ['D+', 1.3], ['D', 1], ['F', 0]
].map(([grade, points]) => ({ grade: String(grade), points: Number(points) }));

export const newDraft = (): ProfileDraft => ({
  name: '', university: '', faculty: '', department: '', degree: '', academicYear: '', description: '',
  visibility: 'public', semesters: [newSemester(1)], scale: defaultScale.map(item => ({ ...item }))
});
