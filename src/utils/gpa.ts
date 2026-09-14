import type { GradeOption, Subject, Semester, SemesterResult, CGPAResult, SubjectCalculation } from '../types';

export const DEFAULT_GRADING_SCALE: GradeOption[] = [
  { grade: 'A+', grade_point: 4.0 },
  { grade: 'A', grade_point: 4.0 },
  { grade: 'A-', grade_point: 3.7 },
  { grade: 'B+', grade_point: 3.3 },
  { grade: 'B', grade_point: 3.0 },
  { grade: 'B-', grade_point: 2.7 },
  { grade: 'C+', grade_point: 2.3 },
  { grade: 'C', grade_point: 2.0 },
  { grade: 'C-', grade_point: 1.7 },
  { grade: 'D+', grade_point: 1.3 },
  { grade: 'D', grade_point: 1.0 },
  { grade: 'F', grade_point: 0.0 },
];

/**
 * Get grade point from scale
 */
export function getGradePoint(grade: string, scale: GradeOption[] = DEFAULT_GRADING_SCALE): number {
  if (!grade) return 0;
  const match = scale.find(s => s.grade.toUpperCase() === grade.toUpperCase());
  return match ? match.grade_point : 0;
}

/**
 * Calculate GPA for a single list of subjects
 */
export function calculateSemesterGPA(subjects: Subject[], scale: GradeOption[] = DEFAULT_GRADING_SCALE): SemesterResult {
  let totalCredits = 0;
  let totalGradePoints = 0;
  let subjectsCount = 0;
  const calculations: SubjectCalculation[] = [];

  for (const sub of subjects) {
    if (!sub.selectedGrade || sub.credit === undefined || sub.credit === null || sub.credit === ('' as any) || isNaN(Number(sub.credit)) || Number(sub.credit) < 0) continue;

    const gp = getGradePoint(sub.selectedGrade, scale);
    const credit = Number(sub.credit) || 0;
    const points = credit * gp;

    totalCredits += credit;
    totalGradePoints += points;
    subjectsCount++;

    calculations.push({
      subject_name: sub.subject_name,
      subject_code: sub.subject_code,
      credit,
      grade: sub.selectedGrade,
      grade_point: gp,
      total_points: Math.round(points * 100) / 100
    });
  }

  const rawGpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  const roundedGpa = Math.round(rawGpa * 100) / 100;
  const roundedPoints = Math.round(totalGradePoints * 100) / 100;

  return {
    semester_name: 'Semester',
    total_credits: Math.round(totalCredits * 100) / 100,
    total_grade_points: roundedPoints,
    gpa: roundedGpa,
    subjects_count: subjectsCount,
    calculations
  };
}

/**
 * Calculate CGPA across multiple semesters
 */
export function calculateProfileCGPA(semesters: Semester[], scale: GradeOption[] = DEFAULT_GRADING_SCALE): CGPAResult {
  let overallCredits = 0;
  let overallGradePoints = 0;
  let totalSubjects = 0;
  const semesterResults: SemesterResult[] = [];

  for (const sem of semesters) {
    const res = calculateSemesterGPA(sem.subjects || [], scale);
    res.semester_name = sem.semester_name;

    overallCredits += res.total_credits;
    overallGradePoints += res.total_grade_points;
    totalSubjects += res.subjects_count;

    semesterResults.push(res);
  }

  const rawCgpa = overallCredits > 0 ? overallGradePoints / overallCredits : 0;
  const roundedCgpa = Math.round(rawCgpa * 100) / 100;
  const roundedPoints = Math.round(overallGradePoints * 100) / 100;

  return {
    semesterResults,
    overall_credits: Math.round(overallCredits * 100) / 100,
    overall_grade_points: roundedPoints,
    overall_cgpa: roundedCgpa,
    total_subjects: totalSubjects
  };
}
