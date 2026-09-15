import { extractProfileFallbackClient, normalizeExtractedProfileClient } from '../src/services/dbService';

console.log('=== VISION AI EXTRACTOR VERIFICATION TESTS ===\n');

// 1. Multiple subjects & Credit rule tests (NANO2112 -> 2, NANO2151 -> 1, NANO2162 -> 2, NANO2172 -> 2, ETCH2111 -> 1, ETCH1210 -> 0)
console.log('--- TEST 1: Credit rule last-digit calculation ---');
const sampleText1 = `NANO2112 – Mathematics for Nano Science Technology I
NANO2151 – Physics for Nano Science Lab
NANO2162 – Chemistry Fundamentals
NANO2172 – Materials Science
ETCH2111 – Technical English
ETCH1210 – Basic Communication Skills
PDEV1210 – Career Development I`;

const res1 = extractProfileFallbackClient(sampleText1);
console.log('Subjects Count:', res1.subjects.length);

const expectedCredits: Record<string, number> = {
  NANO2112: 2,
  NANO2151: 1,
  NANO2162: 2,
  NANO2172: 2,
  ETCH2111: 1,
  ETCH1210: 0,
  PDEV1210: 0,
};

res1.subjects.forEach((s: any) => {
  console.log(`  Code: ${s.moduleNumber} | Title: ${s.subjectName} | Credit: ${s.credit}`);
  if (s.credit !== expectedCredits[s.moduleNumber]) {
    console.error(`FAIL: ${s.moduleNumber} expected credit ${expectedCredits[s.moduleNumber]}, got ${s.credit}`);
    process.exit(1);
  }
});
console.log('>>> TEST 1 PASSED: Credit extraction & 0-credit validity verified! <<<\n');


// 2. Ignore lecturer names, room numbers, class times, phone, email, timetable info
console.log('--- TEST 2: Ignore Lecturers, Instructors, Timetables & Rooms ---');
const sampleText2 = `UNIVERSITY: University of Moratuwa
FACULTY: Faculty of Engineering
DEPARTMENT: Department of Materials Science
ACADEMIC YEAR: 2024/2025
SEMESTER: Semester 1

Lecturer: Dr. John Smith (Phone: +94771234567, Email: john@uom.lk)
Instructor: Ms. Jane Doe
Venue: Lab 302 (Building A)
Time: 10:00 AM - 12:00 PM (Mondays)

NANO2112 – Mathematics for Nano Science Technology I (Taught by Prof. Wickramasinghe)
ETCH1210 – Basic Communication Skills`;

const res2 = extractProfileFallbackClient(sampleText2);
console.log('University:', res2.university);
console.log('Faculty:', res2.faculty);
console.log('Subjects Count:', res2.subjects.length);

if (res2.subjects.length !== 2) {
  console.error(`FAIL: Expected 2 subjects, got ${res2.subjects.length}`);
  process.exit(1);
}

for (const s of res2.subjects) {
  if (/Dr\.|Prof\.|Lecturer|Instructor|Lab\s*302|10:00/i.test(s.subjectName)) {
    console.error(`FAIL: Subject title contains ignored metadata: ${s.subjectName}`);
    process.exit(1);
  }
}
console.log('>>> TEST 2 PASSED: Ignored lecturers, instructors, times & rooms! <<<\n');


// 3. OpenRouter Vision Output Normalization (Checking semester/degree profile name clearing)
console.log('--- TEST 3: Vision Output JSON Normalization & Profile Name Rules ---');
const rawVisionOutput = {
  profileName: 'BSc Engineering Semester 1 Academic Profile',
  university: 'University of Peradeniya',
  faculty: 'Faculty of Engineering',
  department: 'Department of Electrical Engineering',
  academicYear: '2024/2025',
  semester: 'Semester 1',
  subjects: [
    { moduleNumber: 'NANO2112', subjectName: 'Mathematics for Nano Science Technology I', credit: null },
    { moduleNumber: 'ETCH2111', subjectName: 'Technical English', credit: '1' },
    { moduleNumber: 'ETCH1210', subjectName: 'Basic Communication Skills', credit: 0 }
  ]
};

const normalized = normalizeExtractedProfileClient(rawVisionOutput);
console.log('Normalized Profile Name:', JSON.stringify(normalized.profileName));
console.log('Subject 1 (NANO2112) Last-Digit Credit:', normalized.subjects[0].credit);
console.log('Subject 3 (ETCH1210) 0 Credit:', normalized.subjects[2].credit);

if (normalized.profileName !== '') {
  console.error('FAIL: Profile Name should be cleared when non-explicit');
  process.exit(1);
}
if (normalized.subjects[0].credit !== 2) {
  console.error('FAIL: NANO2112 last digit credit should be 2, got', normalized.subjects[0].credit);
  process.exit(1);
}
if (normalized.subjects[2].credit !== 0) {
  console.error('FAIL: ETCH1210 credit 0 should be 0, got', normalized.subjects[2].credit);
  process.exit(1);
}
console.log('>>> TEST 3 PASSED: Vision Output JSON successfully normalized! <<<\n');

console.log('ALL VISION ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY!');
