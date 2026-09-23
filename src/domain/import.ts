import type { Semester, Subject } from './model';

export interface ImportedSubject { code: string; name: string; credits: number | ''; semester: string }

// Only an explicit credit label is trusted. Module-code digits are never credits.
export function parseModules(text: string): ImportedSubject[] {
  let semester = 'Semester 1';
  let creditColumn = false;
  const result: ImportedSubject[] = [];
  const seen = new Map<string, number>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^(?:semester|sem\.?|term)\s*[:#-]?\s*([ivx]+|\d+)\b/i);
    if (heading) { semester = `Semester ${heading[1].toUpperCase()}`; continue; }
    if (/\b(?:module|course|subject)\b/i.test(line) && /\bcredits?\b/i.test(line) && !/^[A-Z]{2,8}[- ]?\d{3,6}\b/i.test(line)) { creditColumn = true; continue; }
    const match = line.replace(/^\|\s*/, '').match(/^([A-Z]{2,8}[- ]?\d{3,6})(?:\s*[-:\u2013\u2014|]\s*|\s+)(.+)$/i);
    if (!match) continue;
    const suffixCredit = match[2].match(/(?:\(|\b)(\d+(?:\.\d+)?)\s*(?:credit hours?|credits?|cr|units?)\b\)?/i);
    const prefixCredit = match[2].match(/\b(?:credit hours?|credits?|cr|units?)\s*[:=-]?\s*(\d+(?:\.\d+)?)(?:\b|\))/i);
    const columnCredit = creditColumn ? match[2].match(/(?:\t|\|)\s*(\d+(?:\.\d+)?)\s*\|?$/) : null;
    const credits = suffixCredit ? Number(suffixCredit[1]) : prefixCredit ? Number(prefixCredit[1]) : columnCredit ? Number(columnCredit[1]) : '';
    const name = match[2].split(/\b(?:lecturer|instructor|timetable|room|venue)\s*:/i)[0]
      .replace(/\(?\d+(?:\.\d+)?\s*(?:credit hours?|credits?|cr|units?)\b\)?/gi, '')
      .replace(/\b(?:credit hours?|credits?|cr|units?)\s*[:=-]?\s*\d+(?:\.\d+)?\b/gi, '')
      .replace(creditColumn ? /(?:\t|\|)\s*\d+(?:\.\d+)?\s*\|?$/ : /$^/, '')
      .replace(/^\|\s*/, '')
      .replace(/\s*\|\s*$/, '')
      .replace(/\b(?:Dr\.|Prof\.|Mr\.|Ms\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, '')
      .replace(/[\s:\u2013\u2014-]+$/, '').trim();
    const code = match[1].replace(/[ -]/g, '').toUpperCase();
    const key = `${semester}:${code}`;
    if (!name) continue;
    const existing = seen.get(key);
    if (existing !== undefined) {
      if (result[existing].credits === '' && credits !== '') result[existing].credits = credits;
      continue;
    }
    seen.set(key, result.length);
    result.push({ code, name, credits, semester });
  }
  return result;
}

export function mergeImported(semesters: Semester[], imported: ImportedSubject[]): Semester[] {
  const next = structuredClone(semesters);
  for (const item of imported) {
    let semester = next.find(value => value.name.toLowerCase() === item.semester.toLowerCase());
    if (!semester) {
      semester = { id: crypto.randomUUID(), name: item.semester, subjects: [] };
      next.push(semester);
    }
    const subject: Subject = { id: crypto.randomUUID(), code: item.code, name: item.name,
      credits: item.credits, grade: '' };
    semester.subjects.push(subject);
  }
  return next;
}
