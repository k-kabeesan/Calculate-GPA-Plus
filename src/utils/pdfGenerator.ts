import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CGPAResult, Profile } from '../types';

export interface PDFExportOptions {
  title?: string;
  studentName?: string;
  studentId?: string;
  profile?: Partial<Profile>;
  cgpaResult: CGPAResult;
}

export function getAcademicClass(cgpa: number): string {
  if (cgpa >= 3.70) return 'First Class';
  if (cgpa >= 3.30) return 'Second Class (Upper Division)';
  if (cgpa >= 3.00) return 'Second Class (Lower Division)';
  if (cgpa >= 2.00) return 'Pass';
  return 'Pass';
}

export const getAcademicHonors = getAcademicClass;

export function generateAcademicPDF({
  studentName = '',
  profile,
  cgpaResult
}: PDFExportOptions) {
  const doc = new jsPDF();

  // Top Corner: Small, simple black text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text('Calculate GPA Plus', 14, 15);

  let startY = 28;

  const displayName = studentName.trim() || 'Student';
  const degreeName = profile?.degree || profile?.profile_name || 'Degree Programme';
  const academicYear = profile?.academic_year || '2024/2025';
  
  const semesterNames = cgpaResult.semesterResults
    .map(s => s.semester_name)
    .filter(Boolean)
    .join(', ') || 'Semester 1';

  // Minimal Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('ACADEMIC REPORT', 14, startY);
  startY += 10;

  // Essential Student & Academic Metadata ONLY
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  doc.text(`Student Name: ${displayName}`, 14, startY);
  startY += 6;
  doc.text(`Course / Degree Name: ${degreeName}`, 14, startY);
  startY += 6;
  doc.text(`Academic Year: ${academicYear}`, 14, startY);
  startY += 6;
  doc.text(`Semester: ${semesterNames}`, 14, startY);
  startY += 10;

  // Minimal Subject & Grade Table ONLY
  const tableData: [string, string][] = [];
  for (const semRes of cgpaResult.semesterResults) {
    for (const calc of semRes.calculations) {
      tableData.push([calc.subject_name, calc.grade]);
    }
  }

  autoTable(doc, {
    startY: startY,
    head: [['Subject Name', 'Grade']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
      fillColor: [245, 245, 245],
      lineWidth: 0.2,
      lineColor: [210, 210, 210]
    },
    styles: {
      fontSize: 9.5,
      textColor: [30, 30, 30],
      cellPadding: 4,
      lineWidth: 0.1,
      lineColor: [230, 230, 230]
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 45 }
    }
  });

  startY = (doc as any).lastAutoTable.finalY + 12;

  // Total GPA & Class/Honors
  const overallCgpa = cgpaResult.overall_cgpa.toFixed(2);
  const honorsClass = getAcademicClass(cgpaResult.overall_cgpa);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  doc.text(`Total GPA / CGPA: ${overallCgpa}`, 14, startY);
  startY += 7;
  doc.text(`Class / Honors: ${honorsClass}`, 14, startY);

  // Bottom corner intentionally left blank for future URL placement

  const filename = `${displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_gpa_report.pdf`;
  doc.save(filename);
}
