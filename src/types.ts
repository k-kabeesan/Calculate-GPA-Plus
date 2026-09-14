export interface GradeOption {
  grade: string;
  grade_point: number;
}

export interface Subject {
  id?: string | number;
  subject_code?: string;
  module_number?: string;
  subject_name: string;
  credit: number;
  selectedGrade?: string;
}

export interface Semester {
  id?: string | number;
  semester_name: string;
  semester_order: number;
  subjects: Subject[];
}

export interface Profile {
  id: string;
  profile_id?: string;
  profile_name: string;
  university?: string;
  faculty?: string;
  department?: string;
  academic_year?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'shared';
  has_passcode?: boolean;
  passcode_hash?: string;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
  total_subjects?: number;
  total_credits?: number;
  semester_count?: number;
  semesters: Semester[];
  gradingScale: GradeOption[];
}

export interface SubjectCalculation {
  subject_name: string;
  subject_code?: string;
  credit: number;
  grade: string;
  grade_point: number;
  total_points: number;
}

export interface SemesterResult {
  semester_name: string;
  total_credits: number;
  total_grade_points: number;
  gpa: number;
  subjects_count: number;
  calculations: SubjectCalculation[];
}

export interface CGPAResult {
  semesterResults: SemesterResult[];
  overall_credits: number;
  overall_grade_points: number;
  overall_cgpa: number;
  total_subjects: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreatorAuthResponse {
  success: boolean;
  valid: boolean;
  error?: string;
}

