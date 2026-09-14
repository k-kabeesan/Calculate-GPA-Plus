import {
  calculateSemesterGPA,
  calculateProfileCGPA,
  DEFAULT_GRADING_SCALE
} from '../src/utils/gpa';
import { cleanSubjectTitle } from '../src/services/dbService';
import type { Semester, Subject } from '../src/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

console.log('====================================================');
console.log('Calculate GPA Plus Comprehensive Test Suite');
console.log('====================================================\n');

// 1. GPA Calculation & Weighted Credit Calculations
console.log('--- 1. GPA & Weighted Credit Calculations ---');
const testSubjects1: Subject[] = [
  { id: '1', subject_name: 'Calculus', credit: 3, selectedGrade: 'A' },    // 3 * 4.0 = 12.0
  { id: '2', subject_name: 'Physics', credit: 4, selectedGrade: 'B+' },   // 4 * 3.3 = 13.2
  { id: '3', subject_name: 'Lab', credit: 1, selectedGrade: 'A+' },       // 1 * 4.0 = 4.0
]; // Total Credits = 8, Total Points = 29.2, GPA = 29.2 / 8 = 3.65

const gpaRes1 = calculateSemesterGPA(testSubjects1, DEFAULT_GRADING_SCALE);
assert(Math.abs(gpaRes1.gpa - 3.65) < 0.001, 'GPA calculated correctly as 3.65', `Got ${gpaRes1.gpa}`);
assert(gpaRes1.total_credits === 8, 'Total credits equals 8', `Got ${gpaRes1.total_credits}`);
assert(Math.abs(gpaRes1.total_grade_points - 29.2) < 0.001, 'Total grade points equals 29.2', `Got ${gpaRes1.total_grade_points}`);

// 2. Zero-Credit Handling (Credit 0 is valid and does not distort GPA or cause division by zero)
console.log('\n--- 2. Zero-Credit Handling ---');
const testSubjectsWithZero: Subject[] = [
  { id: '1', subject_name: 'Core Module', credit: 3, selectedGrade: 'A' },          // 3 * 4.0 = 12
  { id: '2', subject_name: 'Non-Credit Seminar', credit: 0, selectedGrade: 'A+' },  // 0 * 4.0 = 0
];
const zeroCreditRes = calculateSemesterGPA(testSubjectsWithZero, DEFAULT_GRADING_SCALE);
assert(zeroCreditRes.gpa === 4.0, 'Zero-credit subject does not distort GPA (remains 4.0)', `Got ${zeroCreditRes.gpa}`);
assert(zeroCreditRes.total_credits === 3, 'Total credits excludes 0-credit subject correctly', `Got ${zeroCreditRes.total_credits}`);
assert(zeroCreditRes.subjects_count === 2, 'Subject count includes 0-credit subject (2 subjects)', `Got ${zeroCreditRes.subjects_count}`);

// Zero credits only
const onlyZeroCredit: Subject[] = [
  { id: '1', subject_name: 'Audit Course', credit: 0, selectedGrade: 'A' },
];
const onlyZeroRes = calculateSemesterGPA(onlyZeroCredit, DEFAULT_GRADING_SCALE);
assert(onlyZeroRes.gpa === 0, 'Handled 0 total credits without NaN or crash', `Got ${onlyZeroRes.gpa}`);

// 3. Multi-Semester CGPA Calculation
console.log('\n--- 3. Multi-Semester CGPA Calculation ---');
const testSemesters: Semester[] = [
  {
    semester_name: 'Semester 1',
    semester_order: 1,
    subjects: [
      { id: '1', subject_name: 'S1-M1', credit: 15, selectedGrade: 'A' } // 15 * 4.0 = 60
    ]
  },
  {
    semester_name: 'Semester 2',
    semester_order: 2,
    subjects: [
      { id: '2', subject_name: 'S2-M1', credit: 15, selectedGrade: 'B' } // 15 * 3.0 = 45
    ]
  }
]; // Total credits: 30, Total points: 105, CGPA: 105 / 30 = 3.50

const cgpaRes = calculateProfileCGPA(testSemesters, DEFAULT_GRADING_SCALE);
assert(Math.abs(cgpaRes.overall_cgpa - 3.50) < 0.001, 'Cumulative CGPA weighted accurately across semesters (3.50)', `Got ${cgpaRes.overall_cgpa}`);
assert(cgpaRes.overall_credits === 30, 'Total CGPA credits equal 30', `Got ${cgpaRes.overall_credits}`);
assert(cgpaRes.semesterResults.length === 2, 'Two semester results returned', `Got ${cgpaRes.semesterResults.length}`);

