import { ArrowRight, Calculator, Check, FileDown, GraduationCap, Search, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const paths = [
  { icon: Calculator, label: 'QUICK & PRIVATE', title: 'Normal GPA Calculator', text: 'Enter subjects, credits, and grades for an instant weighted GPA. Adjust the grading scale to match your university.', action: 'Start calculating', href: '#/calculator' },
  { icon: GraduationCap, label: 'CREATE & SHARE', title: 'Academic Profiles', text: 'Build a reusable profile with complete semesters and modules, then share one link with your classmates.', action: 'Create a profile', href: '#/create', featured: true },
  { icon: Search, label: 'FIND YOUR COURSE', title: 'Explore Profiles', text: 'Search public academic profiles by university, faculty, department, degree, year, semester, or subject.', action: 'Search profiles', href: '#/search' },
];

const steps = [
  ['01', 'Choose a starting point', 'Use the quick calculator, create your own profile, or find one already shared.'],
  ['02', 'Add or select grades', 'Enter credits and choose grades using the grading scale for your programme.'],
  ['03', 'Review your result', 'See semester GPA, cumulative GPA, total credits, and academic classification.'],
  ['04', 'Save your report', 'Download a clean PDF result report generated directly in your browser.'],
];

export function Home() {
  return <div className="container home-page home-v2">
    <section className="home-hero-v2">
      <div className="home-hero-copy"><span className="hero-badge"><Zap size={14} /> FAST, PRIVATE &amp; ACADEMIC READY</span><h1>Your GPA journey,<br /><em>all in one place.</em></h1><p>Calculate semester GPA and CGPA, build reusable academic profiles, and create result reports with a simple tool made for university students.</p><div className="home-hero-actions"><a className="button button-primary" href="#/calculator"><Calculator size={18} /> Calculate GPA now</a><a className="button button-hero" href="#/search"><Search size={18} /> Find my profile</a></div><div className="home-trust-row"><span><Check size={15} /> No account</span><span><Check size={15} /> Private grade choices</span><span><Check size={15} /> Free to use</span></div></div>
      <div className="home-dashboard" aria-hidden="true"><div className="dashboard-top"><span>ACADEMIC OVERVIEW</span><i></i></div><div className="dashboard-score"><small>CUMULATIVE GPA</small><strong>3.67</strong><span>First Class</span></div><div className="dashboard-metrics"><div><small>TOTAL CREDITS</small><b>72</b></div><div><small>SEMESTERS</small><b>4</b></div></div><div className="dashboard-bars"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
    </section>

    <section className="home-proof"><div><strong>Instant</strong><span>browser calculations</span></div><div><strong>Flexible</strong><span>grading scales</span></div><div><strong>Reusable</strong><span>academic profiles</span></div><div><strong>Local</strong><span>PDF generation</span></div></section>

    <section className="home-paths"><div className="section-heading"><span className="section-pill">CHOOSE YOUR PATH</span><h2>Start with what you need</h2><p>Every route leads to a clear, credit weighted academic result.</p></div><div className="path-grid">{paths.map(({ icon: Icon, label, title, text, action, href, featured }) => <a className={`path-card${featured ? ' featured' : ''}`} href={href} key={title}>{featured && <span className="path-popular">MOST POPULAR</span>}<span className="path-icon"><Icon size={24} /></span><small>{label}</small><h3>{title}</h3><p>{text}</p><b>{action} <ArrowRight size={16} /></b></a>)}</div></section>

    <section className="home-workflow panel"><div className="workflow-heading"><span className="section-pill">HOW IT WORKS</span><h2>From subjects to a finished result</h2><p>Four simple steps take you from module information to a report you can keep.</p></div><div className="workflow-steps">{steps.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>

    <section className="home-tool-band"><div className="tool-band-icon"><Sparkles size={31} /></div><div><span className="eyebrow">SAVE TIME ENTERING SUBJECTS</span><h2>Turn a module list into a profile</h2><p>Upload a PDF or image, or paste module text. Review the extracted subjects and continue directly to profile creation.</p></div><a className="button button-primary" href="#/auto-profile-generator">Open Auto Profile Generator <ArrowRight size={16} /></a></section>

    <section className="home-confidence"><div><ShieldCheck size={25} /><h3>Your grades stay private</h3><p>Grade choices on shared profiles remain in your browser and do not change the public template.</p></div><div><GraduationCap size={25} /><h3>Built for full programmes</h3><p>Organize multiple semesters, fixed credits, grading scales, and cumulative academic results.</p></div><div><FileDown size={25} /><h3>Reports on your device</h3><p>Generate PDF academic reports locally without uploading your personal result information.</p></div></section>

    <section className="home-final-cta"><span className="section-pill">READY WHEN YOU ARE</span><h2>Calculate your result in minutes.</h2><p>Start with a quick calculation or create an academic profile for your whole programme.</p><div><a className="button button-primary" href="#/calculator">Calculate GPA</a><a className="button button-soft" href="#/create">Create Profile</a></div></section>
  </div>;
}
