import { lazy, Suspense, useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { HomePage } from '../pages/HomePage';
import type { GradeOption, Subject } from '../types';
import { DEFAULT_GRADING_SCALE } from '../utils/gpa';
import { parseLocation, routeFor, type AppPage } from './navigation';

const NormalCalculatorPage = lazy(() => import('../pages/NormalCalculatorPage').then(module => ({ default: module.NormalCalculatorPage })));
const CreateProfilePage = lazy(() => import('../pages/CreateProfilePage').then(module => ({ default: module.CreateProfilePage })));
const AiProfileGeneratorPage = lazy(() => import('../pages/AiProfileGeneratorPage').then(module => ({ default: module.AiProfileGeneratorPage })));
const ProfileViewerPage = lazy(() => import('../pages/ProfileViewerPage').then(module => ({ default: module.ProfileViewerPage })));
const ProfileManagePage = lazy(() => import('../pages/ProfileManagePage').then(module => ({ default: module.ProfileManagePage })));
const SearchProfilesPage = lazy(() => import('../pages/SearchProfilesPage').then(module => ({ default: module.SearchProfilesPage })));
const AboutPage = lazy(() => import('../pages/AboutPage').then(module => ({ default: module.AboutPage })));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));

interface NavigationParams {
  id?: string;
}

export function AppShell() {
  const [location, setLocation] = useState(() => parseLocation(window.location));
  const [prefilledSubjects, setPrefilledSubjects] = useState<Subject[]>([]);
  const [prefilledScale, setPrefilledScale] = useState<GradeOption[]>(DEFAULT_GRADING_SCALE);

  useEffect(() => {
    const syncLocation = () => setLocation(parseLocation(window.location));
    window.addEventListener('hashchange', syncLocation);
    window.addEventListener('popstate', syncLocation);
    return () => {
      window.removeEventListener('hashchange', syncLocation);
      window.removeEventListener('popstate', syncLocation);
    };
  }, []);

  const navigate = (page: string, params?: NavigationParams) => {
    const nextPage = page as AppPage;
    const profileId = params?.id?.trim().toUpperCase();
    window.location.hash = routeFor(nextPage, profileId).slice(1);
    setLocation({ page: nextPage, profileId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConvertToProfile = (subjects: Subject[], scale: GradeOption[]) => {
    setPrefilledSubjects(subjects);
    setPrefilledScale(scale);
    navigate('create');
  };

  const page = location.page;
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar activeTab={page} setActiveTab={tab => navigate(tab)} />
      <main className="flex-1">
        {page === 'home' && <HomePage onNavigate={navigate} />}
        {page === 'normal' && <NormalCalculatorPage onConvertToProfile={handleConvertToProfile} />}
        {page === 'create' && <CreateProfilePage initialSubjects={prefilledSubjects} initialGradingScale={prefilledScale} onProfileCreated={id => navigate('viewer', { id })} />}
        {page === 'ai' && <AiProfileGeneratorPage onProfileCreated={id => navigate('viewer', { id })} />}
        {page === 'search' && <SearchProfilesPage onOpenProfile={id => navigate('viewer', { id })} />}
        {page === 'viewer' && <ProfileViewerPage profileId={location.profileId ?? ''} onNavigateToManage={id => navigate('manage', { id })} />}
        {page === 'manage' && <ProfileManagePage profileId={location.profileId ?? ''} onNavigateToViewer={id => navigate('viewer', { id })} onNavigateHome={() => navigate('home')} />}
        {page === 'about' && <AboutPage />}
        {page === 'privacy' && <PrivacyPage onNavigateHome={() => navigate('home')} />}
      </main>
      <Footer onNavigate={navigate} />
    </div>
  );
}

export function App() {
  return <Suspense fallback={<div role="status" className="p-8 text-center">Loading…</div>}><AppShell /></Suspense>;
}
