import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'gpa_calculator.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize profiles table
db.exec(`
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

// Migration helper: add columns if table already existed without them
try {
  const pragma = db.pragma('table_info(profiles)') as any[];
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
      db.exec(`ALTER TABLE profiles ADD COLUMN ${col.name} ${col.type}`);
    }
  }
} catch (e) {
  console.error('Migration warning:', e);
}

// Initialize indices and other tables
db.exec(`
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

export default db;
