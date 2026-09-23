import { useEffect, useState } from 'react';
import { Calculator, GraduationCap, Home as HomeIcon, Menu, PlusCircle, Search, Sparkles, X } from 'lucide-react';
import { Home } from '../pages/Home';
import { CalculatorPage } from '../pages/Calculator';
import { SearchPage } from '../pages/Search';
import { ProfilePage } from '../pages/Profile';
import { ProfileEditorPage } from '../pages/ProfileEditor';
import { ImportPage } from '../pages/Import';
import { PrivacyPage } from '../pages/Privacy';
import { AboutPage } from '../pages/About';

function route() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''));
  if (hash.startsWith('profile-')) return ['profile', hash.slice(8)] as const;
  if (hash.startsWith('manage-')) return ['edit', hash.slice(7)] as const;
  const [page, id] = hash.split('/');
  return [page || 'home', id || ''] as const;
}

export function App() {
  const [[page, id], setRoute] = useState(route);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const sync = () => { setRoute(route()); setMenuOpen(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const nav = [
    { href: '#/home', label: 'Home', icon: HomeIcon },
    { href: '#/calculator', label: 'Normal Calculator', icon: Calculator },
    { href: '#/create', label: 'Create Profile', icon: PlusCircle },
    { href: '#/auto-profile-generator', label: 'Auto Profile Generator', icon: Sparkles },
    { href: '#/search', label: 'Search Profiles', icon: Search },
    { href: '#/about', label: 'About' },
  ];
  let content;
  switch (page) {
    case 'home': content = <Home />; break;
    case 'calculator': case 'normal': content = <CalculatorPage />; break;
    case 'create': content = <ProfileEditorPage key="create" mode="create" />; break;
    case 'edit': case 'manage': content = <ProfileEditorPage key={`edit:${id}`} mode="edit" id={id} />; break;
    case 'profile': case 'viewer': content = <ProfilePage key={id} id={id} />; break;
    case 'search': content = <SearchPage />; break;
    case 'auto-profile-generator': case 'import': content = <ImportPage />; break;
    case 'about': content = <AboutPage />; break;
    case 'privacy': content = <PrivacyPage />; break;
    default: content = <StaticPage title="Page not found" text="This page does not exist." />;
  }
  return <div className="site-shell">
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="#/home"><span className="brand-mark"><GraduationCap size={22} /></span><span>Calculate GPA Plus</span></a>
      <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
        {nav.map(({ href, label, icon: Icon }) => <a key={href} className={(window.location.hash || '#/home') === href ? 'active' : ''} href={href}>{Icon && <Icon size={15} />}{label}</a>)}
      </nav>
      <button className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </div></header>
    <main className="main-content">{content}</main>
    <footer className="site-footer"><div className="footer-inner"><div className="footer-intro"><strong>Calculate GPA Plus</strong><p>A GPA and CGPA calculator for university students. Build shared academic profiles, explore modules, and export PDF result reports.</p></div>
      <div className="footer-nav"><h2>Quick navigation</h2><div className="footer-links"><a href="#/home">Home page</a><a href="#/calculator">Normal GPA Calculator</a><a href="#/create">Create shared profile</a><a href="#/search">Search profiles</a><a href="#/about">About</a><a href="#/privacy">Privacy policy</a></div></div>
      <div className="footer-privacy"><h2>Privacy &amp; security</h2><p>Your grade choices on a shared profile stay in your browser. Profile creators control edits with an owner passcode.</p><a href="#/privacy">Read full privacy policy →</a></div>
      <small>© {new Date().getFullYear()} Calculate GPA Plus · K.Kabeesan</small></div></footer>
  </div>;
}

function StaticPage({ title, text }: { title: string; text: string }) {
  return <div className="container narrow"><section className="panel static-page"><h1>{title}</h1><p>{text}</p><a className="button button-primary" href="#/home">Go home</a></section></div>;
}
