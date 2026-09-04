import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import db from './db';
import {
  getSupabaseProfiles,
  getSupabaseFilterOptions,
  getSupabaseProfileById,
  createSupabaseProfile,
  updateSupabaseProfile,
  deleteSupabaseProfile,
  verifySupabasePasscode
} from './supabase';

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Force JSON Content-Type header on all API routes
app.use((req: Request, res: Response, next: NextFunction) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/profiles') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/ai')
  ) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

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

// Clean extracted subject names automatically
function cleanSubjectTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let title = rawTitle
    .replace(/\b(?:Room|Lab|LH|Venue|Hall|Building)\s*[-:\s]?\s*[A-Z0-9]+/gi, '')
    .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g, '')
    .replace(/\b(?:by\s+)?(?:Dr\.|Prof\.|Professor|Mr\.|Ms\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)\b/gi, '')
    .replace(/[\(\[\{]\s*(?:credit[s]?|cr|pts?|units?)?\s*[\)\]\}]/gi, '')
    .replace(/^[\s\-–—:•*#|.]+/, '')
    .replace(/[\s\-–—:•*#|.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip trailing hyphens, dashes, colons, extra spaces, or duplicate punctuation
  title = title.replace(/[\s\-–—:;,\.]*$/, '').trim();
  return title;
}

// Fallback NLP Extractor Function when AI API key is omitted or service is unavailable
function extractProfileFallback(inputText: string) {
  const lines = inputText.split('\n').map(l => l.trim()).filter(Boolean);
  
  let profileName = '';
  let university = '';
  let faculty = '';
  let department = '';
  let academicYear = '';
  let semester = '';

  const subjects: Array<{ moduleNumber: string; subjectName: string; credit: number | null }> = [];

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
      if (match && match[1]) profileName = match[1].trim();
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
    if (/^(?:ACADEMIC\s*YEAR|YEAR|ACADEMIC|BATCH)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:ACADEMIC\s*YEAR|YEAR|ACADEMIC|BATCH)\s*:\s*(.+)/i);
      if (match && match[1]) academicYear = match[1].trim();
      continue;
    }
    if (/^(?:SEMESTER|SEM)\s*:\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:SEMESTER|SEM)\s*:\s*(.+)/i);
      if (match && match[1]) semester = match[1].trim();
      continue;
    }

    // 2. Unlabelled Metadata Detection
    if (!university && /University|Institute|College|Academy|Campus/i.test(line)) {
      university = line;
      continue;
    }
    if (!faculty && /Faculty|School\s+of/i.test(line)) {
      faculty = line;
      continue;
    }
    if (!department && /Department\s+of/i.test(line)) {
      department = line;
      continue;
    }
    if (!academicYear && /\b(20\d{2}[-/–]20\d{2}|20\d{2}[-/–]\d{2}|Year\s*[1-4])\b/i.test(line)) {
      const match = line.match(/\b(20\d{2}[-/–]20\d{2}|20\d{2}[-/–]\d{2}|Year\s*[1-4])\b/i);
      if (match) academicYear = match[1];
    }
    if (!semester && /\b(Semester\s*[1-8]|Sem\s*[1-8]|Term\s*[1-3])\b/i.test(line)) {
      const match = line.match(/\b(Semester\s*[1-8]|Sem\s*[1-8]|Term\s*[1-3])\b/i);
      if (match) semester = match[1];
    }

    // 3. Subject Module Detection
    const moduleMatch = line.match(/^([A-Z]{2,6}\s*[-–—]?\s*\d{3,5})\s*(?:[-–—:]|\s{2,}|\t|\s+)\s*(.+)$/i);
    if (moduleMatch) {
      const moduleNumber = moduleMatch[1].replace(/\s+/g, '').toUpperCase();
      let remainingText = moduleMatch[2].trim();

      let credit: number | null = null;

      // Priority 1: Explicit credit in text
      const creditMatch = remainingText.match(/(?:[-–—,\(:\s]|^)(?:credits?|cr|credit\s+hours?|pts?|c\.h\.)?\s*([0-9](?:\.[0-9]+)?)\s*(?:credits?|cr|credit\s+hours?|pts?|c\.h\.)?(?:[\)]|\s|$)/i);
      if (creditMatch && creditMatch[1]) {
        const parsed = parseFloat(creditMatch[1]);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 20) {
          credit = parsed;
        }
      }

      let subjectTitle = remainingText
        .replace(/\b\d+(?:\.\d+)?\s*(?:credits?|cr|pts?|credit hours?|c\.h\.)\b/gi, '')
        .replace(/[\(\[\{]\s*(?:credit[s]?|cr|pts?|units?)?\s*[\)\]\}]/gi, '')
        .trim();

      // Priority 2: Last digit fallback if credit is missing
      if (credit === null && moduleNumber) {
        const digits = moduleNumber.match(/\d/g);
        if (digits && digits.length > 0) {
          const lastDigitVal = parseInt(digits[digits.length - 1], 10);
          if (!isNaN(lastDigitVal)) {
            credit = lastDigitVal;
          }
        }
      }

      subjectTitle = cleanSubjectTitle(subjectTitle);

      if (!subjectTitle && moduleNumber) {
        subjectTitle = moduleNumber;
      }

      if (subjectTitle || moduleNumber) {
        subjects.push({
          moduleNumber: moduleNumber,
          subjectName: subjectTitle,
          credit: credit
        });
      }
    }
  }

  return {
    profileName,
    university,
    faculty,
    department,
    academicYear,
    semester,
    subjects
  };
}

