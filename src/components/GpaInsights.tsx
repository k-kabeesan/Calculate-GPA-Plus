import { useEffect, useMemo, useState } from 'react';
import type { GpaResult } from '../domain/gpa';
import { planTarget } from '../domain/gpa';
import type { GradePoint, Subject } from '../domain/model';

export function GpaInsights({ result, subjects, scale }: { result: GpaResult; subjects: Subject[]; scale: GradePoint[] }) {
  const [showPlanner, setShowPlanner] = useState(false);
  const [current, setCurrent] = useState(result.gpa?.toFixed(2) || '0');
  const [completed, setCompleted] = useState(String(result.credits));
  const [target, setTarget] = useState('3.50');
  const [future, setFuture] = useState('30');
  useEffect(() => { setCurrent(result.gpa?.toFixed(2) || '0'); setCompleted(String(result.credits)); }, [result.gpa, result.credits]);
  const points = useMemo(() => new Map(scale.map(item => [item.grade, item.points])), [scale]);
  const graded = subjects.filter(subject => subject.grade && points.has(subject.grade) && subject.credits !== '');
  if (!graded.length) return null;
  const ordered = [...graded].sort((a, b) => (points.get(b.grade) || 0) - (points.get(a.grade) || 0));
  const distribution = [...new Set(graded.map(subject => subject.grade))].map(grade => ({ grade, count: graded.filter(subject => subject.grade === grade).length }));
  const maxPoint = Math.max(...scale.map(item => item.points));
  const plan = [current, completed, target, future].every(value => value.trim() !== '')
    ? planTarget(Number(current), Number(completed), Number(target), Number(future), maxPoint)
    : { status: 'invalid' as const, message: 'Complete all four fields to see your plan.' };
  return <section className="panel insights-panel stack"><div className="panel-heading"><div><span className="eyebrow">PERFORMANCE & GOALS</span><h2>GPA insights</h2><p>Explore your grades and plan your next result.</p></div><button className="button button-soft" onClick={() => setShowPlanner(!showPlanner)}>{showPlanner ? 'Hide planner' : 'Target GPA planner'}</button></div>
    <div className="insight-grid"><div><span>Highest subject</span><strong>{ordered[0].name}</strong><small>{ordered[0].grade} · {points.get(ordered[0].grade)?.toFixed(1)} points</small></div><div><span>Needs focus</span><strong>{ordered[ordered.length - 1].name}</strong><small>{ordered[ordered.length - 1].grade} · {points.get(ordered[ordered.length - 1].grade)?.toFixed(1)} points</small></div><div><span>Grade distribution</span><div className="grade-tags">{distribution.map(item => <b key={item.grade}>{item.grade} × {item.count}</b>)}</div></div></div>
    {showPlanner && <div className="planner"><div className="form-grid"><label>Current GPA<input type="number" min="0" max={maxPoint} step="0.01" value={current} onChange={event => setCurrent(event.target.value)} /></label><label>Completed credits<input type="number" min="0" step="0.5" value={completed} onChange={event => setCompleted(event.target.value)} /></label><label>Target CGPA<input type="number" min="0" max={maxPoint} step="0.01" value={target} onChange={event => setTarget(event.target.value)} /></label><label>Future credits<input type="number" min="0.5" step="0.5" value={future} onChange={event => setFuture(event.target.value)} /></label></div><div className={`plan-result plan-${plan.status}`} role="status"><strong>{plan.status === 'achievable' ? `Required GPA: ${plan.requiredGpa.toFixed(2)}` : plan.status === 'impossible' ? 'Target out of reach' : plan.status === 'already-achieved' ? 'Target secured' : 'Check your values'}</strong><p>{plan.message}</p></div></div>}
  </section>;
}
