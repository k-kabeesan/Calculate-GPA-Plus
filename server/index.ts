import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import db from './db';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Utility to generate a short readable profile ID (e.g., ABC123, WUSL77)
function generateProfileId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Hash passcode helper
function hashPasscode(passcode: string): string {
  if (!passcode) return '';
  return crypto.createHash('sha256').update(passcode).digest('hex');
}

// Default grading scale
const DEFAULT_GRADING_SCALE = [
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



// Fallback NLP Extractor Function when AI API key is omitted or service is unavailable
function extractProfileFallback(inputText: string) {
  const lines = inputText.split('\n').map(l => l.trim()).filter(Boolean);
  
  let profile_name = '';
  let university = 'Not detected';
  let faculty = 'Not detected';
  let department = 'Not detected';
  let academic_year = 'Not detected';
  let semesterName = 'Not detected';

  const extractedSubjects: Array<{ subject_code: string; subject_name: string; credit: number | null }> = [];

  for (const line of lines) {
    // Skip lecturer, staff, room, time, contact, or page number lines
    if (/^(?:Dr\.|Prof\.|Professor|Doctor|Lecturer|Instructor|Teacher|Taught\s+by|Staff|Email|Phone|Tel|Contact|Room|Lab|LH|Venue|Building|Time|Day|Date|Page\s*\d+)/i.test(line)) {
      continue;
    }
    if (/\b(?:@|http|www\.|AM|PM|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(line) && !/^[A-Z]{2,6}\s*[-–—]?\s*\d{3,5}/i.test(line)) {
      continue;
    }

    // 1. Explicit / Labelled Metadata Detection
    if (/^(?:PROFILE\s*NAME|PROFILE)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:PROFILE\s*NAME|PROFILE)\s*:\s*(.+)/i);
      if (match && match[1]) profile_name = match[1].trim();
      continue;
    }
    if (/^(?:UNIVERSITY|UNI|INSTITUTION)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:UNIVERSITY|UNI|INSTITUTION)\s*:\s*(.+)/i);
      if (match && match[1]) university = match[1].trim();
      continue;
    }
    if (/^(?:FACULTY|SCHOOL|COLLEGE)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:FACULTY|SCHOOL|COLLEGE)\s*:\s*(.+)/i);
      if (match && match[1]) faculty = match[1].trim();
      continue;
    }
    if (/^(?:DEPARTMENT|DEPT)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:DEPARTMENT|DEPT)\s*:\s*(.+)/i);
      if (match && match[1]) department = match[1].trim();
      continue;
    }
    if (/^(?:ACADEMIC\s*YEAR|YEAR|BATCH)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:ACADEMIC\s*YEAR|YEAR|BATCH)\s*:\s*(.+)/i);
      if (match && match[1]) academic_year = match[1].trim();
      continue;
    }
    if (/^(?:SEMESTER|TERM)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:SEMESTER|TERM)\s*:\s*(.+)/i);
      if (match && match[1]) semesterName = match[1].startsWith('Semester') ? match[1].trim() : `Semester ${match[1].trim()}`;
      continue;
    }

    // 2. Unlabelled Header Heuristics (Do NOT convert headings to subjects)
    if (university === 'Not detected' && /^(?:University|Institute|College|Academy)\b/i.test(line)) {
      university = line.trim();
      continue;
    }
    if (faculty === 'Not detected' && /^(?:Faculty|School)\s+of\b/i.test(line)) {
      faculty = line.trim();
      continue;
    }
    if (department === 'Not detected' && /^(?:Department|Dept\.)\s+of\b/i.test(line)) {
      department = line.trim();
      continue;
    }
    if (academic_year === 'Not detected' && /\b(20\d{2}[-/]20\d{2}|Year\s+[1-5]|Academic\s+Year\s+\d+)\b/i.test(line)) {
      const match = line.match(/\b(20\d{2}[-/]20\d{2}|Year\s+[1-5]|Academic\s+Year\s+\d+)\b/i);
      if (match) academic_year = match[1].trim();
      continue;
    }
    if (semesterName === 'Not detected' && /\b(Semester\s+[1-8]|Sem\s+[1-8]|Term\s+[1-4])\b/i.test(line)) {
      const match = line.match(/\b(Semester\s+[1-8]|Sem\s+[1-8]|Term\s+[1-4])\b/i);
      if (match) semesterName = match[1].trim();
      continue;
    }

    // Skip section headers, titles, or notes
    if (/^(?:SUBJECTS|MODULES|COURSES|INSTRUCTIONS?|NOTES?|TIMETABLE|RESULTS?|GRADES?|SYLLABUS|COURSE OUTLINE|MODULE LIST|SL\.\s*NO|SR\.\s*NO)\s*:?$/i.test(line)) {
      continue;
    }

    // 3. Subject Extraction Rule
    const codeMatch = line.match(/^([A-Z]{2,6}\s*[-–—]?\s*\d{3,5}[A-Z]?)\b\s*[-–—:|]?\s*(.*)$/i);
    let subjectCode = '';
    let remainingLine = '';

    if (codeMatch) {
      subjectCode = codeMatch[1].replace(/\s+/g, '').toUpperCase();
      remainingLine = codeMatch[2].trim();
    } else {
      const parts = line.split(/[-–—|]/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        if (/^[A-Z]{2,6}\s*\d{3,5}[A-Z]?$/i.test(parts[0])) {
          subjectCode = parts[0].replace(/\s+/g, '').toUpperCase();
          remainingLine = parts.slice(1).join(' - ');
        }
      }
    }

    if (subjectCode || (remainingLine && !/^(?:University|Faculty|Department|Semester|Academic Year|Grade|Point|Marks|Total|GPA|CGPA|Credit|Lecturer|Dr\.|Prof\.)/i.test(line))) {
      let credit: number | null = null;
      let subjectTitle = remainingLine || line;

      // Strip lecturer names, rooms, or times trailing in the subject title
      subjectTitle = subjectTitle
        .replace(/\b(?:by\s+)?(?:Dr\.|Prof\.|Professor|Mr\.|Ms\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi, '')
        .replace(/\b(?:Room|Lab|LH|Venue|Hall)\s*[-:\s]?\s*[A-Z0-9]+/gi, '')
        .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g, '')
        .trim();

      // Explicit credit regex matching (supports 0, 0.5, 1, 2, 3, 4, etc.)
      const trailingCreditMatch = subjectTitle.match(/[-–—:|]?\s*(\d+(?:\.\d+)?)\s*(?:credits?|cr|pts?)?\s*$/i);
      const explicitCreditMatch = subjectTitle.match(/(?:^|[-–—:|,\s])(\d+(?:\.\d+)?)\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)?(?:$|[\)\s])/i);

      if (trailingCreditMatch && trailingCreditMatch[1] !== undefined) {
        const val = parseFloat(trailingCreditMatch[1]);
        if (!isNaN(val) && val >= 0 && val <= 12) {
          credit = val;
          subjectTitle = subjectTitle.substring(0, trailingCreditMatch.index).trim();
        }
      } else if (explicitCreditMatch && explicitCreditMatch[1] !== undefined) {
        const val = parseFloat(explicitCreditMatch[1]);
        if (!isNaN(val) && val >= 0 && val <= 12) {
          credit = val;
        }
      }

      subjectTitle = subjectTitle
        .replace(/^[-–—:|]+/, '')
        .replace(/[-–—:|]+$/, '')
        .replace(/\b\d+(?:\.\d+)?\s*(?:credits?|cr|pts?)\b/gi, '')
        .trim();

      if (!subjectTitle && subjectCode) {
        subjectTitle = subjectCode;
      }

      if (subjectTitle || subjectCode) {
        extractedSubjects.push({
          subject_code: subjectCode,
          subject_name: subjectTitle,
          credit: credit // null if missing/unspecified; 0 if explicitly 0
        });
      }
    }
  }

  if (!profile_name) {
    if (university !== 'Not detected') {
      profile_name = `${university}${academic_year !== 'Not detected' ? ' - ' + academic_year : ''}`;
    } else {
      profile_name = 'Academic Profile';
    }
  }

  return {
    profile_name,
    university,
    faculty,
    department,
    academic_year,
    semester: semesterName,
    semesters: [
      {
        semester_name: semesterName !== 'Not detected' ? semesterName : 'Semester 1',
        subjects: extractedSubjects
      }
    ]
  };
}

