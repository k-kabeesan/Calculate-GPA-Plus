import { PageHead } from '../components/ui';

export function AboutPage() {
  return <div className="container narrow">
    <PageHead eyebrow="ABOUT" title="Calculate GPA Plus">A GPA and CGPA calculator with shared academic profiles.</PageHead>
    <section className="panel static-page stack">
      <h2>Created by K.Kabeesan</h2>
      <p>Connect with the creator:</p>
      <ul className="about-links">
        <li><a href="https://www.instagram.com/K_KABEESAN" target="_blank" rel="noopener noreferrer">Instagram · @K_KABEESAN</a></li>
        <li><a href="https://www.facebook.com/share/1CTH7Bg4ri/" target="_blank" rel="noopener noreferrer">Facebook · K.Kabeesan</a></li>
        <li><a href="https://www.linkedin.com/in/k-kabeesan-9b1917394/" target="_blank" rel="noopener noreferrer">LinkedIn · K.Kabeesan</a></li>
      </ul>
    </section>
  </div>;
}
