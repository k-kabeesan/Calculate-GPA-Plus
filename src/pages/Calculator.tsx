import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { GpaSummary, Notice, PageHead } from '../components/ui';
import { SubjectEditor } from '../components/SubjectEditor';
import { GpaInsights } from '../components/GpaInsights';
import { calculateGpa } from '../domain/gpa';
import { defaultScale, newDraft, newSemester, type GradePoint } from '../domain/model';
import { buildReport } from '../services/pdf';

export function CalculatorPage() {
  const [semester, setSemester] = useState(() => newSemester(1));
  const [scale, setScale] = useState<GradePoint[]>(() => defaultScale.map(item => ({ ...item })));
  const [showScale, setShowScale] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [studentName, setStudentName] = useState('');
  const [university, setUniversity] = useState('');
  const result = useMemo(() => calculateGpa(semester.subjects, scale), [semester, scale]);
  const reset = () => { setSemester(newSemester(1)); setScale(defaultScale.map(item => ({ ...item }))); setCalculated(false); setError(''); setFieldErrors({}); setStudentName(''); setUniversity(''); };
  const calculate = () => {
    if (semester.subjects.length === 0) return setError('Add at least one subject.');
    const errors: Record<string, string> = {};
    for (const subject of semester.subjects) {
      if (!subject.name.trim()) errors[`subject:${subject.id}:name`] = 'Subject name is required.';
      if (subject.credits === '' || !Number.isFinite(Number(subject.credits)) || Number(subject.credits) < 0 || Number(subject.credits) > 100) errors[`subject:${subject.id}:credits`] = 'Enter credits from 0 to 100.';
      if (!subject.grade) errors[`subject:${subject.id}:grade`] = 'Select a grade.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return setError('Please correct the highlighted subjects.');
    setError(''); setCalculated(true);
  };
  const toProfile = () => {
    sessionStorage.setItem('gpa-new-profile', JSON.stringify({ ...newDraft(), semesters: [semester], scale }));
    window.location.hash = '#/create';
  };
  const downloadPdf = () => {
    setError('');
    try { buildReport({ ...newDraft(), name: 'GPA Calculation', university, semesters: [semester], scale }, studentName); }
    catch { setError('Unable to create the PDF. Please try again or use a different browser.'); }
  };
  return <div className="container calculator-page"><PageHead eyebrow="NO ACCOUNT NEEDED" title="Normal GPA Calculator">Add your subjects, credits, and grades to calculate a weighted semester result.</PageHead>
    <div className="page-grid"><div className="stack">
      <section className="panel"><div className="panel-heading"><div><h2>Subjects & grades</h2><p>{semester.subjects.length} subject{semester.subjects.length === 1 ? '' : 's'} added</p></div><button className="button button-ghost" onClick={reset}><RotateCcw size={16} /> Reset</button></div>
        <SubjectEditor semester={semester} scale={scale} onChange={value => { setSemester(value); setCalculated(false); }} requireGrade errors={fieldErrors} />
        {error && <Notice kind="error">{error}</Notice>}
        <div className="form-actions"><button className="button button-primary" onClick={calculate}>Calculate GPA</button><button className="button button-soft" onClick={toProfile}>Save as shared profile</button></div>
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>Grading scale</h2><p>Adjust grade points to match your university.</p></div><button className="button button-ghost" onClick={() => setShowScale(!showScale)}>{showScale ? 'Hide' : 'Customize'}</button></div>
        {showScale && <div className="scale-grid">{scale.map((item, index) => <label key={item.grade}>{item.grade}<input type="number" min="0" max="10" step="0.1" value={item.points}
          onChange={event => setScale(scale.map((entry, i) => i === index ? { ...entry, points: Number(event.target.value) } : entry))} /></label>)}</div>}</section>
    </div><aside className="stack"><section className="panel result-panel"><div className="panel-heading"><div><h2>Your result</h2><p>Credit weighted GPA</p></div></div>
      {calculated ? <><GpaSummary result={result} /><p className="formula">GPA = Σ (credits × grade points) ÷ Σ credits</p><label>Student name for PDF<input value={studentName} onChange={event => setStudentName(event.target.value)} placeholder="Optional" /></label><label>University for PDF<input value={university} onChange={event => setUniversity(event.target.value)} placeholder="Optional" /></label><button className="button button-soft full" onClick={downloadPdf}>Download PDF report</button></>
        : <p className="muted">Complete your subjects and select Calculate GPA to see the result.</p>}
    </section></aside></div>{calculated && <GpaInsights result={result} subjects={semester.subjects} scale={scale} />}
  </div>;
}
