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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let startY = 18;

  // 1. Header & Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(24, 28, 48);
  doc.text('CALCULATE GPA PLUS', 14, startY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Official Academic Performance Report', 14, startY + 5);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  doc.setFontSize(8.5);
  doc.text(`Generated Date: ${formattedDate}`, pageWidth - 14, startY + 5, { align: 'right' });

  // Thin dividing line
  startY += 10;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, startY, pageWidth - 14, startY);
  startY += 7;

  // 2. Metadata Grid
  const displayName = studentName.trim() || 'Student';
  const profileName = profile?.profile_name || 'Academic Profile';
  const university = profile?.university || 'General University';
  const faculty = profile?.faculty || '';
  const department = profile?.department || '';
  const academicYear = profile?.academic_year || 'N/A';

  const semesterNames = cgpaResult.semesterResults
    .map(s => s.semester_name)
    .filter(Boolean)
    .join(', ') || 'Semester 1';

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  // Left Column
  doc.text('Student Name:', 14, startY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(displayName, 42, startY);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('University:', pageWidth / 2, startY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(university, (pageWidth / 2) + 24, startY);

  startY += 5.5;

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Profile:', 14, startY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(profileName, 42, startY);

  if (faculty) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Faculty:', pageWidth / 2, startY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(faculty, (pageWidth / 2) + 24, startY);
  }

  startY += 5.5;

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Academic Year:', 14, startY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(academicYear, 42, startY);

  if (department) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Department:', pageWidth / 2, startY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(department, (pageWidth / 2) + 24, startY);
  }

  startY += 5.5;

  // Row 4
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Semester(s):', 14, startY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(semesterNames, 42, startY);

  startY += 8;

  // 3. Module & Subject Results Table
  const tableData: [string, string, string, string, string][] = [];
  for (const semRes of cgpaResult.semesterResults) {
    for (const calc of semRes.calculations) {
      tableData.push([
        (calc as any).subject_code || (calc as any).moduleNumber || '-',
        calc.subject_name || 'Subject',
        String(calc.credit ?? 0),
        calc.grade || '-',
        calc.grade_point !== undefined && !isNaN(calc.grade_point) ? calc.grade_point.toFixed(2) : '-'
      ]);
    }
  }

  autoTable(doc, {
    startY: startY,
    head: [['Module Code', 'Subject Name', 'Credit', 'Grade', 'Grade Point']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      fillColor: [79, 70, 229], // Indigo 600
      lineWidth: 0.1,
      lineColor: [203, 213, 225]
    },
    styles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }, // Automatically wraps long subject names
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 24 }
    }
  });

  startY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Performance Summary Box
  const overallCgpa = cgpaResult.overall_cgpa.toFixed(2);
  const totalCredits = cgpaResult.overall_credits;
  const honorsClass = getAcademicClass(cgpaResult.overall_cgpa);

  // Background Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, startY, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.text('Total Credits:', 20, startY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalCredits}`, 20, startY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('GPA / CGPA:', 70, startY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229);
  doc.text(`${overallCgpa}`, 70, startY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Academic Standing:', 125, startY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${honorsClass}`, 125, startY + 16);

  startY += 30;

  // 5. Verification & Verification Link Footer
  if (profile?.id) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const verificationUrl = `${window.location.origin}/#profile-${profile.id}`;
    doc.text(`Verification / Profile Link: ${verificationUrl}`, 14, startY);
  }

  const filename = `${displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_gpa_report.pdf`;
  doc.save(filename);
}
