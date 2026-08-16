import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import db from './db';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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



// API Routes

// GET /api/profiles - List public profiles
app.get('/api/profiles', (req: Request, res: Response) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : '%';
    const profiles = db.prepare(`
      SELECT p.id, p.profile_name, p.university, p.faculty, p.degree, p.academic_year, p.visibility, p.created_at,
             (SELECT COUNT(*) FROM semesters s WHERE s.profile_id = p.id) as semester_count,
             (SELECT COUNT(*) FROM subjects sub JOIN semesters sem ON sub.semester_id = sem.id WHERE sem.profile_id = p.id) as total_subjects,
             (SELECT SUM(sub.credit) FROM subjects sub JOIN semesters sem ON sub.semester_id = sem.id WHERE sem.profile_id = p.id) as total_credits
      FROM profiles p
      WHERE p.visibility = 'public' AND (p.profile_name LIKE ? OR p.university LIKE ? OR p.faculty LIKE ? OR p.id LIKE ?)
      ORDER BY p.created_at DESC
      LIMIT 30
    `).all(search, search, search, search);

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
      SELECT id, profile_name, university, faculty, degree, academic_year, description, visibility, created_at, updated_at,
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
      university,
      faculty,
      degree,
      academic_year = '',
      description = '',
      visibility = 'public',
      passcode = '',
      semesters = [],
      gradingScale = DEFAULT_GRADING_SCALE
    } = req.body;

    if (!profile_name || !university || !faculty || !degree) {
      return res.status(400).json({ error: 'Profile Name, University, Faculty, and Degree are required.' });
    }

    if (!semesters || semesters.length === 0) {
      return res.status(400).json({ error: 'At least one semester with subjects is required.' });
    }

    // Ensure unique profile ID
    let profileId = generateProfileId();
    while (db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)) {
      profileId = generateProfileId();
    }

    const hashed = hashPasscode(passcode);

    const insertProfile = db.prepare(`
      INSERT INTO profiles (id, profile_name, university, faculty, degree, academic_year, description, visibility, passcode_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        university.trim(),
        faculty.trim(),
        degree.trim(),
        academic_year.trim(),
        description.trim(),
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
      university,
      faculty,
      degree,
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
      SET profile_name = ?, university = ?, faculty = ?, degree = ?, academic_year = ?, description = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP
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
        university.trim(),
        faculty.trim(),
        degree.trim(),
        academic_year.trim(),
        description.trim(),
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
