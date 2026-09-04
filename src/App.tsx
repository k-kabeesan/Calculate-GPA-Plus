import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { NormalCalculatorPage } from './pages/NormalCalculatorPage';
import { CreateProfilePage } from './pages/CreateProfilePage';
import { AiProfileGeneratorPage } from './pages/AiProfileGeneratorPage';
import { ProfileViewerPage } from './pages/ProfileViewerPage';
import { ProfileManagePage } from './pages/ProfileManagePage';
import { SearchProfilesPage } from './pages/SearchProfilesPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import type { Subject } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'normal' | 'create' | 'ai' | 'search' | 'viewer' | 'manage' | 'about' | 'privacy'>('home');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // State passed from normal calculator when user clicks "Save as Shared Profile"
  const [prefilledSubjects, setPrefilledSubjects] = useState<Subject[]>([]);

  // Parse URL hash for direct links like /#profile-ABC123
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#profile-')) {
        const id = hash.replace('#profile-', '').trim().toUpperCase();
        if (id) {
          setSelectedProfileId(id);
          setActiveTab('viewer');
        }
      } else if (hash.startsWith('#manage-')) {
        const id = hash.replace('#manage-', '').trim().toUpperCase();
        if (id) {
          setSelectedProfileId(id);
          setActiveTab('manage');
        }
      } else if (hash === '#ai') {
        setActiveTab('ai');
      } else if (hash === '#search') {
        setActiveTab('search');
      } else if (hash === '#privacy') {
        setActiveTab('privacy');
      } else if (hash === '#about') {
        setActiveTab('about');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (page: string, params?: any) => {
    if (page === 'viewer' && params?.id) {
      setSelectedProfileId(params.id);
      window.location.hash = `profile-${params.id}`;
      setActiveTab('viewer');
    } else if (page === 'manage' && params?.id) {
      setSelectedProfileId(params.id);
      window.location.hash = `manage-${params.id}`;
      setActiveTab('manage');
    } else {
      window.location.hash = page;
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
