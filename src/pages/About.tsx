import { AtSign, BriefcaseBusiness, Calculator, FileDown, GraduationCap, Search, ShieldCheck, Sparkles, Users } from 'lucide-react';

const capabilities = [
  { icon: Calculator, title: 'Quick calculations', text: 'Calculate a semester GPA instantly with your own subjects, credits, grades, and grading scale.' },
  { icon: GraduationCap, title: 'Reusable profiles', text: 'Build a public academic profile once and share the same module structure with your classmates.' },
  { icon: Search, title: 'Easy discovery', text: 'Find profiles by university, faculty, department, degree, academic year, semester, or module.' },
  { icon: FileDown, title: 'PDF reports', text: 'Generate a clean academic results report directly inside your browser.' },
];

export function AboutPage() {
  return <div className="container about-page">
    <section className="about-hero"><div className="about-hero-copy"><span className="hero-badge"><Sparkles size={14} /> BUILT FOR UNIVERSITY STUDENTS</span><h1>Academic results,<br /><em>made simple.</em></h1><p>Calculate GPA Plus helps students calculate results, organize semesters, share module templates, and understand academic progress without creating an account.</p><div className="about-hero-actions"><a className="button button-primary" href="#/calculator"><Calculator size={17} /> Calculate GPA</a><a className="button button-hero" href="#/search"><Search size={17} /> Explore profiles</a></div></div><div className="about-mark" aria-hidden="true"><GraduationCap size={64} /><strong>GPA+</strong><span>Calculate with confidence</span></div></section>

    <section className="about-intro"><div><span className="section-pill">OUR PURPOSE</span><h2>One clear place for GPA and CGPA</h2></div><p>University programmes can have different subjects, credit values, and grading scales. Calculate GPA Plus brings those details together in a simple tool that works for a quick calculation or a complete multi-semester academic profile.</p></section>

    <section className="about-capabilities">{capabilities.map(({ icon: Icon, title, text }) => <article className="about-capability" key={title}><span><Icon size={22} /></span><h3>{title}</h3><p>{text}</p></article>)}</section>

    <section className="about-values panel"><div><ShieldCheck size={27} /><span className="section-pill">PRIVACY FIRST</span><h2>Your personal results stay with you</h2><p>Grade choices on shared profiles and GPA calculations remain in your browser. PDF reports are also generated on your device.</p><a href="#/privacy">Read the privacy policy →</a></div><div className="about-value-list"><p><strong>No account required</strong><span>Start calculating without an email address or registration.</span></p><p><strong>Independent results</strong><span>Your grades never overwrite a shared academic profile.</span></p><p><strong>Owner protected profiles</strong><span>A private passcode controls profile editing and deletion.</span></p></div></section>

    <section className="creator-card"><div className="creator-avatar" aria-hidden="true">KK</div><div className="creator-copy"><span className="eyebrow">DEVELOPER &amp; CREATOR</span><h2>K.Kabeesan</h2><p>Calculate GPA Plus was designed and developed to make academic result calculations faster, clearer, and easier to share.</p></div><div className="creator-links" aria-label="Creator social links"><a href="https://www.instagram.com/K_KABEESAN" target="_blank" rel="noopener noreferrer"><AtSign size={19} /><span>Instagram</span></a><a href="https://www.facebook.com/share/1CTH7Bg4ri/" target="_blank" rel="noopener noreferrer"><Users size={19} /><span>Facebook</span></a><a href="https://www.linkedin.com/in/k-kabeesan-9b1917394/" target="_blank" rel="noopener noreferrer"><BriefcaseBusiness size={19} /><span>LinkedIn</span></a></div></section>
  </div>;
}
