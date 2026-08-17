import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { HomePage } from './pages/HomePage';
import { NormalCalculatorPage } from './pages/NormalCalculatorPage';
import { CreateProfilePage } from './pages/CreateProfilePage';
import { ProfileViewerPage } from './pages/ProfileViewerPage';
import { ProfileManagePage } from './pages/ProfileManagePage';
import { AboutPage } from './pages/AboutPage';
import type { Subject } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'normal' | 'create' | 'viewer' | 'manage' | 'about'>('home');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // State passed from normal calculator when user clicks "Save as Shared Profile"
  const [prefilledSubjects, setPrefilledSubjects] = useState<Subject[]>([]);

  const handleOpenSearch = (query: string = '') => {
    setSearchQuery(query);
    setIsSearchModalOpen(true);
  };

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
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keyboard shortcut Cmd/Ctrl + K for search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        openSearchModal={(query) => handleOpenSearch(query || '')}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomePage
            onNavigate={(page, params) => handleNavigate(page, params)}
            onOpenSearch={(query) => handleOpenSearch(query || '')}
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
      </main>

      {/* Search / Open Profile Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        initialQuery={searchQuery}
        onClose={() => setIsSearchModalOpen(false)}
        onOpenProfile={(id) => handleNavigate('viewer', { id })}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
