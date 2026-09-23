import type { ReactNode } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import type { GpaResult } from '../domain/gpa';
import { academicClass } from '../domain/gpa';

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <header className="page-head"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children && <p>{children}</p>}</header>;
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error' | 'success'; children: ReactNode }) {
  return <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
    {kind === 'error' && <AlertCircle size={18} />}<span>{children}</span>
  </div>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="state-card" role="status"><LoaderCircle className="spin" size={22} /><p>{label}</p></div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="state-card"><h3>{title}</h3>{children && <p>{children}</p>}</div>;
}

export function GpaSummary({ result, label = 'GPA' }: { result: GpaResult; label?: string }) {
  return <div className="gpa-summary">
    <div className="gpa-main"><span>{label}</span><strong>{result.gpa?.toFixed(2) ?? '—'}</strong><small>{academicClass(result.gpa)}</small></div>
    <div><span>Total credits</span><strong>{result.credits.toFixed(2)}</strong></div>
    <div><span>Quality points</span><strong>{result.qualityPoints.toFixed(2)}</strong></div>
    <div><span>Graded subjects</span><strong>{result.gradedSubjects}</strong></div>
  </div>;
}
