import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export interface DbInterface {
  prepare: (sql: string) => {
    all: (...params: any[]) => any[];
    get: (...params: any[]) => any;
    run: (...params: any[]) => { changes: number; lastInsertRowid: number | bigint };
  };
  transaction: <T extends (...args: any[]) => any>(fn: T) => T;
  exec: (sql: string) => void;
  pragma: (sql: string) => any;
}

let dbInstance: DbInterface;

try {
  // In serverless environments (like AWS Lambda / Vercel), native compilation cannot run; use pure JS adapter
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error('Serverless environment: Using in-memory adapter');
  }

  // Attempt to use better-sqlite3 for local Node environment
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  
  const baseDir = process.cwd();
  const dbPath = path.join(baseDir, 'gpa_calculator.db');

  const nativeDb = new Database(dbPath);
  nativeDb.pragma('foreign_keys = ON');

  // Initialize profiles table
  nativeDb.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      profile_name TEXT NOT NULL,
      university TEXT NOT NULL,
      faculty TEXT NOT NULL,
      department TEXT DEFAULT '',
      degree TEXT DEFAULT '',
      academic_year TEXT DEFAULT '',
      description TEXT DEFAULT '',
      visibility TEXT DEFAULT 'public',
      passcode_hash TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration helper
  try {
    const pragma = nativeDb.pragma('table_info(profiles)') as any[];
    const existingCols = new Set(pragma.map((col: any) => col.name));
    
    const columnsToAdd = [
      { name: 'department', type: "TEXT DEFAULT ''" },
      { name: 'degree', type: "TEXT DEFAULT ''" },
      { name: 'academic_year', type: "TEXT DEFAULT ''" },
      { name: 'description', type: "TEXT DEFAULT ''" },
      { name: 'visibility', type: "TEXT DEFAULT 'public'" },
      { name: 'passcode_hash', type: "TEXT DEFAULT ''" },
      { name: 'created_at', type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
      { name: 'updated_at', type: "DATETIME DEFAULT CURRENT_TIMESTAMP" }
    ];

    for (const col of columnsToAdd) {
      if (!existingCols.has(col.name)) {
        nativeDb.exec(`ALTER TABLE profiles ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  } catch (mErr) {
    console.warn('Migration warning:', mErr);
  }

  nativeDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_profiles_university ON profiles(university);
    CREATE INDEX IF NOT EXISTS idx_profiles_faculty ON profiles(faculty);
    CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
    CREATE INDEX IF NOT EXISTS idx_profiles_degree ON profiles(degree);
    CREATE INDEX IF NOT EXISTS idx_profiles_academic_year ON profiles(academic_year);
    CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON profiles(visibility);

    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL,
      semester_name TEXT NOT NULL,
      semester_order INTEGER DEFAULT 1,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id INTEGER NOT NULL,
      subject_code TEXT DEFAULT '',
      subject_name TEXT NOT NULL,
      credit REAL NOT NULL,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS grading_scales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL,
      grade TEXT NOT NULL,
      grade_point REAL NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `);

  console.log('SQLite Database initialized successfully at:', dbPath);
  dbInstance = nativeDb;
} catch (nativeErr) {
  console.warn('better-sqlite3 initialization failed or unavailable in this environment, activating in-memory fallback adapter:', nativeErr);

  // Fallback in-memory database store for serverless environments
  interface MemoryProfile {
    id: string;
    profile_name: string;
    university: string;
    faculty: string;
    department: string;
    degree: string;
    academic_year: string;
    description: string;
    visibility: string;
    passcode_hash: string;
    created_at: string;
    updated_at: string;
  }

  interface MemorySemester {
    id: number;
    profile_id: string;
    semester_name: string;
    semester_order: number;
  }

  interface MemorySubject {
    id: number;
    semester_id: number;
    subject_code: string;
    subject_name: string;
    credit: number;
  }

  interface MemoryScale {
    id: number;
    profile_id: string;
    grade: string;
    grade_point: number;
  }

  const memoryProfiles: Map<string, MemoryProfile> = new Map();
  const memorySemesters: Map<number, MemorySemester> = new Map();
  const memorySubjects: Map<number, MemorySubject> = new Map();
  const memoryScales: Map<number, MemoryScale> = new Map();

  let autoSemId = 1;
  let autoSubId = 1;
  let autoScaleId = 1;

  dbInstance = {
    prepare(sql: string) {
      const s = sql.trim();

      return {
        all(...params: any[]): any[] {
          // Filters query
          if (s.includes('DISTINCT university FROM profiles')) {
            const set = new Set<string>();
            for (const p of memoryProfiles.values()) {
              if (p.visibility === 'public' && p.university) set.add(p.university);
            }
            return Array.from(set).sort().map(u => ({ university: u }));
          }
          if (s.includes('DISTINCT faculty FROM profiles')) {
            const set = new Set<string>();
            for (const p of memoryProfiles.values()) {
              if (p.visibility === 'public' && p.faculty) set.add(p.faculty);
            }
            return Array.from(set).sort().map(f => ({ faculty: f }));
          }
          if (s.includes('DISTINCT department FROM profiles')) {
            const set = new Set<string>();
            for (const p of memoryProfiles.values()) {
              if (p.visibility === 'public' && p.department) set.add(p.department);
            }
            return Array.from(set).sort().map(d => ({ department: d }));
          }
          if (s.includes('DISTINCT academic_year FROM profiles')) {
            const set = new Set<string>();
            for (const p of memoryProfiles.values()) {
              if (p.visibility === 'public' && p.academic_year) set.add(p.academic_year);
            }
            return Array.from(set).sort().reverse().map(y => ({ academic_year: y }));
          }

          // Semesters for a profile
          if (s.includes('FROM semesters WHERE profile_id = ?')) {
            const pid = params[0];
            return Array.from(memorySemesters.values())
              .filter(sem => sem.profile_id === pid)
              .sort((a, b) => a.semester_order - b.semester_order);
          }

          // Subjects for a semester
          if (s.includes('FROM subjects WHERE semester_id = ?')) {
            const sid = params[0];
            return Array.from(memorySubjects.values())
              .filter(sub => sub.semester_id === sid)
              .sort((a, b) => a.id - b.id);
          }

          // Grading scales for a profile
          if (s.includes('FROM grading_scales WHERE profile_id = ?')) {
            const pid = params[0];
            return Array.from(memoryScales.values())
              .filter(sc => sc.profile_id === pid)
              .sort((a, b) => b.grade_point - a.grade_point);
          }

          // General profiles list
          if (s.includes('FROM profiles p WHERE p.visibility = \'public\'')) {
            const results: any[] = [];
            for (const p of memoryProfiles.values()) {
              if (p.visibility !== 'public') continue;

              const sems = Array.from(memorySemesters.values()).filter(sem => sem.profile_id === p.id);
              let totalSubjects = 0;
              let totalCredits = 0;
              for (const sem of sems) {
                const subs = Array.from(memorySubjects.values()).filter(sub => sub.semester_id === sem.id);
                totalSubjects += subs.length;
                for (const sub of subs) totalCredits += Number(sub.credit || 0);
              }

              results.push({
                ...p,
                semester_count: sems.length,
                total_subjects: totalSubjects,
                total_credits: Math.round(totalCredits * 100) / 100
              });
            }

            return results;
          }

          return [];
        },

        get(...params: any[]): any {
          // Check profile existence or get by ID
          if (s.includes('SELECT id FROM profiles WHERE id = ?') || s.includes('SELECT passcode_hash FROM profiles WHERE id = ?') || s.includes('FROM profiles WHERE id = ?')) {
            const pid = params[0];
            const p = memoryProfiles.get(pid);
            if (!p) return undefined;
            return {
              ...p,
              has_passcode: Boolean(p.passcode_hash && p.passcode_hash.length > 0)
            };
          }
          return undefined;
        },

        run(...params: any[]) {
          // Insert profile
          if (s.includes('INSERT INTO profiles')) {
            const [id, profile_name, university, faculty, department, academic_year, description, visibility, passcode_hash] = params;
            const now = new Date().toISOString();
            memoryProfiles.set(id, {
              id,
              profile_name,
              university: university || '',
              faculty: faculty || '',
              department: department || '',
              degree: '',
              academic_year: academic_year || '',
              description: description || '',
              visibility: visibility || 'public',
              passcode_hash: passcode_hash || '',
              created_at: now,
              updated_at: now
            });
            return { changes: 1, lastInsertRowid: 1 };
          }

          // Insert semester
          if (s.includes('INSERT INTO semesters')) {
            const [profile_id, semester_name, semester_order] = params;
            const id = autoSemId++;
            memorySemesters.set(id, {
              id,
              profile_id,
              semester_name,
              semester_order: semester_order || 1
            });
            return { changes: 1, lastInsertRowid: id };
          }

          // Insert subject
          if (s.includes('INSERT INTO subjects')) {
            const [semester_id, subject_code, subject_name, credit] = params;
            const id = autoSubId++;
            memorySubjects.set(id, {
              id,
              semester_id,
              subject_code: subject_code || '',
              subject_name,
              credit: Number(credit)
            });
            return { changes: 1, lastInsertRowid: id };
          }

          // Insert grading scale
          if (s.includes('INSERT INTO grading_scales')) {
            const [profile_id, grade, grade_point] = params;
            const id = autoScaleId++;
            memoryScales.set(id, {
              id,
              profile_id,
              grade,
              grade_point: Number(grade_point)
            });
            return { changes: 1, lastInsertRowid: id };
          }

          // Delete profile
          if (s.includes('DELETE FROM profiles WHERE id = ?')) {
            const pid = params[0];
            memoryProfiles.delete(pid);
            // Cascade delete semesters, subjects, scales
            for (const [sid, sem] of memorySemesters.entries()) {
              if (sem.profile_id === pid) {
                memorySemesters.delete(sid);
                for (const [subId, sub] of memorySubjects.entries()) {
                  if (sub.semester_id === sid) memorySubjects.delete(subId);
                }
              }
            }
            for (const [scId, sc] of memoryScales.entries()) {
              if (sc.profile_id === pid) memoryScales.delete(scId);
            }
            return { changes: 1, lastInsertRowid: 0 };
          }

          // Delete semesters for profile
          if (s.includes('DELETE FROM semesters WHERE profile_id = ?')) {
            const pid = params[0];
            for (const [sid, sem] of memorySemesters.entries()) {
              if (sem.profile_id === pid) {
                memorySemesters.delete(sid);
                for (const [subId, sub] of memorySubjects.entries()) {
                  if (sub.semester_id === sid) memorySubjects.delete(subId);
                }
              }
            }
            return { changes: 1, lastInsertRowid: 0 };
          }

          // Delete grading scale for profile
          if (s.includes('DELETE FROM grading_scales WHERE profile_id = ?')) {
            const pid = params[0];
            for (const [scId, sc] of memoryScales.entries()) {
              if (sc.profile_id === pid) memoryScales.delete(scId);
            }
            return { changes: 1, lastInsertRowid: 0 };
          }

          // Update profile
          if (s.includes('UPDATE profiles SET')) {
            const pid = params[params.length - 1];
            const existing = memoryProfiles.get(pid);
            if (existing) {
              const [profile_name, university, faculty, department, academic_year, description, visibility] = params;
              existing.profile_name = profile_name;
              existing.university = university || '';
              existing.faculty = faculty || '';
              existing.department = department || '';
              existing.academic_year = academic_year || '';
              existing.description = description || '';
              existing.visibility = visibility || 'public';
              existing.updated_at = new Date().toISOString();
            }
            return { changes: 1, lastInsertRowid: 0 };
          }

          return { changes: 0, lastInsertRowid: 0 };
        }
      };
    },

    transaction<T extends (...args: any[]) => any>(fn: T): T {
      return fn;
    },

    exec() {},
    pragma() { return []; }
  };
}

export default dbInstance;
