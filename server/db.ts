import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'gpa_calculator.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    profile_name TEXT NOT NULL,
    university TEXT NOT NULL,
    faculty TEXT NOT NULL,
    degree TEXT NOT NULL,
    academic_year TEXT DEFAULT '',
    description TEXT DEFAULT '',
    visibility TEXT DEFAULT 'public',
    passcode_hash TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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
