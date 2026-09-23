import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProfileDraft } from '../domain/model';
import { academicClass, calculateCgpa } from '../domain/gpa';

export function buildReport(profile: ProfileDraft, studentName = '', download = true): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.width;
  const result = calculateCgpa(profile.semesters, profile.scale);
  const gradePoints = new Map(profile.scale.map(item => [item.grade, item.points]));

  doc.setFillColor(20, 27, 49);
  doc.rect(0, 0, width, 39, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CALCULATE GPA PLUS', 14, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Academic results report', 14, 25);
  doc.text(new Date().toLocaleDateString(), width - 14, 25, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  const details = [
    ['Student', studentName.trim() || 'Not specified'],
    ['Profile', profile.name],
    ['University', profile.university || 'Not specified'],
    ['Faculty', profile.faculty || 'Not specified'],
    ['Department', profile.department || 'Not specified'],
    ['Degree', profile.degree || 'Not specified'],
    ['Academic year', profile.academicYear || 'Not specified']
  ];
  let y = 49;
  for (const [label, value] of details) {
    doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value, width - 64) as string[];
    doc.text(lines, 49, y);
    y += Math.max(7, lines.length * 5);
  }

  const rows: string[][] = [];
  for (const semester of profile.semesters) {
    for (const subject of semester.subjects) {
      const credit = subject.credits === '' ? '—' : String(subject.credits);
      rows.push([semester.name, subject.code || '—', subject.name, credit, subject.grade || '—',
        subject.grade ? String(gradePoints.get(subject.grade) ?? '—') : '—']);
    }
  }
  autoTable(doc, {
    startY: y + 3,
    head: [['Semester', 'Code', 'Subject', 'Credits', 'Grade', 'Point']],
    body: rows.length ? rows : [['—', '—', 'No subjects', '—', '—', '—']],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [67, 56, 202] },
    columnStyles: { 2: { cellWidth: 65 } },
    margin: { left: 14, right: 14, bottom: 22 }
  });
  const lastY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  if (lastY > doc.internal.pageSize.height - 43) doc.addPage();
  const summaryY = lastY > doc.internal.pageSize.height - 43 ? 22 : lastY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Credits: ${result.credits.toFixed(2)}`, 14, summaryY);
  doc.text(`Quality points: ${result.qualityPoints.toFixed(2)}`, 72, summaryY);
  doc.text(`CGPA: ${result.gpa?.toFixed(2) ?? '—'}`, 151, summaryY);
  doc.setFontSize(10);
  doc.text(`Academic standing: ${academicClass(result.gpa)}`, 14, summaryY + 9);
  if (download) doc.save(`${(studentName || profile.name).replace(/[^a-z0-9]+/gi, '_')}_gpa_report.pdf`);
  return doc;
}
