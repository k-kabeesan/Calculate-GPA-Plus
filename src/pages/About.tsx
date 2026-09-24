import { AtSign, BriefcaseBusiness, Calculator, GraduationCap, Search, Users } from 'lucide-react';

export function AboutPage() {
  return <div className="container about-page about-page-short">
    <section className="about-hero"><div className="about-hero-copy"><span className="hero-badge"><GraduationCap size={14} /> CALCULATE GPA PLUS</span><h1>GPA calculations,<br /><em>made simple.</em></h1><p>Calculate semester GPA and CGPA, create reusable academic profiles, and download clear result reports.</p><div className="about-hero-actions"><a className="button button-primary" href="#/calculator"><Calculator size={17} /> Calculate GPA</a><a className="button button-hero" href="#/search"><Search size={17} /> Find a profile</a></div></div><div className="about-mark" aria-hidden="true"><GraduationCap size={64} /><strong>GPA+</strong><span>Calculate with confidence</span></div></section>

    <section className="creator-card"><div className="creator-avatar" aria-hidden="true">KK</div><div className="creator-copy"><span className="eyebrow">CREATED BY</span><h2>K.Kabeesan</h2><p>A simple GPA and CGPA calculator created for university students.</p></div><div className="creator-links" aria-label="Creator social links"><a href="https://www.instagram.com/K_KABEESAN" target="_blank" rel="noopener noreferrer"><AtSign size={19} /><span>Instagram</span></a><a href="https://www.facebook.com/share/1CTH7Bg4ri/" target="_blank" rel="noopener noreferrer"><Users size={19} /><span>Facebook</span></a><a href="https://www.linkedin.com/in/k-kabeesan-9b1917394/" target="_blank" rel="noopener noreferrer"><BriefcaseBusiness size={19} /><span>LinkedIn</span></a></div></section>
  </div>;
}