// 4. Subject Name Cleaning (Requirements: strip trailing hyphens, dashes, colons, duplicate punctuation, lecturer names)
console.log('\n--- 4. Subject Name Cleaning & Trailing Punctuation ---');
assert(
  cleanSubjectTitle('Programming Techniques -') === 'Programming Techniques',
  'Strips trailing hyphen: "Programming Techniques -" -> "Programming Techniques"',
  cleanSubjectTitle('Programming Techniques -')
);
assert(
  cleanSubjectTitle('Programming Techniques –') === 'Programming Techniques',
  'Strips trailing en-dash: "Programming Techniques –" -> "Programming Techniques"',
  cleanSubjectTitle('Programming Techniques –')
);
assert(
  cleanSubjectTitle('Advanced Algorithms :') === 'Advanced Algorithms',
  'Strips trailing colon: "Advanced Algorithms :" -> "Advanced Algorithms"',
  cleanSubjectTitle('Advanced Algorithms :')
);
assert(
  cleanSubjectTitle('Mathematics for Nano Science - 3 Credits') === 'Mathematics for Nano Science',
  'Strips trailing credits and hyphen: "Mathematics for Nano Science - 3 Credits" -> "Mathematics for Nano Science"',
  cleanSubjectTitle('Mathematics for Nano Science - 3 Credits')
);
assert(
  cleanSubjectTitle('Data Structures by Dr. Alan Turing Room 302') === 'Data Structures',
  'Strips lecturer names and room numbers',
  cleanSubjectTitle('Data Structures by Dr. Alan Turing Room 302')
);

// 5. Final-digit Credit Rule & Module Code Preservation
console.log('\n--- 5. Final-Digit Credit Rule ---');
function applyFinalDigitRule(moduleCode: string, explicitCredit?: number | null): number | null {
  if (explicitCredit !== undefined && explicitCredit !== null) return explicitCredit;
  const digits = moduleCode.match(/\d/g);
  if (digits && digits.length > 0) {
    const last = parseInt(digits[digits.length - 1], 10);
    if (!isNaN(last)) return last;
  }
  return null;
}

assert(applyFinalDigitRule('NANO2112') === 2, 'NANO2112 resolves to credit 2 via last digit');
assert(applyFinalDigitRule('NANO2151') === 1, 'NANO2151 resolves to credit 1 via last digit');
assert(applyFinalDigitRule('ETCH1210') === 0, 'ETCH1210 resolves to valid credit 0 via last digit');
assert(applyFinalDigitRule('PDEV1210') === 0, 'PDEV1210 resolves to valid credit 0 via last digit');
assert(applyFinalDigitRule('NANO2112', 3) === 3, 'Explicit credit takes priority over last digit');

// 6. Target GPA Calculation & Impossibility Boundaries
console.log('\n--- 6. Target GPA Calculation ---');
function calculateRequiredFutureGpa(
  currentGpa: number,
  completedCredits: number,
  targetGpa: number,
  futureCredits: number,
  maxGradePoint = 4.0
): { requiredGpa: number; isImpossible: boolean; isAlreadyAchieved: boolean } {
  const totalCredits = completedCredits + futureCredits;
  const targetTotalPoints = targetGpa * totalCredits;
  const currentTotalPoints = currentGpa * completedCredits;
  const requiredFuturePoints = targetTotalPoints - currentTotalPoints;
  const requiredGpa = requiredFuturePoints / futureCredits;

  return {
    requiredGpa,
    isImpossible: requiredGpa > maxGradePoint,
    isAlreadyAchieved: requiredGpa <= 0
  };
}

// Example 1: Current 3.2 on 60 credits, Target 3.5 on 30 future credits
// Total credits = 90. Target points = 3.5 * 90 = 315. Current points = 3.2 * 60 = 192.
// Required points = 123. Required GPA = 123 / 30 = 4.10 (> 4.0 -> Impossible!)
const target1 = calculateRequiredFutureGpa(3.2, 60, 3.5, 30, 4.0);
assert(Math.abs(target1.requiredGpa - 4.10) < 0.001, 'Target 1 requires 4.10 GPA');
assert(target1.isImpossible === true, 'Correctly flags 4.10 as mathematically impossible (> 4.0)');

// Example 2: Current 3.4 on 60 credits, Target 3.5 on 30 future credits
// Total points = 3.5 * 90 = 315. Current points = 3.4 * 60 = 204.
// Required points = 111. Required GPA = 111 / 30 = 3.70
const target2 = calculateRequiredFutureGpa(3.4, 60, 3.5, 30, 4.0);
assert(Math.abs(target2.requiredGpa - 3.70) < 0.001, 'Target 2 requires 3.70 GPA');
assert(target2.isImpossible === false, 'Target 2 is achievable');

// Example 3: Target already secured
const target3 = calculateRequiredFutureGpa(3.8, 60, 2.5, 30, 4.0);
assert(target3.isAlreadyAchieved === true, 'Target 3 correctly identified as already secured');

// 7. Duplicate Module Code Detection within Semester
console.log('\n--- 7. Duplicate Module Code Detection ---');
function detectDuplicateModules(modules: string[]): string[] {
  const counts: Record<string, number> = {};
  for (const m of modules) {
    const clean = m.trim().toUpperCase();
    if (clean) counts[clean] = (counts[clean] || 0) + 1;
  }
  return Object.entries(counts).filter(([_, c]) => c > 1).map(([m]) => m);
}

const dupList = detectDuplicateModules(['NANO2112', 'PHYS1101', 'NANO2112', 'CHEM101']);
assert(dupList.length === 1 && dupList[0] === 'NANO2112', 'Detects duplicate module code NANO2112 in semester');

const noDupList = detectDuplicateModules(['NANO2112', 'PHYS1101', 'CHEM101']);
assert(noDupList.length === 0, 'Passes when all module codes in semester are distinct');

// Summary
console.log('\n====================================================');
console.log(`Results: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('====================================================');

if (passedTests === totalTests) {
  console.log('All tests passed successfully! 🎉');
  process.exit(0);
} else {
  console.error('Some tests failed.');
  process.exit(1);
}
