import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Profile, Semester } from '../domain/model';
import { calculateCgpa, calculateGpa } from '../domain/gpa';
import { GpaSummary, Loading, Notice, PageHead } from '../components/ui';
import { GpaInsights } from '../components/GpaInsights';
import { buildReport } from '../services/pdf';

export function ProfilePage({ id }: { id: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [reload, setReload] = useState(0);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [studentName, setStudentName] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setLoading(true); setError('');
    try { setGrades(JSON.parse(localStorage.getItem(`gpa-grades:${id}`) || '{}') as Record<string, string>); } catch { setGrades({}); }
    api.get(id).then(setProfile).catch(error => setError(error.message)).finally(() => setLoading(false));
  }, [id, reload]);
  const setGrade = (subjectId: string, grade: string) => {
    const next = { ...grades, [subjectId]: grade };
    setGrades(next); localStorage.setItem(`gpa-grades:${id}`, JSON.stringify(next));
  };
  const personal = useMemo(() => profile ? { ...profile, semesters: profile.semesters.map(semester => ({ ...semester, subjects: semester.subjects.map(subject => ({ ...subject, grade: grades[`${semester.name}:${subject.code}`] ?? subject.grade })) })) } : null, [profile, grades]);
  const remove = async () => {
    if (!profile) return;
    setDeleting(true); setError('');
    try { await api.remove(profile.id, passcode); window.location.hash = '#/search'; }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to delete profile.'); }
    finally { setDeleting(false); }
  };
  const share = async () => {
    if (!profile) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/#/profile/${profile.id}`); setCopied(true); }
    catch { setError('Unable to copy the link. You can copy this page address from your browser.'); }
  };
  const downloadPdf = () => {
    if (!personal) return;
    setError('');
    try { buildReport(personal, studentName); }
    catch { setError('Unable to create the PDF. Please try again or use a different browser.'); }
  };
  if (loading) return <div className="container"><Loading label="Loading profile…" /></div>;
  if (!profile) return <div className="container"><Notice kind="error">{error || 'Profile not found.'}</Notice><div className="form-actions"><button className="button button-soft" onClick={() => setReload(value => value + 1)}>Retry</button><a className="button button-soft" href="#/search">Back to search</a></div></div>;
  const result = calculateCgpa(personal!.semesters, personal!.scale);
  return <div className="container"><PageHead eyebrow="PUBLIC ACADEMIC PROFILE" title={profile.name}>{profile.university} · {profile.faculty}</PageHead>
    <div className="profile-actions"><a className="button button-soft" href="#/search">← Search</a><button className="button button-soft" onClick={share}>{copied ? 'Link copied' : 'Copy share link'}</button><a className="button button-soft" href={`#/edit/${profile.id}`}>Edit profile</a><button className="button button-danger" onClick={() => setShowDelete(!showDelete)}>Delete</button></div>
    {showDelete && <section className="panel narrow-panel stack"><h2>Delete profile</h2><p>This removes the public profile and all of its semesters and subjects.</p><label>Owner passcode<input type="password" value={passcode} onChange={event => setPasscode(event.target.value)} /></label><button className="button button-danger" disabled={deleting} onClick={remove}>{deleting ? 'Deleting…' : 'Confirm delete'}</button></section>}
    {error && <Notice kind="error">{error}</Notice>}
    <div className="page-grid"><div className="stack"><section className="panel"><div className="info-grid"><div><span>University</span><strong>{profile.university}</strong></div><div><span>Faculty</span><strong>{profile.faculty}</strong></div>{profile.department && <div><span>Department</span><strong>{profile.department}</strong></div>}<div><span>Degree</span><strong>{profile.degree}</strong></div><div><span>Academic year</span><strong>{profile.academicYear}</strong></div></div>{profile.description && <p>{profile.description}</p>}</section>
      {personal!.semesters.map((semester: Semester) => <section className="panel" key={semester.id}><div className="panel-heading"><div><span className="eyebrow">ACADEMIC RECORD</span><h2>{semester.name}</h2></div><strong>GPA {calculateGpa(semester.subjects, profile.scale).gpa?.toFixed(2) ?? '—'}</strong></div><div className="table-scroll"><table><thead><tr><th>Code</th><th>Subject</th><th>Credits</th><th>Your grade</th></tr></thead><tbody>{semester.subjects.map(subject => <tr key={subject.id}><td>{subject.code}</td><td>{subject.name}</td><td>{subject.credits}</td><td><select aria-label={`Grade for ${subject.name}`} value={subject.grade} onChange={event => setGrade(`${semester.name}:${subject.code}`, event.target.value)}><option value="">Choose grade</option>{profile.scale.map(item => <option key={item.grade} value={item.grade}>{item.grade}</option>)}</select></td></tr>)}</tbody></table></div></section>)}
    </div><aside><section className="panel result-panel stack"><div><h2>Your result</h2><p>Your grade choices stay in this browser.</p></div><GpaSummary result={result} label="CGPA" /><label>Student name for PDF<input value={studentName} onChange={event => setStudentName(event.target.value)} placeholder="Optional" /></label><button className="button button-soft full" onClick={downloadPdf}>Download PDF</button></section></aside></div>
    <GpaInsights result={result} subjects={personal!.semesters.flatMap(semester => semester.subjects)} scale={profile.scale} />
  </div>;
}
