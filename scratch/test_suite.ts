import assert from 'node:assert/strict';
import { academicClass, calculateCgpa, calculateGpa, planTarget } from '../src/domain/gpa';
import { defaultScale, newDraft, type Subject } from '../src/domain/model';
import { mergeImported, parseModules } from '../src/domain/import';
import { validateDraft } from '../server/validation';
import { buildReport } from '../src/services/pdf';

const subject = (credits: number | '', grade: string, name = 'Subject'): Subject => ({ id: crypto.randomUUID(), code: 'CS101', name, credits, grade });
assert.equal(calculateGpa([subject(3, 'A')], defaultScale).gpa, 4);
assert.equal(calculateGpa([subject(3, 'A'), subject(4, 'B+'), subject(1, 'A+')], defaultScale).gpa, 3.65);
assert.equal(calculateGpa([subject(3, 'F')], defaultScale).gpa, 0);
assert.equal(calculateGpa([subject(0, 'A')], defaultScale).gpa, null);
assert.equal(calculateGpa([subject(-1, 'A'), subject(Infinity, 'A'), subject(2, ''), subject(2, 'Z')], defaultScale).gpa, null);
assert.equal(calculateGpa([subject(1.5, 'A'), subject(2, 'B')], defaultScale).gpa, 3.43);
const five = [subject(3, 'A'), subject(3, 'B+'), subject(3, 'B'), subject(3, 'C+'), subject(3, 'C')];
assert.equal(calculateGpa(five, defaultScale).gpa, 2.92);
const draft = newDraft();
draft.name = 'Test'; draft.university = 'University'; draft.faculty = 'Science'; draft.degree = 'BSc'; draft.academicYear = '2025/26';
draft.semesters[0].subjects = [subject(3, 'A')];
draft.semesters.push({ id: crypto.randomUUID(), name: 'Semester 2', subjects: [subject(1, 'B')] });
assert.equal(calculateCgpa(draft.semesters, draft.scale).gpa, 3.75);
assert.equal(academicClass(3.7), 'First Class');
assert.equal(academicClass(3.3), 'Second Class Upper');
assert.equal(academicClass(3), 'Second Class Lower');
assert.equal(academicClass(2.99), 'Pass');
assert.equal(academicClass(null), 'Not calculated');
const targetPlan = planTarget(3, 30, 3.5, 30, 4);
assert.equal(targetPlan.status, 'achievable');
if (targetPlan.status !== 'achievable') throw new Error('Expected achievable target');
assert.equal(targetPlan.requiredGpa, 4);
assert.equal(planTarget(2, 60, 3.5, 15, 4).status, 'impossible');
assert.equal(planTarget(4, 30, 2, 30, 4).status, 'already-achieved');
assert.equal(planTarget(3, 30, 3.5, 0, 4).status, 'invalid');
assert.equal(validateDraft(draft).name, 'Test');
assert.throws(() => validateDraft({ ...draft, university: '' }));
assert.throws(() => validateDraft({ ...draft, semesters: [{ ...draft.semesters[0], subjects: [subject(-1, 'A')] }] }));
const imported = parseModules('Semester II\nNANO1222 Chemical Concepts (2 credits)\nPHYS1001 Physics\nMATH1002 Math (0 credits)');
assert.equal(imported.length, 3);
assert.equal(imported[0].semester, 'Semester II');
assert.equal(imported[0].credits, 2);
assert.equal(imported[1].credits, '');
assert.equal(imported[2].credits, 0);
assert.equal(parseModules('CS101 Computing\nCS101 Computing (3 credits)').length, 1);
assert.equal(parseModules('CS101 Computing\nCS101 Computing (3 credits)')[0].credits, 3);
const creditFormats = parseModules('Semester 2\nCS101 Computing Credits: 3\nMA102 Algebra Credit Hours: 2\nPH103 Physics\n| Module Code | Subject | Credits |\n| BI104 | Biology | 4 |\nCS105 Chemistry Lecturer: Dr. Doe');
assert.deepEqual(creditFormats.map(item => [item.code, item.name, item.credits]), [
  ['CS101', 'Computing', 3], ['MA102', 'Algebra', 2], ['PH103', 'Physics', ''],
  ['BI104', 'Biology', 4], ['CS105', 'Chemistry', ''],
]);
assert.deepEqual(parseModules('| Module Code | Subject | Credits |\n| CS106 | Lab skills |')[0],
  { code: 'CS106', name: 'Lab skills', credits: '', semester: 'Semester 1' });
assert.equal(mergeImported([], imported)[0].subjects.length, 3);
const reportDraft = { ...draft, semesters: [{ id: '1', name: 'Long semester', subjects: Array.from({ length: 120 }, (_, i) => ({ ...subject(3, 'A', `Long subject title ${i} for PDF page flow`), id: String(i), code: `CS${i}` })) }] };
const pdf = buildReport(reportDraft, 'Test student', false);
assert.ok(pdf.getNumberOfPages() > 1);
console.log('GPA, classification, validation, import, and multi-page PDF checks passed.');
