import { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
const NormalCalculatorPage = lazy(() => import('./pages/NormalCalculatorPage').then(module => ({ default: module.NormalCalculatorPage })));
const CreateProfilePage = lazy(() => import('./pages/CreateProfilePage').then(module => ({ default: module.CreateProfilePage })));
const AiProfileGeneratorPage = lazy(() => import('./pages/AiProfileGeneratorPage').then(module => ({ default: module.AiProfileGeneratorPage })));
const ProfileViewerPage = lazy(() => import('./pages/ProfileViewerPage').then(module => ({ default: module.ProfileViewerPage })));
const ProfileManagePage = lazy(() => import('./pages/ProfileManagePage').then(module => ({ default: module.ProfileManagePage })));
const SearchProfilesPage = lazy(() => import('./pages/SearchProfilesPage').then(module => ({ default: module.SearchProfilesPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));
import type { Subject } from './types';

export function App() {
  return <Suspense fallback={<div role="status" className="p-8 text-center">Loading?</div>}><AppContent /></Suspense>;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'home' | 'normal' | 'create' | 'ai' | 'search' | 'viewer' | 'manage' | 'about' | 'privacy'>('home');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // State passed from normal calculator when user clicks "Save as Shared Profile"
  const [prefilledSubjects, setPrefilledSubjects] = useState<Subject[]>([]);

  // Parse URL hash or path for direct links like /#profile-GPA-N301-A82F91 or /#/profile/GPA-N301-A82F91 or /profile/GPA-N301-A82F91
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      if (hash.startsWith('#/profile/') || hash.startsWith('#profile/')) {
        const id = hash.replace(/^#\/?profile\//, '').trim().toUpperCase();
        if (id) {
          setSelectedProfileId(id);
          setActiveTab('viewer');
          return;
        }
      } else if (hash.startsWith('#profile-')) {
        const id = hash.replace('#profile-', '').trim().toUpperCase();
        if (id) {
          setSelectedProfileId(id);
          setActiveTab('viewer');
          return;
        }
      } else if (hash.startsWith('#/manage/') || hash.startsWith('#manage/')) {
        const id = hash.replace(/^#\/?manage\//, '').trim().toUpperCase();
        if (id) {
          setSelectedProfileId(id);
          setActiveTab('manage');
          return;
        }
      } else if (hash.startsWith('#manage-')) {
        const id = hash.replace('#manage-', '').trim().toUpperCase();
        if (id) {
          setSelectedProfileId(id);
          setActiveTab('manage');
          return;
        }
      } else if (pathname.startsWith('/profile/')) {
        const id = pathname.replace('/profile/', '').trim().toUpperCase();
        if (id) {
          setSelectedProfileId(id);
          setActiveTab('viewer');
          return;
        }
      } else if (pathname.startsWith('/manage/')) {
        const id = pathname.replace('/manage/', '').trim().toUpperCase();
        if (id) {
          setSelectedProfileId(id);
          setActiveTab('manage');
          return;
        }
      } else if (hash === '#ai' || hash === '#/ai') {
        setActiveTab('ai');
      } else if (hash === '#search' || hash === '#/search') {
        setActiveTab('search');
      } else if (hash === '#privacy' || hash === '#/privacy') {
        setActiveTab('privacy');
      } else if (hash === '#about' || hash === '#/about') {
        setActiveTab('about');
      } else if (hash === '#create' || hash === '#/create') {
        setActiveTab('create');
      }
    };

    handleLocationChange();
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleNavigate = (page: string, params?: any) => {
    if (page === 'viewer' && params?.id) {
      setSelectedProfileId(params.id);
      window.location.hash = `/profile/${params.id}`;
      setActiveTab('viewer');
    } else if (page === 'manage' && params?.id) {
      setSelectedProfileId(params.id);
      window.location.hash = `/manage/${params.id}`;
      setActiveTab('manage');
    } else {
      window.location.hash = `/${page}`;
      setActiveTab(page as any);
    }
  };

  const handleConvertToProfile = (subjects: Subject[]) => {
    setPrefilledSubjects(subjects);
    setActiveTab('create');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => handleNavigate(tab)}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomePage
            onNavigate={(page, params) => handleNavigate(page, params)}
          />
        )}

        {activeTab === 'normal' && (
          <NormalCalculatorPage
            onConvertToProfile={handleConvertToProfile}
          />
        )}

        {activeTab === 'create' && (
          <CreateProfilePage
            initialSubjects={prefilledSubjects}
            onProfileCreated={(newId) => handleNavigate('viewer', { id: newId })}
          />
        )}

        {activeTab === 'ai' && (
          <AiProfileGeneratorPage
            onProfileCreated={(newId) => handleNavigate('viewer', { id: newId })}
          />
        )}

        {activeTab === 'search' && (
          <SearchProfilesPage
            onOpenProfile={(id) => handleNavigate('viewer', { id })}
          />
        )}

        {activeTab === 'viewer' && (
          <ProfileViewerPage
            profileId={selectedProfileId}
            onNavigateToManage={(id) => handleNavigate('manage', { id })}
          />
        )}

        {activeTab === 'manage' && (
          <ProfileManagePage
            profileId={selectedProfileId}
            onNavigateToViewer={(id) => handleNavigate('viewer', { id })}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {activeTab === 'about' && <AboutPage />}

        {activeTab === 'privacy' && (
          <PrivacyPage onNavigateHome={() => handleNavigate('home')} />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={(page) => handleNavigate(page)} />
    </div>
  );
}

export default App;
