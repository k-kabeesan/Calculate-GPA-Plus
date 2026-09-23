import { useState } from 'react';
import { PageHead, Notice, Empty } from '../components/ui';
import { parseModules, type ImportedSubject } from '../domain/import';
import { newDraft } from '../domain/model';
import { mergeImported } from '../domain/import';
import { readModuleFile } from '../services/readDocument';

export function ImportPage() {
  const [text, setText] = useState('');
  const [subjects, setSubjects] = useState<ImportedSubject[]>([]);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const fromFile = async (file?: File) => {
    if (!file) return;
    setReading(true); setError('');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const content = await Promise.race([readModuleFile(file), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('File reading took too long. Try a smaller file or paste the module text.')), 45000); })]);
      setText(content); const found = parseModules(content); setSubjects(found);
      if (!found.length) setError('No modules found in this file. Check the extracted text and edit it if needed.');
    }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to read this file.'); }
    finally { if (timer) clearTimeout(timer); setReading(false); }
  };
  const extract = () => { const found = parseModules(text); setSubjects(found); setError(found.length ? '' : 'No modules found. Include a module code at the start of each line.'); };
  const update = (index: number, patch: Partial<ImportedSubject>) => setSubjects(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  const continueToProfile = () => {
    const draft = newDraft();
    draft.semesters = mergeImported([], subjects);
    sessionStorage.setItem('gpa-new-profile', JSON.stringify(draft));
    window.location.hash = '#/create';
  };
  return <div className="container import-page"><PageHead eyebrow="BUILD FROM A MODULE LIST" title="Auto Profile Generator">Add a PDF, image, or pasted module list, then review every subject before saving a profile.</PageHead>
    <section className="panel stack"><label>PDF, image, or text file<input type="file" accept="application/pdf,image/*,.txt" disabled={reading} onChange={event => void fromFile(event.target.files?.[0])} /></label>{reading && <Notice>Reading file…</Notice>}<label>Module list<textarea rows={9} value={text} onChange={event => setText(event.target.value)} placeholder={'Semester 1\nNANO1222 Chemical Concepts and Calculations (2 credits)\nPHYS1001 Fundamentals of Physics'} /></label><p className="muted">Credits are read only when explicitly written. Missing credits must be entered during review. Check OCR results carefully.</p><button className="button button-primary" disabled={reading} onClick={extract}>Extract modules</button>{error && <Notice kind="error">{error}</Notice>}</section>
    <section className="panel stack"><div className="panel-heading"><div><h2>Review import</h2><p>{subjects.length} subjects found</p></div></div>
      {subjects.length ? <><div className="import-list">{subjects.map((subject, index) => <div className="import-row" key={index}><label>Code<input value={subject.code} onChange={event => update(index, { code: event.target.value })} /></label><label>Subject<input value={subject.name} onChange={event => update(index, { name: event.target.value })} /></label><label>Semester<input value={subject.semester} onChange={event => update(index, { semester: event.target.value })} /></label><label>Credits<input type="number" min="0" step="0.5" value={subject.credits} onChange={event => update(index, { credits: event.target.value === '' ? '' : Number(event.target.value) })} /></label><button className="icon-button danger" aria-label={`Remove ${subject.code}`} onClick={() => setSubjects(current => current.filter((_, i) => i !== index))}>×</button></div>)}</div><button className="button button-primary" onClick={continueToProfile}>Continue to profile</button></> : <Empty title="No subjects to review">Paste a module list and select Extract modules.</Empty>}
    </section></div>;
}
