function cleanSubjectTitle(rawTitle) {
  if (!rawTitle) return '';
  let title = rawTitle
    .replace(/\b(?:by\s+)?(?:Dr\.|Prof\.|Professor|Doctor|Mr\.|Ms\.|Mrs\.|Lecturer|Instructor|Teacher)\s+[A-Z][a-zA-Z'\-]*(?:\s+[A-Z][a-zA-Z'\-]*)*/gi, '')
    .replace(/\b[A-Z]{1,3}\s*[-–—:]\s*\d{1,4}\b/g, '')
    .replace(/\b(?:Room|LH|Venue|Hall|Building|Campus|Classroom|Block)\s*[-:\s]?\s*[A-Z0-9]+\b/gi, '')
    .replace(/\bLab\s*[-:\s]?\s*\d+\b/gi, '')
    .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g, '')
    .replace(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi, '')
    .replace(/[\(\[\{]\s*(?:P|T|E|L|Practical|Tutorial|Lecture|Exam)\s*[\)\]\}]/gi, '')
    .replace(/\b(?:Practical\s+Session|Tutorial\s+Session|Lecture\s+Session|Exam\s+Session|Group\s*\d+|Batch\s*\d+)\b/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)\b/gi, '')
    .replace(/[\(\[\{]\s*(?:credit[s]?|cr|pts?|units?)?\s*[\)\]\}]/gi, '')
    .replace(/^[\s\-–—:•*#|.]+/, '')
    .replace(/[\s\-–—:•*#|.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return title;
}

function extractProfileFallbackClient(inputText) {
  const lines = inputText.split('\n').map(l => l.trim()).filter(Boolean);
  const subjects = [];
  const seenCodes = new Set();

  for (const line of lines) {
    if (/^(?:Dr\.|Prof\.|Professor|Doctor|Lecturer|Instructor|Teacher|Taught\s+by|Staff|Email|Phone|Tel|Contact|Room|Lab|LH|Venue|Building|Time|Day|Date|Page\s*\d+)/i.test(line)) {
      continue;
    }

    const codeMatch = line.match(/^([A-Z]{2,6}\s*[-–—]?\s*\d{3,5}[A-Z]?)\b\s*[-–—:|]?\s*(.*)$/i);
    let moduleNumber = '';
    let remainingLine = '';

    if (codeMatch) {
      moduleNumber = codeMatch[1].replace(/\s+/g, '').toUpperCase();
      remainingLine = codeMatch[2].trim();
    }

    if (moduleNumber) {
      if (seenCodes.has(moduleNumber)) continue;
    }

    if (moduleNumber) {
      let credit = null;
      let subjectTitle = remainingLine || line;

      const digits = moduleNumber.match(/\d/g);
      if (digits && digits.length > 0) {
        const lastDigitVal = parseInt(digits[digits.length - 1], 10);
        if (!isNaN(lastDigitVal) && lastDigitVal >= 0 && lastDigitVal <= 9) {
          credit = lastDigitVal;
        }
      }

      subjectTitle = cleanSubjectTitle(subjectTitle);

      seenCodes.add(moduleNumber);
      subjects.push({
        moduleNumber,
        subjectName: subjectTitle,
        credit
      });
    }
  }

  return { subjects };
}

const sampleText = `
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
`;

const result = extractProfileFallbackClient(sampleText);
console.log("=== EXTRACTION RESULT ===");
result.subjects.forEach((s) => {
  console.log(`${s.moduleNumber} | ${s.subjectName} | ${s.credit}`);
});

const expected = [
  { code: 'NANO01211', title: 'Chemistry Laboratory I', credit: 1 },
  { code: 'NANO01222', title: 'Chemical Concepts and Calculations', credit: 2 },
  { code: 'NANO01232', title: 'Fundamentals of Physics II', credit: 2 },
  { code: 'NANO01242', title: 'Computer Programming', credit: 2 },
  { code: 'NANO01252', title: 'Analogue Electronics', credit: 2 },
  { code: 'NANO01261', title: 'Basic Instrumental techniques', credit: 1 },
  { code: 'NANO01273', title: 'Introduction to Biotechnology', credit: 3 },
  { code: 'NANO01282', title: 'Basic Statistics', credit: 2 },
  { code: 'ETCH1210', title: 'English For Technology II', credit: 0 },
  { code: 'PDEV1210', title: 'Career Development I', credit: 0 }
];

let failed = false;
expected.forEach(exp => {
  const match = result.subjects.find(s => s.moduleNumber === exp.code);
  if (!match) {
    console.error(`FAILED: ${exp.code} missing!`);
    failed = true;
  } else if (match.credit !== exp.credit) {
    console.error(`FAILED: ${exp.code} expected credit ${exp.credit}, got ${match.credit}`);
    failed = true;
  } else if (match.subjectName.toLowerCase() !== exp.title.toLowerCase()) {
    console.error(`FAILED: ${exp.code} expected title "${exp.title}", got "${match.subjectName}"`);
    failed = true;
  }
});

if (!failed) {
  console.log("\n✓ ALL PROMPT SAMPLE MODULES & CREDITS MATCH EXACTLY (0 preserved as 0, no lecturer names)!");
} else {
  process.exit(1);
}