function cleanAndParseJson(text: string): any {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

// POST /api/ai/extract-profile - AI extraction endpoint (Supports Text & Base64 Image Vision)
app.post('/api/ai/extract-profile', async (req: Request, res: Response) => {
  try {
    const { text, image } = req.body;
    if ((!text || typeof text !== 'string' || !text.trim()) && !image) {
      return res.status(400).json({ error: 'Syllabus/course text or image payload is required.' });
    }

    const apiKey = process.env.AI_API_KEY || '';
    const model = process.env.AI_MODEL || 'llama-3.1-8b-instant';
    const apiUrl = process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

    if (apiKey && apiKey.trim()) {
      const systemPrompt = `You are a strict academic curriculum & OCR extractor.
Analyze the user's text or image document and extract profile details and subject modules ONLY.
You MUST intelligently distinguish and extract:
University -> Faculty -> Department -> Academic Year -> Semester -> Subject -> Module Number -> Credit

Output ONLY valid JSON matching this schema:
{
  "profile_name": "string",
  "university": "string",
  "faculty": "string",
  "department": "string",
  "degree": "string",
  "academic_year": "string",
  "semester": "string",
  "semesters": [
    {
      "semester_name": "string",
      "subjects": [
        {
          "subject_code": "string",
          "subject_name": "string",
          "credit": 0
        }
      ]
    }
  ]
}

STRICT MANDATORY RULES:
1. ZERO CREDIT IS VALID: 0 is a completely valid credit value (e.g. "PDEV2110 - Career Development - 0" -> "credit": 0). Do NOT change 0 credit to null or 1!
2. SUBJECTS ONLY: Extract ONLY academic course/module entries.
   - NEVER extract lecturer names, instructor names, staff names (e.g., "Dr. Smith", "Prof. Perera").
   - NEVER create subjects from contact info, emails, room numbers (e.g., "LH-2", "Lab 1"), class times ("8:00 AM"), dates, or notes.
   - Do NOT include lecturer names in subject titles!
3. ACCURACY OVER COMPLETENESS: Prioritize accuracy over extracting everything visible in the image. If uncertain whether text is a subject, do NOT add it as a subject.
4. CREDIT DETECTION:
   - If credit is explicitly stated (including 0), set "credit": <number>.
   - If credit is NOT explicitly stated at all in text/image, set "credit": null.
5. Output JSON ONLY.`;

      try {
        let messagesPayload: any[] = [{ role: 'system', content: systemPrompt }];

        if (image) {
          messagesPayload.push({
            role: 'user',
            content: [
              { type: 'text', text: 'Extract academic profile metadata and subject list from this university document image.' },
              { type: 'image_url', image_url: { url: image } }
            ]
          });
        } else {
          messagesPayload.push({ role: 'user', content: text });
        }

        const aiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: messagesPayload,
            temperature: 0.1
          })
        });

        if (aiResponse.ok) {
          const data: any = await aiResponse.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = cleanAndParseJson(content);
            return res.json({ success: true, profile: parsed, method: image ? 'ai_vision' : 'ai' });
          }
        }
      } catch (aiErr) {
        console.warn('AI provider fetch failed, falling back to NLP parser:', aiErr);
      }
    }

    // Fallback if no key or API failed
    if (text) {
      const fallbackProfile = extractProfileFallback(text);
      return res.json({ success: true, profile: fallbackProfile, method: 'fallback' });
    } else {
      return res.status(400).json({ error: 'AI key unavailable for direct vision processing. Please use client-side OCR text extraction.' });
    }
  } catch (error: any) {
    try {
      const fallbackProfile = extractProfileFallback(req.body.text || '');
      return res.json({ success: true, profile: fallbackProfile, method: 'fallback_error' });
    } catch {
      res.status(500).json({ error: error.message || 'Failed to extract profile.' });
    }
  }
});

