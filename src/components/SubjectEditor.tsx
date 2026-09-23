import { Plus, Trash2 } from 'lucide-react';
import type { GradePoint, Semester, Subject } from '../domain/model';
import { newSubject } from '../domain/model';

export function SubjectEditor({ semester, scale, onChange, requireGrade = false, errors = {} }: {
  semester: Semester; scale: GradePoint[]; onChange: (semester: Semester) => void; requireGrade?: boolean;
  errors?: Record<string, string>;
}) {
  const update = (id: string, patch: Partial<Subject>) => onChange({ ...semester, subjects: semester.subjects.map(subject =>
    subject.id === id ? { ...subject, ...patch } : subject) });
  return <div className="subject-editor">
    {semester.subjects.length === 0 && <p className="muted">No subjects added.</p>}
    {semester.subjects.map((subject, index) => <div className="subject-row" key={subject.id}>
      <span className="subject-number">{index + 1}</span>
      <label>Module code<input value={subject.code} maxLength={50} placeholder="e.g. NANO1222"
        onChange={event => update(subject.id, { code: event.target.value.toUpperCase() })} />{errors[`subject:${subject.id}:code`] && <small className="field-error">{errors[`subject:${subject.id}:code`]}</small>}</label>
      <label className="subject-name">Subject name<input value={subject.name} maxLength={200} placeholder="Enter subject name"
        onChange={event => update(subject.id, { name: event.target.value })} />{errors[`subject:${subject.id}:name`] && <small className="field-error">{errors[`subject:${subject.id}:name`]}</small>}</label>
      <label>Credits<input type="number" min="0" max="100" step="0.5" value={subject.credits}
        onChange={event => update(subject.id, { credits: event.target.value === '' ? '' : Number(event.target.value) })} />{errors[`subject:${subject.id}:credits`] && <small className="field-error">{errors[`subject:${subject.id}:credits`]}</small>}</label>
      <label>Grade<select value={subject.grade} required={requireGrade}
        onChange={event => update(subject.id, { grade: event.target.value })}>
        <option value="">Choose later</option>{scale.map(item => <option key={item.grade} value={item.grade}>{item.grade} ({item.points.toFixed(1)})</option>)}
      </select>{errors[`subject:${subject.id}:grade`] && <small className="field-error">{errors[`subject:${subject.id}:grade`]}</small>}</label>
      <button type="button" className="icon-button danger" aria-label={`Remove ${subject.name || `subject ${index + 1}`}`}
        onClick={() => onChange({ ...semester, subjects: semester.subjects.filter(item => item.id !== subject.id) })}><Trash2 size={18} /></button>
    </div>)}
    <button type="button" className="button button-soft" onClick={() => onChange({ ...semester, subjects: [...semester.subjects, newSubject()] })}>
      <Plus size={16} /> Add subject
    </button>
  </div>;
}
