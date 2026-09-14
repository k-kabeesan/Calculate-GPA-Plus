function cleanSubjectTitle(rawTitle) {
  if (!rawTitle) return '';
  let title = rawTitle
    // 1. Remove lecturer names with titles (Dr., Prof., Mr., Ms., Mrs., Professor, Doctor, Lecturer, Instructor)
    .replace(/\b(?:by\s+)?(?:Dr\.|Prof\.|Professor|Doctor|Mr\.|Ms\.|Mrs\.|Lecturer|Instructor|Teacher)\s+[A-Z][a-zA-Z'\-]*(?:\s+[A-Z][a-zA-Z'\-]*)*/gi, '')
    // 2. Remove room numbers and building/venue markers e.g. N3-04, N3-01, LH-1, Lab 2, Room 101
    .replace(/\b[A-Z]{1,3}\s*[-–—:]\s*\d{1,4}\b/g, '')
    .replace(/\b(?:Room|Lab|LH|Venue|Hall|Building|Campus|Classroom|Block)\s*[-:\s]?\s*[A-Z0-9]+\b/gi, '')
    // 3. Remove timetable times, days, periods e.g. 8:00 AM, 12:30, Monday, Tuesday
    .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g, '')
    .replace(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi, '')
    // 4. Remove timetable indicators e.g. (P), (T), (E), (L), [P], [T], Practical, Tutorial, Lecture, Exam
    .replace(/[\(\[\{]\s*(?:P|T|E|L|Practical|Tutorial|Lecture|Exam|Lab)\s*[\)\]\}]/gi, '')
    .replace(/\b(?:Practical|Tutorial|Lecture|Exam|Group\s*\d+|Batch\s*\d+)\b/gi, '')
    // 5. Remove credit expressions e.g. 3.0 Credits, 3 cr, 2.0
    .replace(/\b\d+(?:\.\d+)?\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)\b/gi, '')
    .replace(/[\(\[\{]\s*(?:credit[s]?|cr|pts?|units?)?\s*[\)\]\}]/gi, '')
    // 6. Remove leading/trailing hyphens, dashes, colons, bullets, punctuation
    .replace(/^[\s\-–—:•*#|.]+/, '')
    .replace(/[\s\-–—:•*#|.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip trailing punctuation
  title = title.replace(/[\s\-–—:;,\.]*$/, '').trim();
  return title;
}

function extractModuleCredit(moduleCode, rawCredit) {
  // Requirement 3: Deterministic credit extraction from final numeric digit of module code
  if (moduleCode) {
    const digits = moduleCode.match(/\d/g);
    if (digits && digits.length > 0) {
      const lastDigitVal = parseInt(digits[digits.length - 1], 10);
      if (!isNaN(lastDigitVal) && lastDigitVal >= 0 && lastDigitVal <= 9) {
        return lastDigitVal; // Requirement 2 & 3: 0 is valid, 1-9 is valid
      }
    }
  }
  if (rawCredit !== null && rawCredit !== undefined && rawCredit !== '' && !isNaN(Number(rawCredit))) {
    const parsed = Number(rawCredit);
    if (parsed >= 0) return parsed;
  }
  return null;
}

function processLine(line) {
  // Ignore headings or timetable administrative lines
  if (/^(?:PROFILE|PROFILE NAME|SUBJECTS|MODULES|COURSES|CALCULATIONS|SEMESTER|TIMETABLE|LECTURER|FACULTY|UNIVERSITY|DEGREE|ACADEMIC YEAR|RESULTS|GRADES|SYLLABUS|SL\.\s*NO|SR\.\s*NO|MODULE CODE|SUBJECT NAME|CREDITS?)\s*:?$/i.test(line)) {
    return null;
  }
  if (/^(?:Dr\.|Prof\.|Professor|Doctor|Lecturer|Instructor|Teacher|Taught\s+by|Staff|Email|Phone|Tel|Contact|Room|Lab|LH|Venue|Building|Time|Day|Date|Page\s*\d+)/i.test(line)) {
    return null;
  }

  const moduleMatch = line.match(/^([A-Z]{2,6}\s*[-–—]?\s*\d{3,5})\s*(?:[-–—:]|\s{2,}|\t|\s+)\s*(.+)$/i);
  if (!moduleMatch) return null;

  const moduleCode = moduleMatch[1].replace(/\s+/g, '').toUpperCase();
  const rawRemaining = moduleMatch[2].trim();

  const credit = extractModuleCredit(moduleCode, null);
  const subjectName = cleanSubjectTitle(rawRemaining);

  return {
    moduleCode,
    subjectName: subjectName || moduleCode,
    credit
  };
}

const testSample = `UNIVERSITY: University of Colombo
FACULTY: Faculty of Science
DEPARTMENT: Department of Computer Science
ACADEMIC YEAR: 2024/2025

PROFILE
NAME: N3-01

NANO01211 Chemistry Laboratory I Dr. Murthi Kandanapitiye
NANO01222 Chemical Concepts and Calculations Dr. Murthi Kandanapitiye
NANO01232 Fundamentals of Physics II Dr. Upanith Liyanaarachchi
NANO01242 Computer Programming Dr. Upeka Samarakoon
NANO01252 Analogue Electronics Dr. Upanith Liyanaarachchi
NANO01261 Basic Instrumental techniques Dr. Murthi Kandanapitiye
NANO01273 Introduction to Biotechnology Dr. Nimali De Silva
NANO01282 Basic Statistics Dr. Ashane Fernando
ETCH1210 English For Technology II Dr. Sajeeewani Fernando
PDEV1210 Career Development I Dr. Mihira Wanninayaka
NANO01273 Introduction to Biotechnology (Practical Session N3-04)`;

console.log('=== TESTING AI / REGEX EXTRACTION ON PROMPT SAMPLE ===\n');

const lines = testSample.split('\n').map(l => l.trim()).filter(Boolean);
const extracted = [];
const seenCodes = new Set();

for (const line of lines) {
  const result = processLine(line);
  if (result) {
    if (seenCodes.has(result.moduleCode)) {
      console.log(`[DE-DUPLICATED DUPLICATE ENTRY]: ${result.moduleCode}`);
      continue;
    }
    seenCodes.add(result.moduleCode);
    extracted.push(result);
  }
}

console.log('\nExtracted Subjects Result:');
extracted.forEach(s => console.log(`${s.moduleCode} | ${s.subjectName} | ${s.credit}`));
