import { ArrowRight, Calculator, FileDown, GraduationCap, Search, ShieldCheck, Sparkles } from 'lucide-react';

const steps = [
  { title: 'Calculate your GPA', text: 'Use the Normal Calculator for quick, private calculations with your university’s grade points.' },
  { title: 'Create or find a profile', text: 'Build a reusable module list or search for a profile shared by your batch.' },
  { title: 'Enter your grades', text: 'Choose grades for each subject. Your own choices on shared profiles stay in your browser.' },
  { title: 'Get your GPA / CGPA', text: 'See credit weighted results, academic class, grade insights, and target GPA planning.' },
  { title: 'Generate your PDF', text: 'Download a clean academic result report directly from your browser.' },
];

export function Home() {
  return <div className="container home-page">
    <section className="hero">
      <div className="hero-content">
        <span className="hero-badge"><Sparkles size={14} /> Fast, Modern &amp; Academic Ready</span>
        <h1>Calculate Your GPA Easily</h1>
        <p>Calculate your GPA instantly or create a reusable academic profile with predefined subjects and credits for your university.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="#/calculator"><Calculator size={17} /> Calculate GPA</a>
          <a className="button button-hero" href="#/create"><GraduationCap size={17} /> Create Profile</a>
          <a className="button button-hero" href="#/auto-profile-generator"><Sparkles size={17} /> Auto Profile Generator</a>
          <a className="button button-hero" href="#/search"><Search size={17} /> Search Profiles</a>
        </div>
      </div>
    </section>

    <section className="home-steps panel">
      <div className="section-heading"><span className="section-pill">Simple 5-Step Process</span><h2>How It Works</h2><p>Everything you need for semester calculations and shared academic profiles.</p></div>
      <div className="steps-grid">{steps.map((step, index) => <div className="step-card" key={step.title}><span className={`step-number step-${index + 1}`}>{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></div>)}</div>
    </section>

    <section className="home-section"><div className="section-heading"><span className="section-pill">CHOOSE YOUR PATH</span><h2>Choose Your Calculation Mode</h2><p>Calculate privately, share a module template, or find one for your university.</p></div>
      <div className="feature-grid">
        <a className="feature-card" href="#/calculator"><Calculator size={25} /><h3>Normal GPA Calculator</h3><p>Add subjects, enter credits, select grades, and customize the grading scale without creating an account.</p><span>Calculate now <ArrowRight size={16} /></span></a>
        <a className="feature-card featured" href="#/create"><span className="feature-tag">MOST POPULAR</span><GraduationCap size={25} /><h3>Shared GPA Profiles</h3><p>Create a profile with university modules and fixed credits, then share it with your batch.</p><span>Create academic profile <ArrowRight size={16} /></span></a>
        <a className="feature-card" href="#/search"><Search size={25} /><h3>Explore Public Profiles</h3><p>Find a shared profile by university, faculty, degree programme, semester, or module.</p><span>Search profiles <ArrowRight size={16} /></span></a>
      </div></section>

    <section className="home-band"><div><span className="section-pill">MORE TOOLS</span><h2>From module list to result report</h2><p>Extract subjects from text, PDF, or images, review their credits, and download a readable PDF of your result.</p></div>
      <div className="band-actions"><a className="button button-primary" href="#/auto-profile-generator"><Sparkles size={17} /> Auto Profile Generator</a><span><FileDown size={19} /> Browser generated PDF reports</span></div></section>

    <section className="home-assurances"><div><ShieldCheck size={23} /><h3>Isolated student results</h3><p>Your grade choices on a shared profile do not change the public template.</p></div><div><GraduationCap size={23} /><h3>Multiple semesters</h3><p>Get semester GPAs and a credit weighted cumulative result.</p></div><div><FileDown size={23} /><h3>Local PDF generator</h3><p>Create a printable academic report in your browser.</p></div></section>
  </div>;
}
