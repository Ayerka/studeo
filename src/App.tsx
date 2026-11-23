import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';
import { useCourseProgress } from '@/features/course/hooks/useCourseProgress';

import { LandingPage } from '@/features/landing/components/LandingPage';
import { CourseApp } from '@/features/course/components/CourseApp';
import { StudentPortal } from '@/features/student/components/StudentPortal';

import { AuthModal } from '@/features/auth/components/AuthModal';
import { AccountPage } from '@/features/auth/components/AccountPage';
import { SyncRecoveryBanner } from '@/features/course/components/SyncRecoveryBanner';

import { Toaster, toast } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase';

export type ActiveAppView = 'landing' | 'course' | 'student' | 'account';

export const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const appViewFromPath = (pathname: string): ActiveAppView => {
    if (pathname.startsWith('/student')) return 'student';
    if (pathname.startsWith('/course')) return 'course';
    if (pathname.startsWith('/account')) return 'account';
    return 'landing';
  };

  const [currentApp, setCurrentApp] = useState<ActiveAppView>(() => appViewFromPath(location.pathname));

  const [courseRevision, setCourseRevision] = useState(0);
  const [accountReturnView, setAccountReturnView] = useState<Exclude<ActiveAppView, 'account'>>('student');

  const {
    user,
    loading,
    signOut,
    authModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
  } = useAuth();

  useEffect(() => {
    const savedSettings = window.localStorage.getItem('studeo-profile-settings');
    let theme: 'light' | 'dark' | 'system' = 'system';
    try {
      if (savedSettings) theme = JSON.parse(savedSettings).theme ?? 'system';
    } catch {
      theme = 'system';
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const activeTheme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.classList.toggle('dark', activeTheme === 'dark');
      document.documentElement.style.colorScheme = activeTheme;
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, []);

  const {
    progress,
    learningPayload,
    syncStatus,
    hasConflict,
    updateProgress,
    updateCourseSession,
    downloadBackup,
    importBackup,
    reloadFromCloud,
    retrySync,
  } = useCourseProgress(user);

  // Przywracanie odpowiedniego widoku po sprawdzeniu sesji.
  useEffect(() => {
    if (loading) return;

    setCurrentApp((current) => {
      if (user && current === 'landing') {
        return 'student';
      }

      if (!user && (current === 'student' || current === 'account')) {
        return 'landing';
      }

      return current;
    });
  }, [user, loading]);

  const handleOpenStudentPortal = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    navigate('/student');
  };

  const handleOpenProfile = (returnView: 'course' | 'student') => {
    setAccountReturnView(returnView);
    navigate('/account');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');

      toast.create({
        title: 'Pomyślnie wylogowano',
        type: 'info',
      });
    } catch (error) {
      console.error('Błąd wylogowania:', error);

      toast.create({
        title: 'Nie udało się wylogować',
        type: 'error',
      });
    }
  };

  // Nie pokazujemy landing page przed sprawdzeniem sesji.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">
          Przywracanie sesji...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {currentApp !== 'account' && (
        <SyncRecoveryBanner
          hasConflict={hasConflict}
          syncStatus={syncStatus}
          onDownloadBackup={downloadBackup}
          onRetrySync={retrySync}
          onReloadCloud={reloadFromCloud}
        />
      )}

      <main>
        {currentApp === 'landing' && (
          <LandingPage
            onLogin={() => openAuthModal('login')}
            onRegister={() => openAuthModal('register')}
            onExploreCourse={() => navigate('/course')}
          />
        )}

        {currentApp === 'course' && (
          <CourseApp
            key={courseRevision}
            progress={progress}
            initialSnapshot={learningPayload}
            syncStatus={syncStatus}
            onUpdateProgress={updateProgress}
            onStateChange={updateCourseSession}
            onOpenStudentPortal={handleOpenStudentPortal}
            onOpenProfile={() => handleOpenProfile('course')}
            onExportProgress={downloadBackup}
            showToast={(msg) =>
              toast.create({
                title: msg,
                type: 'info',
              })
            }
          />
        )}

        {currentApp === 'student' && user && supabase && (
          <StudentPortal
            client={supabase}
            user={user}
            builtinProgress={progress}
            onOpenCourse={() => navigate('/course')}
            onOpenProfile={() => handleOpenProfile('student')}
            onLogout={handleLogout}
            courseState={learningPayload}
            onImportCourse={importBackup}
          />
        )}

        {currentApp === 'account' && user && (
          <AccountPage
            onBack={() => navigate(accountReturnView === 'course' ? '/course' : '/student')}
            onLogout={handleLogout}
          />
        )}
      </main>

      <AuthModal
        key={authModalOpen ? authModalTab : 'closed'}
        open={authModalOpen}
        initialTab={authModalTab}
        onOpenChange={(open) => {
          if (!open) closeAuthModal();
        }}
        onSuccess={() => {
          closeAuthModal();
          navigate('/student');
        }}
      />

      <Toaster />
    </div>
  );
};
