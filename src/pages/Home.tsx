import { ArrowRight, Calculator, Check, FileDown, GraduationCap, Search, ShieldCheck, Sparkles } from 'lucide-react';

const choices = [
  { icon: Calculator, title: 'Calculate GPA', text: 'Enter your subjects, credits, and grades for a quick result.', action: 'Open calculator', href: '#/calculator' },
  { icon: Search, title: 'Find a Profile', text: 'Search for a module list already shared by your university or batch.', action: 'Search profiles', href: '#/search' },
  { icon: GraduationCap, title: 'Create a Profile', text: 'Create a reusable academic profile and share it with classmates.', action: 'Create profile', href: '#/create' },
];

export function Home() {
  return <div className="container simple-home">
    <section className="simple-hero"><span className="section-pill">CALCULATE GPA PLUS</span><h1>Calculate your GPA.<br />Simple, fast, and private.</h1><p>Get your semester GPA or CGPA, use a shared academic profile, and download a PDF result report.</p><div className="simple-hero-actions"><a className="button button-primary" href="#/calculator"><Calculator size={18} /> Calculate GPA</a><a className="button button-soft" href="#/search"><Search size={18} /> Find a Profile</a></div><div className="simple-benefits"><span><Check size={15} /> No account required</span><span><Check size={15} /> Grades stay in your browser</span><span><Check size={15} /> Free to use</span></div></section>

    <section className="simple-section"><div className="simple-heading"><span className="section-pill">GET STARTED</span><h2>What would you like to do?</h2></div><div className="simple-choice-grid">{choices.map(({ icon: Icon, title, text, action, href }) => <a className="simple-choice" href={href} key={title}><span><Icon size={24} /></span><h3>{title}</h3><p>{text}</p><b>{action} <ArrowRight size={16} /></b></a>)}</div></section>

    <section className="simple-steps panel"><div className="simple-heading"><span className="section-pill">HOW IT WORKS</span><h2>Three easy steps</h2></div><div className="simple-step-grid"><article><span>1</span><h3>Add subjects</h3><p>Enter subjects yourself or open a shared profile.</p></article><article><span>2</span><h3>Choose grades</h3><p>Select each grade and let the app calculate automatically.</p></article><article><span>3</span><h3>Save your result</h3><p>Review your GPA or CGPA and download the PDF.</p></article></div></section>

    <section className="simple-tools"><div><Sparkles size={24} /><h3>Have a module list?</h3><p>Use the Auto Profile Generator to extract subjects from a PDF, image, or pasted text.</p><a href="#/auto-profile-generator">Open generator <ArrowRight size={15} /></a></div><div><ShieldCheck size={24} /><h3>Your privacy matters</h3><p>Your grade choices and generated PDF results stay on your device.</p><a href="#/privacy">Read privacy policy <ArrowRight size={15} /></a></div><div><FileDown size={24} /><h3>Clean PDF reports</h3><p>Download an academic report with subjects, credits, grades, and GPA.</p><a href="#/calculator">Create a report <ArrowRight size={15} /></a></div></section>

    <section className="simple-final"><h2>Ready to calculate?</h2><p>Start now and get your result in a few minutes.</p><a className="button button-primary" href="#/calculator">Open GPA Calculator <ArrowRight size={16} /></a></section>
  </div>;
}