// GET /api/profiles/filters - Return available filter options from database
app.get('/api/profiles/filters', (req: Request, res: Response) => {
  try {
    const universities = db.prepare("SELECT DISTINCT university FROM profiles WHERE visibility = 'public' AND university != '' ORDER BY university ASC").all().map((r: any) => r.university);
    const faculties = db.prepare("SELECT DISTINCT faculty FROM profiles WHERE visibility = 'public' AND faculty != '' ORDER BY faculty ASC").all().map((r: any) => r.faculty);
    const departments = db.prepare("SELECT DISTINCT department FROM profiles WHERE visibility = 'public' AND department != '' ORDER BY department ASC").all().map((r: any) => r.department);
    const academicYears = db.prepare("SELECT DISTINCT academic_year FROM profiles WHERE visibility = 'public' AND academic_year != '' ORDER BY academic_year DESC").all().map((r: any) => r.academic_year);

    res.json({
      universities,
      faculties,
      departments,
      degrees: [],
      academicYears
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/profiles - List public profiles with multi-filtering
app.get('/api/profiles', (req: Request, res: Response) => {
  try {
    const {
      search = '',
      university = '',
      faculty = '',
      department = '',
      academic_year = '',
      semester = ''
    } = req.query;

    let queryStr = `
      SELECT p.id, p.profile_name, p.university, p.faculty, p.department, p.academic_year, p.visibility, p.created_at,
             (SELECT COUNT(*) FROM semesters s WHERE s.profile_id = p.id) as semester_count,
             (SELECT COUNT(*) FROM subjects sub JOIN semesters sem ON sub.semester_id = sem.id WHERE sem.profile_id = p.id) as total_subjects,
             (SELECT SUM(sub.credit) FROM subjects sub JOIN semesters sem ON sub.semester_id = sem.id WHERE sem.profile_id = p.id) as total_credits
      FROM profiles p
      WHERE p.visibility = 'public'
    `;

    const params: any[] = [];

    if (search && (search as string).trim()) {
      const term = `%${(search as string).trim()}%`;
      queryStr += ` AND (p.profile_name LIKE ? OR p.university LIKE ? OR p.faculty LIKE ? OR p.department LIKE ? OR p.id LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    if (university && (university as string).trim()) {
      queryStr += ` AND p.university = ?`;
      params.push((university as string).trim());
    }

    if (faculty && (faculty as string).trim()) {
      queryStr += ` AND p.faculty = ?`;
      params.push((faculty as string).trim());
    }

    if (department && (department as string).trim()) {
      queryStr += ` AND p.department = ?`;
      params.push((department as string).trim());
    }

    if (academic_year && (academic_year as string).trim()) {
      queryStr += ` AND p.academic_year = ?`;
      params.push((academic_year as string).trim());
    }

    if (semester && (semester as string).trim()) {
      const semTerm = `%${(semester as string).trim()}%`;
      queryStr += ` AND EXISTS (SELECT 1 FROM semesters s WHERE s.profile_id = p.id AND (s.semester_name LIKE ? OR CAST(s.semester_order AS TEXT) = ?))`;
      params.push(semTerm, (semester as string).trim());
    }

    queryStr += ` ORDER BY p.created_at DESC LIMIT 50`;

    const profiles = db.prepare(queryStr).all(...params);

    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/profiles/:id - Fetch single profile with all details
app.get('/api/profiles/:id', (req: Request, res: Response) => {
  try {
    const profileId = (req.params.id as string).toUpperCase();
    const profile = db.prepare(`
      SELECT id, profile_name, university, faculty, department, academic_year, description, visibility, created_at, updated_at,
             CASE WHEN passcode_hash IS NOT NULL AND passcode_hash != '' THEN 1 ELSE 0 END as has_passcode
      FROM profiles WHERE id = ?
    `).get(profileId) as any;

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found. Please check the Profile ID or URL link.' });
    }

    // Get semesters
    const semesters = db.prepare('SELECT id, semester_name, semester_order FROM semesters WHERE profile_id = ? ORDER BY semester_order ASC').all(profileId) as any[];

    // For each semester, get subjects
    for (const sem of semesters) {
      sem.subjects = db.prepare('SELECT id, subject_code, subject_name, credit FROM subjects WHERE semester_id = ? ORDER BY id ASC').all(sem.id);
    }

    // Get custom grading scale or default
    let gradingScale = db.prepare('SELECT grade, grade_point FROM grading_scales WHERE profile_id = ? ORDER BY grade_point DESC').all(profileId) as any[];
    if (!gradingScale || gradingScale.length === 0) {
      gradingScale = DEFAULT_GRADING_SCALE;
    }

    res.json({
      ...profile,
      semesters,
      gradingScale
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profiles - Create a new profile
app.post('/api/profiles', (req: Request, res: Response) => {
  try {
    const {
      profile_name,
      university = '',
      faculty = '',
      department = '',
      academic_year = '',
      description = '',
      visibility = 'public',
      passcode = '',
      semesters = [],
      gradingScale = DEFAULT_GRADING_SCALE
    } = req.body;

    if (!profile_name || !profile_name.trim()) {
      return res.status(400).json({ error: 'Profile Name is required.' });
    }

    // Ensure unique profile ID
    let profileId = generateProfileId();
    while (db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)) {
      profileId = generateProfileId();
    }

    const hashed = hashPasscode(passcode);

    const insertProfile = db.prepare(`
      INSERT INTO profiles (id, profile_name, university, faculty, department, degree, academic_year, description, visibility, passcode_hash)
      VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?)
    `);
    const insertSemester = db.prepare(`
      INSERT INTO semesters (profile_id, semester_name, semester_order)
      VALUES (?, ?, ?)
    `);
    const insertSubject = db.prepare(`
      INSERT INTO subjects (semester_id, subject_code, subject_name, credit)
      VALUES (?, ?, ?, ?)
    `);
    const insertScale = db.prepare(`
      INSERT INTO grading_scales (profile_id, grade, grade_point)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertProfile.run(
        profileId,
        profile_name.trim(),
        (university || '').trim(),
        (faculty || '').trim(),
        (department || '').trim(),
        (academic_year || '').trim(),
        (description || '').trim(),
        visibility,
        hashed
      );

      let order = 1;
      for (const sem of semesters) {
        const semResult = insertSemester.run(profileId, sem.semester_name || `Semester ${order}`, sem.semester_order || order);
        const semId = semResult.lastInsertRowid;

        if (sem.subjects && Array.isArray(sem.subjects)) {
          for (const sub of sem.subjects) {
            const creditVal = parseFloat(sub.credit);
            if (sub.subject_name && !isNaN(creditVal) && creditVal > 0) {
              insertSubject.run(semId, sub.subject_code || '', sub.subject_name.trim(), creditVal);
            }
          }
        }
        order++;
      }

      const scalesToInsert = (gradingScale && gradingScale.length > 0) ? gradingScale : DEFAULT_GRADING_SCALE;
      for (const gs of scalesToInsert) {
        insertScale.run(profileId, gs.grade.trim(), parseFloat(gs.grade_point));
      }
    });

    transaction();

    res.status(201).json({
      success: true,
      id: profileId,
      message: 'Profile created successfully!'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profiles/:id/verify-passcode
app.post('/api/profiles/:id/verify-passcode', (req: Request, res: Response) => {
  try {
    const profileId = (req.params.id as string).toUpperCase();
    const { passcode } = req.body;

    const profile = db.prepare('SELECT passcode_hash FROM profiles WHERE id = ?').get(profileId) as any;
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!profile.passcode_hash) {
      // No passcode required
      return res.json({ valid: true });
    }

    const hashed = hashPasscode(passcode || '');
    if (hashed === profile.passcode_hash) {
      return res.json({ valid: true });
    } else {
      return res.status(401).json({ valid: false, error: 'Incorrect owner passcode.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profiles/:id - Update profile
app.put('/api/profiles/:id', (req: Request, res: Response) => {
  try {
    const profileId = (req.params.id as string).toUpperCase();
    const {
      passcode,
      profile_name,
      university = '',
      faculty = '',
      department = '',
      academic_year = '',
      description = '',
      visibility = 'public',
      semesters = [],
      gradingScale = DEFAULT_GRADING_SCALE
    } = req.body;

    const existing = db.prepare('SELECT passcode_hash FROM profiles WHERE id = ?').get(profileId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (existing.passcode_hash) {
      const hashedInput = hashPasscode(passcode || '');
      if (hashedInput !== existing.passcode_hash) {
        return res.status(401).json({ error: 'Unauthorized. Invalid owner passcode.' });
      }
    }

    const updateProfile = db.prepare(`
      UPDATE profiles
      SET profile_name = ?, university = ?, faculty = ?, department = ?, academic_year = ?, description = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const deleteSemesters = db.prepare('DELETE FROM semesters WHERE profile_id = ?');
    const deleteScales = db.prepare('DELETE FROM grading_scales WHERE profile_id = ?');

    const insertSemester = db.prepare(`
      INSERT INTO semesters (profile_id, semester_name, semester_order)
      VALUES (?, ?, ?)
    `);
    const insertSubject = db.prepare(`
      INSERT INTO subjects (semester_id, subject_code, subject_name, credit)
      VALUES (?, ?, ?, ?)
    `);
    const insertScale = db.prepare(`
      INSERT INTO grading_scales (profile_id, grade, grade_point)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      updateProfile.run(
        profile_name.trim(),
        (university || '').trim(),
        (faculty || '').trim(),
        (department || '').trim(),
        (academic_year || '').trim(),
        (description || '').trim(),
        visibility,
        profileId
      );

      deleteSemesters.run(profileId);
      deleteScales.run(profileId);

      let order = 1;
      for (const sem of semesters) {
        const semResult = insertSemester.run(profileId, sem.semester_name || `Semester ${order}`, order);
        const semId = semResult.lastInsertRowid;

        if (sem.subjects && Array.isArray(sem.subjects)) {
          for (const sub of sem.subjects) {
            const creditVal = parseFloat(sub.credit);
            if (sub.subject_name && !isNaN(creditVal) && creditVal > 0) {
              insertSubject.run(semId, sub.subject_code || '', sub.subject_name.trim(), creditVal);
            }
          }
        }
        order++;
      }

      for (const gs of gradingScale) {
        insertScale.run(profileId, gs.grade.trim(), parseFloat(gs.grade_point));
      }
    });

    transaction();

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/profiles/:id - Delete profile
app.delete('/api/profiles/:id', (req: Request, res: Response) => {
  try {
    const profileId = (req.params.id as string).toUpperCase();
    const { passcode } = req.body || {};

    const existing = db.prepare('SELECT passcode_hash FROM profiles WHERE id = ?').get(profileId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (existing.passcode_hash) {
      const hashedInput = hashPasscode(passcode || '');
      if (hashedInput !== existing.passcode_hash) {
        return res.status(401).json({ error: 'Unauthorized. Invalid owner passcode.' });
      }
    }

    db.prepare('DELETE FROM profiles WHERE id = ?').run(profileId);
    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`GPA Calculator Server running on port ${PORT}`);
});