function cleanAndParseJson(text: string): any {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Empty AI response content');
  }
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/gi, '').replace(/\s*```$/gi, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

function normalizeAiProfileOutput(raw: any) {
  if (!raw || typeof raw !== 'object') {
    raw = {};
  }
  let profileName = raw.profileName || raw.profile_name || '';
  if (
    profileName === 'Not detected' ||
    /Academic Profile/i.test(profileName) ||
    /Semester\s*\d+/i.test(profileName) ||
    /University/i.test(profileName) ||
    /Faculty/i.test(profileName) ||
    /Department/i.test(profileName) ||
    /Bachelor|BSc|MSc|Master|Degree|Diploma/i.test(profileName)
  ) {
    profileName = '';
  }

  let university = raw.university === 'Not detected' ? '' : (raw.university || '');
  let faculty = raw.faculty === 'Not detected' ? '' : (raw.faculty || '');
  let department = raw.department === 'Not detected' ? '' : (raw.department || '');
  let academicYear = raw.academicYear || raw.academic_year || '';
  if (academicYear === 'Not detected') academicYear = '';

  let semester = raw.semester || '';
  if (semester === 'Not detected') semester = '';

  let subjects: Array<{ moduleNumber: string; subjectName: string; credit: number | null }> = [];

  const extractSubjectObj = (s: any) => {
    const mod = (s.moduleNumber || s.subject_code || s.code || '').trim();
    let name = cleanSubjectTitle((s.subjectName || s.subject_name || s.name || mod || '').trim());

    let cr: number | null = null;
    if (s.credit !== null && s.credit !== undefined && s.credit !== '' && !isNaN(Number(s.credit))) {
      cr = Number(s.credit);
    } else if (mod) {
      const digits = mod.match(/\d/g);
      if (digits && digits.length > 0) {
        const lastDigitVal = parseInt(digits[digits.length - 1], 10);
        if (!isNaN(lastDigitVal)) cr = lastDigitVal;
      }
    }

    return {
      moduleNumber: mod === 'Not detected' ? '' : mod,
      subjectName: name === 'Not detected' ? '' : name,
      credit: cr
    };
  };

  if (Array.isArray(raw.subjects)) {
    subjects = raw.subjects.map(extractSubjectObj).filter((s: any) => s.moduleNumber || s.subjectName);
  } else if (Array.isArray(raw.semesters)) {
    raw.semesters.forEach((sem: any) => {
      if (!semester && sem.semester_name) {
        semester = sem.semester_name;
      }
      if (Array.isArray(sem.subjects)) {
        sem.subjects.forEach((s: any) => {
          const extractedSub = extractSubjectObj(s);
          if (extractedSub.moduleNumber || extractedSub.subjectName) {
            subjects.push(extractedSub);
          }
        });
      }
    });
  }

  return {
    profileName,
    university,
    faculty,
    department,
    academicYear,
    semester,
    subjects
  };
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// GET /api - API Root status endpoint
app.get(['/api', '/api/'], (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Calculate GPA Plus API is running',
    version: '1.0.0',
    endpoints: [
      '/api/health',
      '/api/profiles',
      '/api/profiles/filters',
      '/api/profiles/:id',
      '/api/ai/extract-profile'
    ]
  });
});

// GET /api/health - Diagnostic endpoint to confirm API is live and responding with JSON
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// GET /api/profiles/filters - Return available filter options from database
app.get(['/api/profiles/filters', '/profiles/filters'], async (req: Request, res: Response) => {
  try {
    const supaFilters = await getSupabaseFilterOptions();
    if (supaFilters) {
      return res.json({
        success: true,
        ...supaFilters
      });
    }

    const universities = db.prepare("SELECT DISTINCT university FROM profiles WHERE visibility = 'public' AND university != '' ORDER BY university ASC").all().map((r: any) => r.university);
    const faculties = db.prepare("SELECT DISTINCT faculty FROM profiles WHERE visibility = 'public' AND faculty != '' ORDER BY faculty ASC").all().map((r: any) => r.faculty);
    const departments = db.prepare("SELECT DISTINCT department FROM profiles WHERE visibility = 'public' AND department != '' ORDER BY department ASC").all().map((r: any) => r.department);
    const academicYears = db.prepare("SELECT DISTINCT academic_year FROM profiles WHERE visibility = 'public' AND academic_year != '' ORDER BY academic_year DESC").all().map((r: any) => r.academic_year);

    res.json({
      success: true,
      universities,
      faculties,
      departments,
      degrees: [],
      academicYears
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Unable to load filters' });
  }
});

// GET /api/profiles - List public profiles with multi-filtering and sorting
app.get(['/api/profiles', '/profiles'], async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      university = '',
      faculty = '',
      department = '',
      academic_year = '',
      semester = '',
      sort = 'newest'
    } = req.query;

    const supaProfiles = await getSupabaseProfiles({
      search: String(search),
      university: String(university),
      faculty: String(faculty),
      department: String(department),
      academic_year: String(academic_year),
      semester: String(semester),
      sort: String(sort)
    });

    if (supaProfiles !== null) {
      return res.json({
        success: true,
        profiles: supaProfiles
      });
    }

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
      queryStr += ` AND (
        p.profile_name LIKE ? OR 
        p.university LIKE ? OR 
        p.faculty LIKE ? OR 
        p.department LIKE ? OR 
        p.id LIKE ? OR
        EXISTS (
          SELECT 1 FROM semesters s 
          JOIN subjects sub ON sub.semester_id = s.id 
          WHERE s.profile_id = p.id AND (sub.subject_code LIKE ? OR sub.subject_name LIKE ?)
        )
      )`;
      params.push(term, term, term, term, term, term, term);
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

    // Apply sorting
    if (sort === 'university_asc') {
      queryStr += ` ORDER BY p.university ASC, p.profile_name ASC, p.created_at DESC LIMIT 50`;
    } else if (sort === 'faculty_asc') {
      queryStr += ` ORDER BY p.faculty ASC, p.profile_name ASC, p.created_at DESC LIMIT 50`;
    } else {
      queryStr += ` ORDER BY p.created_at DESC LIMIT 50`;
    }

    const profiles = db.prepare(queryStr).all(...params);

    // Return standard JSON response envelope
    res.json({
      success: true,
      profiles: Array.isArray(profiles) ? profiles : []
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Unable to load profiles'
    });
  }
});

// GET /api/profiles/:id - Fetch single profile with all details
app.get(['/api/profiles/:id', '/profiles/:id'], async (req: Request, res: Response) => {
  try {
    const profileId = (req.params.id as string).toUpperCase();

    const supaProfile = await getSupabaseProfileById(profileId);
    if (supaProfile) {
      return res.json({
        success: true,
        profile: supaProfile,
        ...supaProfile
      });
    }

    const profile = db.prepare(`
      SELECT id, profile_name, university, faculty, department, academic_year, description, visibility, created_at, updated_at,
             CASE WHEN passcode_hash IS NOT NULL AND passcode_hash != '' THEN 1 ELSE 0 END as has_passcode
      FROM profiles WHERE id = ?
    `).get(profileId) as any;

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found. Please check the Profile ID or URL link.'
      });
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

    const result = {
      ...profile,
      semesters,
      gradingScale
    };

    res.json({
      success: true,
      profile: result,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch profile details'
    });
  }
});

// POST /api/profiles - Create a new profile
app.post(['/api/profiles', '/profiles'], async (req: Request, res: Response) => {
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
      return res.status(400).json({ success: false, error: 'Profile Name is required.' });
    }

    // Ensure unique profile ID
    let profileId = generateProfileId();
    while (db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)) {
      profileId = generateProfileId();
    }

    const hashed = hashPasscode(passcode);

    // Persist to Supabase if configured
    await createSupabaseProfile(profileId, {
      profile_name,
      university,
      faculty,
      department,
      degree: '',
      academic_year,
      description,
      visibility,
      passcode_hash: hashed,
      semesters,
      gradingScale
    });

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
            if (sub.subject_name && !isNaN(creditVal) && creditVal >= 0) {
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/profiles/:id/verify-passcode
app.post(['/api/profiles/:id/verify-passcode', '/profiles/:id/verify-passcode'], async (req: Request, res: Response) => {
  try {
    const profileId = (req.params.id as string).toUpperCase();
    const { passcode } = req.body;
    const hashed = hashPasscode(passcode || '');

    const profile = db.prepare('SELECT passcode_hash FROM profiles WHERE id = ?').get(profileId) as any;
    if (profile) {
      if (!profile.passcode_hash) {
        return res.json({ success: true, valid: true });
      }
      if (hashed === profile.passcode_hash) {
        return res.json({ success: true, valid: true });
      } else {
        return res.status(401).json({ success: false, valid: false, error: 'Incorrect owner passcode.' });
      }
    }

    const supaCheck = await verifySupabasePasscode(profileId, hashed);
    if (supaCheck.exists) {
      if (supaCheck.valid) {
        return res.json({ success: true, valid: true });
      } else {
        return res.status(401).json({ success: false, valid: false, error: 'Incorrect owner passcode.' });
      }
    }

    return res.status(404).json({ success: false, error: 'Profile not found' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/profiles/:id - Update profile
app.put(['/api/profiles/:id', '/profiles/:id'], async (req: Request, res: Response) => {
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

    const hashedInput = hashPasscode(passcode || '');
    const existing = db.prepare('SELECT passcode_hash FROM profiles WHERE id = ?').get(profileId) as any;

    if (existing) {
      if (existing.passcode_hash && hashedInput !== existing.passcode_hash) {
        return res.status(401).json({ success: false, error: 'Unauthorized. Invalid owner passcode.' });
      }
    } else {
      const supaCheck = await verifySupabasePasscode(profileId, hashedInput);
      if (!supaCheck.exists) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }
      if (!supaCheck.valid) {
        return res.status(401).json({ success: false, error: 'Unauthorized. Invalid owner passcode.' });
      }
    }

    // Update in Supabase
    await updateSupabaseProfile(profileId, {
      profile_name,
      university,
      faculty,
      department,
      academic_year,
      description,
      visibility,
      semesters,
      gradingScale
    });

    // Update in local SQLite if present
    if (existing) {
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
              if (sub.subject_name && !isNaN(creditVal) && creditVal >= 0) {
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
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/profiles/:id - Delete profile
app.delete(['/api/profiles/:id', '/profiles/:id'], async (req: Request, res: Response) => {
  try {
    const profileId = (req.params.id as string).toUpperCase();
    const { passcode } = req.body || {};

    const existing = db.prepare('SELECT passcode_hash FROM profiles WHERE id = ?').get(profileId) as any;
    if (!existing) {
      const supaProfile = await getSupabaseProfileById(profileId);
      if (!supaProfile) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }
    }

    if (existing && existing.passcode_hash) {
      const hashedInput = hashPasscode(passcode || '');
      if (hashedInput !== existing.passcode_hash) {
        return res.status(401).json({ success: false, error: 'Unauthorized. Invalid owner passcode.' });
      }
    }

    await deleteSupabaseProfile(profileId);
    db.prepare('DELETE FROM profiles WHERE id = ?').run(profileId);
    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/extract-profile - Vision AI extraction endpoint
app.post(['/api/ai/extract-profile', '/ai/extract-profile'], async (req: Request, res: Response) => {
  try {
    const { text, image } = req.body || {};
    if ((!text || typeof text !== 'string' || !text.trim()) && !image) {
      return res.status(400).json({
        success: false,
        error: image ? 'Unable to analyze the image. Please try again.' : 'Syllabus/course text or image payload is required.'
      });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || '';
    const visionModel = process.env.OPENROUTER_VISION_MODEL || process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'google/gemini-2.0-flash-001';
    const apiUrl = process.env.OPENROUTER_API_URL || process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';

    if (openrouterApiKey && openrouterApiKey.trim()) {
      const systemPrompt = `You are a high-precision academic document vision extraction system.
Analyze the user's document image or text and extract academic profile details and subject modules ONLY.

You MUST output ONLY a single raw JSON object matching this EXACT structure:
{
  "profileName": "string",
  "university": "string",
  "faculty": "string",
  "department": "string",
  "academicYear": "string",
  "semester": "string",
  "subjects": [
    {
      "moduleNumber": "string",
      "subjectName": "string",
      "credit": 0
    }
  ]
}

STRICT MANDATORY RULES:
1. OUTPUT JSON ONLY. Do NOT wrap in markdown code blocks (\`\`\`json). Do NOT add any explanations, introductions, or trailing text before or after the JSON.
2. PROFILE NAME: Only set profileName if an explicit profile name label is written on the document (e.g. "PROFILE NAME: ..."). Otherwise, set "profileName": "". Do NOT use university, faculty, department, semester, degree name, or subject name as profileName.
3. SUBJECT EXTRACTION:
   - Extract ONLY actual academic subjects / courses / modules.
   - NEVER extract lecturer names, professor names, instructor names, staff names, contact details, email addresses, phone numbers, room numbers, building names, lab names, class times, dates, page numbers, decorative text, logos, or generic table headings as subjects.
4. CREDIT EXTRACTION & PRIORITY:
   - Priority 1: If explicit credit is stated in text, use that exact numeric credit.
   - Priority 2: If explicit credit is missing, use the LAST DIGIT of the module number as the credit value.
   - ZERO CREDIT IS VALID: 0 is a completely valid credit value.
   - If credit cannot be determined, set "credit": null.
5. PRESERVE MODULE NUMBERS: Preserve complete module numbers exactly as written.`;

      let messagesPayload: any[] = [{ role: 'system', content: systemPrompt }];

      if (image) {
        let formattedImageUrl = image;
        if (typeof image === 'string' && !image.startsWith('data:')) {
          formattedImageUrl = `data:image/jpeg;base64,${image}`;
        }
        messagesPayload.push({
          role: 'user',
          content: [
            { type: 'text', text: 'Extract academic profile metadata and subject list from this university document image.' },
            { type: 'image_url', image_url: { url: formattedImageUrl } }
          ]
        });
      } else {
        messagesPayload.push({ role: 'user', content: text });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey.trim()}`,
        'HTTP-Referer': 'https://gpa-calculator.local',
        'X-Title': 'GPA Calculator Vision Extractor'
      };

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const aiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              model: visionModel,
              messages: messagesPayload,
              temperature: 0.1,
              response_format: { type: 'json_object' }
            })
          });

          if (aiResponse.ok) {
            const data: any = await aiResponse.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              const parsed = cleanAndParseJson(content);
              if (parsed && typeof parsed === 'object') {
                const normalized = normalizeAiProfileOutput(parsed);
                if (normalized && normalized.subjects && normalized.subjects.length > 0) {
                  return res.json({ success: true, profile: normalized });
                }
              }
            }
          }
        } catch (aiErr) {
          console.warn(`Vision AI provider fetch attempt ${attempt} failed:`, aiErr);
        }
      }
    }

    // Fallback parser if API key omitted or Vision API failed
    if (text && typeof text === 'string' && text.trim()) {
      const fallbackProfile = extractProfileFallback(text);
      if (fallbackProfile && fallbackProfile.subjects && fallbackProfile.subjects.length > 0) {
        return res.json({ success: true, profile: fallbackProfile });
      }
    }

    const defaultErrorMsg = image
      ? 'Unable to analyze the image. Please try again.'
      : 'The AI response was incomplete. Please try again.';

    return res.status(400).json({
      success: false,
      error: defaultErrorMsg
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Server error during extraction'
    });
  }
});

// Fallback for undefined API routes: ALWAYS return JSON 404, never HTML!
app.use((req: Request, res: Response, next: NextFunction) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/profiles') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/ai')
  ) {
    return res.status(404).json({
      success: false,
      error: `API endpoint ${req.method} ${req.originalUrl} not found.`
    });
  }
  next();
});

// Serve static frontend bundle if dist folder exists
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export default app;
