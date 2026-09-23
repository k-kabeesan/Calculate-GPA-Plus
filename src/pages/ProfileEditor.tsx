import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SubjectEditor } from '../components/SubjectEditor';
import { GpaSummary, Loading, Notice, PageHead } from '../components/ui';
import { calculateCgpa } from '../domain/gpa';
import { newDraft, newSemester, type ProfileDraft, type Semester } from '../domain/model';
import { api } from '../services/api';

function initialDraft(): ProfileDraft {
  try {
    const saved = sessionStorage.getItem('gpa-new-profile');
    if (saved) return JSON.parse(saved) as ProfileDraft;
  } catch { /* use a fresh form */ }
  return newDraft();
}

export function ProfileEditorPage({ mode, id }: { mode: 'create' | 'edit'; id?: string }) {
  const [draft, setDraft] = useState<ProfileDraft>(initialDraft);
  const [passcode, setPasscode] = useState('');
  const [verified, setVerified] = useState(mode === 'create');
  const [loading, setLoading] = useState(mode === 'edit' && Boolean(id));
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [calculated, setCalculated] = useState(false);
  const result = useMemo(() => calculateCgpa(draft.semesters, draft.scale), [draft]);
  useEffect(() => { if (mode === 'create') sessionStorage.removeItem('gpa-new-profile'); }, [mode]);
  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    setLoading(true); setLoadFailed(false); setError('');
    api.get(id).then(profile => setDraft(profile)).catch(error => { setError(error.message); setLoadFailed(true); }).finally(() => setLoading(false));
  }, [mode, id, reload]);
  const field = (key: keyof Pick<ProfileDraft, 'name' | 'university' | 'faculty' | 'department' | 'degree' | 'academicYear' | 'description'>, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const changeSemester = (updated: Semester) => { setDraft(current => ({ ...current, semesters: current.semesters.map(item => item.id === updated.id ? updated : item) })); setCalculated(false); };
  const verify = async () => {
    if (!id) return;
    setError(''); setSaving(true);
    try { await api.verify(id, passcode); setVerified(true); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to verify owner.'); }
    finally { setSaving(false); }
  };
  const validate = () => {
    const errors: Record<string, string> = {};
    for (const [key, label] of [['name', 'Profile name'], ['university', 'University'], ['faculty', 'Faculty'], ['degree', 'Degree programme'], ['academicYear', 'Academic year']] as const) {
      if (!draft[key].trim()) errors[key] = `${label} is required.`;
    }
    if (!draft.semesters.length) errors.semesters = 'Add at least one semester.';
    for (const semester of draft.semesters) {
      if (!semester.name.trim()) errors[`semester:${semester.id}:name`] = 'Semester name is required.';
      if (!semester.subjects.length) errors[`semester:${semester.id}:subjects`] = 'Add at least one subject.';
      for (const subject of semester.subjects) {
        if (!subject.code.trim()) errors[`subject:${subject.id}:code`] = 'Module code is required.';
        if (!subject.name.trim()) errors[`subject:${subject.id}:name`] = 'Subject name is required.';
        if (subject.credits === '' || !Number.isFinite(Number(subject.credits)) || Number(subject.credits) < 0 || Number(subject.credits) > 100) errors[`subject:${subject.id}:credits`] = 'Enter credits from 0 to 100.';
      }
    }
    if (mode === 'create' && passcode.length < 4) errors.passcode = 'Use at least four characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const save = async () => {
    if (!validate()) { setError('Please correct the highlighted fields.'); return; }
    setSaving(true); setError('');
    try {
      const target = mode === 'create' ? (await api.create(draft, passcode)).id : (await api.update(id!, draft, passcode)).id;
      window.location.hash = `#/profile/${target}`;
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save profile.'); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="container"><Loading label="Loading profile…" /></div>;
  if (mode === 'edit' && (!id || loadFailed)) return <div className="container"><Notice kind="error">{error || 'Profile ID is missing.'}</Notice><div className="form-actions">{id && <button className="button button-soft" onClick={() => setReload(value => value + 1)}>Retry</button>}<a className="button button-soft" href="#/search">Back to search</a></div></div>;
  return <div className="container profile-editor-page"><PageHead eyebrow={mode === 'create' ? 'SHARE ACADEMIC PROFILE' : 'OWNER MANAGEMENT'} title={mode === 'create' ? 'Create Academic GPA Profile' : 'Edit Profile'}>Build a clear academic record and share its modules with other students.</PageHead>
    {mode === 'edit' && !verified ? <section className="panel narrow-panel stack"><h2>Verify ownership</h2><p>Enter the owner passcode to edit this profile.</p><label>Owner passcode<input type="password" value={passcode} onChange={event => setPasscode(event.target.value)} /></label>{error && <Notice kind="error">{error}</Notice>}<button className="button button-primary" disabled={saving} onClick={verify}>{saving ? 'Checking…' : 'Verify passcode'}</button></section> : <div className="page-grid"><div className="stack">
      <section className="panel stack"><div className="panel-heading"><div><h2>Profile information</h2><p>These details appear in public search.</p></div></div><div className="form-grid">
        {([['name', 'Profile name', 'e.g. Applied Science 2025'], ['university', 'University', 'University name'], ['faculty', 'Faculty', 'Faculty name'], ['degree', 'Degree programme', 'Degree name'], ['academicYear', 'Academic year', 'e.g. 2025/2026']] as const).map(([key, label, placeholder]) => <label key={key}>{label}<input required aria-invalid={Boolean(fieldErrors[key])} value={draft[key]} placeholder={placeholder} onChange={event => field(key, event.target.value)} />{fieldErrors[key] && <small className="field-error">{fieldErrors[key]}</small>}</label>)}
      </div><label>Department (optional)<input value={draft.department} onChange={event => field('department', event.target.value)} placeholder="Department name" /></label><label>Description<textarea rows={3} value={draft.description} onChange={event => field('description', event.target.value)} placeholder="Optional notes about this profile" /></label></section>
      {draft.semesters.map((semester, index) => <section className="panel stack" key={semester.id}><div className="panel-heading"><div><span className="eyebrow">SEMESTER {index + 1}</span><h2>Subjects & grades</h2></div><button className="icon-button danger" aria-label={`Remove ${semester.name}`} onClick={() => setDraft(current => ({ ...current, semesters: current.semesters.filter(item => item.id !== semester.id) }))}><Trash2 size={18} /></button></div>
        <label>Semester name<input value={semester.name} onChange={event => changeSemester({ ...semester, name: event.target.value })} />{fieldErrors[`semester:${semester.id}:name`] && <small className="field-error">{fieldErrors[`semester:${semester.id}:name`]}</small>}</label>{fieldErrors[`semester:${semester.id}:subjects`] && <small className="field-error">{fieldErrors[`semester:${semester.id}:subjects`]}</small>}<SubjectEditor semester={semester} scale={draft.scale} onChange={changeSemester} errors={fieldErrors} /></section>)}
      {fieldErrors.semesters && <small className="field-error">{fieldErrors.semesters}</small>}<button className="button button-soft" onClick={() => setDraft(current => ({ ...current, semesters: [...current.semesters, newSemester(current.semesters.length + 1)] }))}><Plus size={16} /> Add semester</button>
      <section className="panel stack"><h2>Owner protection</h2><p className="muted">Your passcode protects editing and deletion. Keep it somewhere safe.</p><label>Owner passcode<input type="password" minLength={4} value={passcode} onChange={event => setPasscode(event.target.value)} placeholder={mode === 'create' ? 'At least 4 characters' : 'Verified passcode'} />{fieldErrors.passcode && <small className="field-error">{fieldErrors.passcode}</small>}</label></section>
    </div><aside className="stack"><section className="panel result-panel stack"><h2>Academic result</h2>{calculated ? <GpaSummary result={result} label="CGPA" /> : <p className="muted">Select Calculate to review your weighted result.</p>}<button className="button button-soft full" onClick={() => { setCalculated(true); setError(''); }}>Calculate GPA / CGPA</button>{error && <Notice kind="error">{error}</Notice>}<button className="button button-primary full" disabled={saving} onClick={save}>{saving ? 'Saving…' : mode === 'create' ? 'Save profile' : 'Save changes'}</button></section></aside></div>}
  </div>;
}
