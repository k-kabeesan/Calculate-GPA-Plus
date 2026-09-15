import { extractProfileFallbackClient, normalizeExtractedProfileClient } from '../src/services/dbService';

console.log('--- TEST 1: Course Text Subject & Credit Extraction ---');
const sampleText = `NANO01232    Fundamentals of Physics II
NANO01242    Computer Programming
NANO01252    Analogue Electronics
NANO01261    Basic Instrumental Techniques
NANO01273    Introduction to Biotechnology
NANO01282    Basic Statistics
ETCH1210     English For Technology II
PDEV1210     Career Development I`;

const result1 = extractProfileFallbackClient(sampleText);
console.log('Result 1 Profile Name:', JSON.stringify(result1.profileName));
console.log('Result 1 Subjects Count:', result1.subjects.length);
console.log('Result 1 Subjects List:');
result1.subjects.forEach((s: any) => {
  console.log(`  Module: ${s.moduleNumber} | Subject: ${s.subjectName} | Credit: ${s.credit}`);
});

// Assertions for Test 1
if (result1.profileName !== '') {
  console.error('FAIL: profileName should be empty string if not explicitly labelled.');
  process.exit(1);
}
if (result1.subjects.length !== 8) {
  console.error(`FAIL: Expected 8 subjects, got ${result1.subjects.length}`);
  process.exit(1);
}

const expectedCredits: Record<string, number> = {
  NANO01232: 2,
  NANO01242: 2,
  NANO01252: 2,
  NANO01261: 1,
  NANO01273: 3,
  NANO01282: 2,
  ETCH1210: 0,
  PDEV1210: 0,
};

for (const s of result1.subjects) {
  const expected = expectedCredits[s.moduleNumber];
  if (s.credit !== expected) {
    console.error(`FAIL for ${s.moduleNumber}: expected credit ${expected}, got ${s.credit}`);
    process.exit(1);
  }
}
console.log('>>> TEST 1 PASSED SUCCESSFULLY! <<<\n');

console.log('--- TEST 2: Header, Metadata & Lecturer Filtering ---');
const sampleText2 = `UNIVERSITY: University of Moratuwa
FACULTY: Faculty of Engineering
DEPARTMENT: Department of Electronic & Telecommunication Engineering
ACADEMIC YEAR: 2023/2024
SEMESTER: Semester 2
Lecturer: Prof. Rohana Kumara
Room: Lab 402
Time: 09:00 AM - 12:00 PM

MODULE CODE    SUBJECT NAME    CREDITS
NANO01232    Fundamentals of Physics II
ETCH1210     English For Technology II`;

const result2 = extractProfileFallbackClient(sampleText2);
console.log('University:', result2.university);
console.log('Faculty:', result2.faculty);
console.log('Department:', result2.department);
console.log('Academic Year:', result2.academicYear);
console.log('Semester:', result2.semester);
console.log('Profile Name:', JSON.stringify(result2.profileName));
console.log('Subjects Count:', result2.subjects.length);
result2.subjects.forEach((s: any) => {
  console.log(`  Module: ${s.moduleNumber} | Subject: ${s.subjectName} | Credit: ${s.credit}`);
});

if (result2.university !== 'University of Moratuwa' || result2.faculty !== 'Faculty of Engineering') {
  console.error('FAIL: Metadata extraction mismatch');
  process.exit(1);
}
if (result2.subjects.length !== 2) {
  console.error(`FAIL: Expected 2 subjects (skipping table headers and lecturers), got ${result2.subjects.length}`);
  process.exit(1);
}
console.log('>>> TEST 2 PASSED SUCCESSFULLY! <<<\n');

console.log('--- TEST 3: AI Normalization of Semester/Degree as Profile Name ---');
const rawAiOutput = {
  profileName: 'Semester 1 Academic Profile',
  university: 'University of Colombo',
  subjects: [
    { moduleNumber: 'NANO01232', subjectName: 'Fundamentals of Physics II', credit: 2 },
    { moduleNumber: 'ETCH1210', subjectName: 'English For Technology II', credit: '0' }
  ]
};
const normalized = normalizeExtractedProfileClient(rawAiOutput);
console.log('Normalized Profile Name:', JSON.stringify(normalized.profileName));
console.log('ETCH1210 Credit:', normalized.subjects[1].credit);

if (normalized.profileName !== '') {
  console.error('FAIL: Semester/Academic Profile as profile name should be cleared to empty string');
  process.exit(1);
}
if (normalized.subjects[1].credit !== 0) {
  console.error('FAIL: Credit 0 should be normalized to number 0, got', normalized.subjects[1].credit);
  process.exit(1);
}
console.log('>>> TEST 3 PASSED SUCCESSFULLY! <<<\n');

console.log('ALL TESTS PASSED SUCCESSFULLY!');
