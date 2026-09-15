export function normalizeImportedProfile(raw: any, clean: (s: string) => string = s => s.trim()) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const text = (s: any): string => typeof s === 'string' && s !== 'Not detected' ? s.trim() : '';
  const groups = Array.isArray(raw.subjects) ? [{ name: raw.semester, subjects: raw.subjects }] : Array.isArray(raw.semesters) ? raw.semesters : [];
  const subjects: { moduleNumber: string; subjectName: string; credit: number | null; semester: string }[] = [];
  const seen = new Set<string>();
  groups.forEach((group: any, index: number) => {
    if (!group || !Array.isArray(group.subjects)) return;
    for (const sub of group.subjects) {
      if (!sub || typeof sub !== 'object') continue;
      const moduleNumber = text(sub.moduleNumber || sub.moduleCode || sub.subject_code || sub.code).replace(/\s+/g, '').toUpperCase();
      const subjectName = clean(text(sub.subjectName || sub.subject_name || sub.name)) || moduleNumber;
      const semester = text(sub.semester || group.semester_name || group.name || raw.semester) || 'Semester ' + (index + 1);
      const key = JSON.stringify([semester, moduleNumber]);
      if ((!moduleNumber && !subjectName) || (moduleNumber && seen.has(key))) continue;
      if (moduleNumber) seen.add(key);
      const v = sub.credit;
      const credit = (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
      subjects.push({ moduleNumber, subjectName, credit, semester });
    }
  });
  return { profileName: text(raw.profileName || raw.profile_name), university: text(raw.university), faculty: text(raw.faculty), department: text(raw.department), academicYear: text(raw.academicYear || raw.academic_year), semester: text(raw.semester) || subjects[0]?.semester || '', subjects };
}
export function importedSemesters(subjects: any[], defaultName: string) {
  const groups = new Map<string, { semester_name: string; semester_order: number; subjects: { subject_code: string; subject_name: string; credit: number }[] }>();
  for (const sub of subjects) {
    const code = (sub.moduleNumber || '').trim(), name = (sub.subjectName || '').trim();
    if (!code && !name) continue;
    const semester = (sub.semester || defaultName).trim() || defaultName;
    if (!groups.has(semester)) groups.set(semester, { semester_name: semester, semester_order: groups.size + 1, subjects: [] });
    groups.get(semester)!.subjects.push({ subject_code: code, subject_name: name || code, credit: Number(sub.credit) });
  }
  return [...groups.values()];
}
