import type { GradePoint, Semester, Subject } from './model';

export interface GpaResult {
  credits: number;
  qualityPoints: number;
  gpa: number | null;
  gradedSubjects: number;
}

export interface CgpaResult extends GpaResult { semesters: Array<{ name: string; result: GpaResult }> }

export type TargetPlan =
  | { status: 'invalid'; message: string }
  | { status: 'achievable' | 'already-achieved' | 'impossible'; requiredGpa: number; maxAchievableGpa: number; message: string };

export const classThresholds = { first: 3.7, upper: 3.3, lower: 3 } as const;
export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateGpa(subjects: Subject[], scale: GradePoint[]): GpaResult {
  const points = new Map(scale.map(item => [item.grade.toUpperCase(), item.points]));
  let credits = 0;
  let qualityPoints = 0;
  let gradedSubjects = 0;
  for (const subject of subjects) {
    const credit = Number(subject.credits);
    const point = points.get(subject.grade.toUpperCase());
    if (!subject.grade || subject.credits === '' || !Number.isFinite(credit) || credit < 0 ||
      point === undefined || !Number.isFinite(point)) continue;
    credits += credit;
    qualityPoints += credit * point;
    gradedSubjects++;
  }
  return { credits: round2(credits), qualityPoints: round2(qualityPoints),
    gpa: credits > 0 ? round2(qualityPoints / credits) : null, gradedSubjects };
}

export function calculateCgpa(semesters: Semester[], scale: GradePoint[]): CgpaResult {
  const results = semesters.map(semester => ({ name: semester.name, result: calculateGpa(semester.subjects, scale) }));
  return { semesters: results, ...calculateGpa(semesters.flatMap(semester => semester.subjects), scale) };
}

export function academicClass(gpa: number | null): string {
  if (gpa === null || !Number.isFinite(gpa)) return 'Not calculated';
  if (gpa >= classThresholds.first) return 'First Class';
  if (gpa >= classThresholds.upper) return 'Second Class Upper';
  if (gpa >= classThresholds.lower) return 'Second Class Lower';
  return 'Pass';
}

export function planTarget(currentGpa: number, completedCredits: number, targetGpa: number, futureCredits: number, maxPoint: number): TargetPlan {
  if (![currentGpa, completedCredits, targetGpa, futureCredits, maxPoint].every(Number.isFinite) ||
      maxPoint <= 0 || completedCredits < 0 || futureCredits <= 0 || currentGpa < 0 ||
      targetGpa < 0 || currentGpa > maxPoint || targetGpa > maxPoint) {
    return { status: 'invalid', message: 'Enter valid GPA and credit values within your grading scale.' };
  }
  const totalCredits = completedCredits + futureCredits;
  const requiredGpa = (targetGpa * totalCredits - currentGpa * completedCredits) / futureCredits;
  const maxAchievableGpa = (currentGpa * completedCredits + maxPoint * futureCredits) / totalCredits;
  if (requiredGpa > maxPoint) return { status: 'impossible', requiredGpa: round2(requiredGpa), maxAchievableGpa: round2(maxAchievableGpa), message: `This target is out of reach with ${futureCredits} future credits. The highest possible CGPA is ${maxAchievableGpa.toFixed(2)}.` };
  if (requiredGpa <= 0) return { status: 'already-achieved', requiredGpa: 0, maxAchievableGpa: round2(maxAchievableGpa), message: 'Your target is already secured for those future credits.' };
  return { status: 'achievable', requiredGpa: round2(requiredGpa), maxAchievableGpa: round2(maxAchievableGpa), message: `You need an average GPA of ${requiredGpa.toFixed(2)} over the next ${futureCredits} credits.` };
}
