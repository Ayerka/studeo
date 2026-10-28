import React, { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isConfigured } from './lib/supabase';
import { LandingPage } from './components/LandingPage';
import { CourseApp } from './components/CourseApp';
import { StudentPortal } from './components/StudentPortal';
import { AccountModal } from './components/AccountModal';
import { Toast } from './components/Toast';
import { normalizeProgress } from './state';
import { LESSONS, GLOSSARY } from './data/courseData';
import { FALLBACK_PLAN, normalizePlan } from './student-model';
import type { ProgressState, StudentSubject, StudentEntry, AccountPlan } from './types';

const LOCAL_STORAGE_KEY = 'studeo-react-state-v1';
const LOCAL_SUBJECTS_KEY = 'studeo-subjects-v1';
const LOCAL_ENTRIES_KEY = 'studeo-entries-v1';

export const App: React.FC = () => {
  const [currentApp, setCurrentApp] = useState<'landing' | 'course' | 'student'>('landing');
  const [accountMode, setAccountMode] = useState<'login' | 'register' | 'profile' | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('Gotowy');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const toastTimerRef = useRef<any>(null);

  // Course Progress State
  const [progress, setProgress] = useState<ProgressState>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        return normalizeProgress(JSON.parse(raw), LESSONS, GLOSSARY);
      }
    } catch {
      // ignore
    }
    return {
      done: [],
      flashKnown: [],
      examBest: 0,
      examCount: 0,
      quizScores: {},
    };
  });

  // Student portal data
  const [subjects, setSubjects] = useState<StudentSubject[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_SUBJECTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'default-sub-1',
        title: 'Bezpieczeństwo IT',
        color: '#6552c8',
        created_at: new Date().toISOString(),
      },
    ];
  });

  const [entries, setEntries] = useState<StudentEntry[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_ENTRIES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'default-task-1',
        subject_id: 'default-sub-1',
        kind: 'task',
        title: 'Przejrzeć wykład 1 i zejściówkę',
        payload: {
          status: 'todo',
          due: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
          description: 'Przygotować się do zejściówki w Wayground z podstaw bezpieczeństwa.',
        },
        created_at: new Date().toISOString(),
      },
      {
        id: 'default-event-1',
        subject_id: 'default-sub-1',
        kind: 'event',
        title: 'Wykład: Bezpieczeństwo IT',
        payload: {
          date: new Date().toISOString().slice(0, 10),
          start: '09:15',
          end: '10:45',
          weekly: true,
          room: '204',
          building: 'C-13',
          address: 'Gmach Główny',
        },
        created_at: new Date().toISOString(),
      },
    ];
  });

  const [plan, setPlan] = useState<AccountPlan>(FALLBACK_PLAN);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3200);
  };

  // Auth listener
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadCloudState(session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadCloudState(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Save to localStorage whenever progress, subjects, or entries change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));
    } catch {}
  }, [progress]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(subjects));
    } catch {}
  }, [subjects]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
    } catch {}
  }, [entries]);

  // Cloud sync
  const loadCloudState = async (activeUser: User) => {
    if (!supabase) return;
    setSyncStatus('Wczytuję dane z chmury…');
    try {
      // 1. Learning state
      const { data: lState } = await supabase
        .from('learning_state')
        .select('payload, revision')
        .eq('user_id', activeUser.id)
        .maybeSingle();

      if (lState?.payload?.progress) {
        setProgress(normalizeProgress(lState.payload.progress, LESSONS, GLOSSARY));
      }

      // 2. Subjects
      const { data: subs } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('user_id', activeUser.id);
      if (subs && subs.length > 0) {
        setSubjects(subs);
      }

      // 3. Entries
      const { data: entrs } = await supabase
        .from('student_entries')
        .select('*')
        .eq('user_id', activeUser.id);
      if (entrs && entrs.length > 0) {
        setEntries(entrs);
      }

      setSyncStatus('✓ Zsynchronizowano z kontem');
    } catch {
      setSyncStatus('Lokalne postępy');
    }
  };

  const handleUpdateProgress = async (newProgress: ProgressState) => {
    setProgress(newProgress);
    if (!supabase || !user) return;
    setSyncStatus('Zapisywanie…');
    try {
      await supabase.rpc('save_learning_state', {
        expected_revision: 0,
        new_payload: { progress: newProgress },
      });
      setSyncStatus('✓ Zapisano na Twoim koncie');
    } catch {
      setSyncStatus('Zapisano lokalnie');
    }
  };

  const handleSaveSubject = async (sub: Partial<StudentSubject>): Promise<StudentSubject> => {
    const id = sub.id || crypto.randomUUID();
    const item: StudentSubject = {
      ...sub,
      id,
      title: sub.title || 'Nowy przedmiot',
      created_at: sub.created_at || new Date().toISOString(),
      user_id: user?.id,
    };

    setSubjects((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return [...prev, item];
      const copy = [...prev];
      copy[idx] = item;
      return copy;
    });

    if (supabase && user) {
      try {
        await supabase.from('student_subjects').upsert({
          id,
          user_id: user.id,
          title: item.title,
          archived: Boolean(item.archived),
        });
      } catch {}
    }

    return item;
  };

  const handleSaveEntry = async (entry: Partial<StudentEntry>): Promise<StudentEntry> => {
    const id = entry.id || crypto.randomUUID();
    const item: StudentEntry = {
      ...entry,
      id,
      subject_id: entry.subject_id || '',
      kind: entry.kind || 'material',
      title: entry.title || 'Wpis',
      payload: entry.payload || {},
      created_at: entry.created_at || new Date().toISOString(),
      user_id: user?.id,
    };

    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx < 0) return [...prev, item];
      const copy = [...prev];
      copy[idx] = item;
      return copy;
    });

    if (supabase && user) {
      try {
        await supabase.from('student_entries').upsert({
          id,
          user_id: user.id,
          subject_id: item.subject_id,
          kind: item.kind,
          title: item.title,
          payload: item.payload,
          archived: Boolean(item.archived),
        });
      } catch {}
    }

    return item;
  };

  const handleExportProgress = () => {
    const backup = {
      app: 'Studeo',
      version: 2,
      date: new Date().toISOString(),
      progress,
      subjects,
      entries,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studeo-kopia-zapasowa-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Kopia zapasowa pobrana! 💾');
  };

  const handleImportProgress = (data: any) => {
    if (!data || typeof data !== 'object') return;
    if (data.progress) {
      const normalized = normalizeProgress(data.progress, LESSONS, GLOSSARY);
      handleUpdateProgress(normalized);
    }
    if (Array.isArray(data.subjects)) {
      setSubjects(data.subjects);
    }
    if (Array.isArray(data.entries)) {
      setEntries(data.entries);
    }
    showToast('Pomyślnie przywrócono dane!');
  };

  return (
    <>
      {currentApp === 'landing' && (
        <LandingPage
          onLogin={() => setAccountMode('login')}
          onRegister={() => setAccountMode('register')}
          onExploreCourse={() => setCurrentApp('course')}
        />
      )}

      {currentApp === 'course' && (
        <CourseApp
          progress={progress}
          onUpdateProgress={handleUpdateProgress}
          onOpenStudentPortal={() => setCurrentApp('student')}
          onOpenProfile={() => setAccountMode('profile')}
          syncStatus={syncStatus}
          onExportProgress={handleExportProgress}
          showToast={showToast}
        />
      )}

      {currentApp === 'student' && (
        <StudentPortal
          user={user}
          subjects={subjects}
          entries={entries}
          plan={plan}
          onSaveSubject={handleSaveSubject}
          onSaveEntry={handleSaveEntry}
          onOpenCourse={() => setCurrentApp('course')}
          onOpenProfile={() => setAccountMode('profile')}
          onLogout={async () => {
            if (supabase) await supabase.auth.signOut();
            setUser(null);
            setCurrentApp('landing');
            showToast('Wylogowano.');
          }}
          showToast={showToast}
        />
      )}

      {accountMode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0a0d18cc',
            zIndex: 100,
            overflowY: 'auto',
            padding: '20px 10px',
          }}
        >
          <AccountModal
            mode={accountMode}
            user={user}
            entries={entries}
            onClose={() => setAccountMode(null)}
            onOpenLanding={() => {
              setAccountMode(null);
              setCurrentApp('landing');
            }}
            onAuthSuccess={(loggedInUser) => {
              setUser(loggedInUser);
              setAccountMode(null);
              setCurrentApp('student');
              showToast(`Witaj, ${loggedInUser.user_metadata?.display_name || loggedInUser.email}! ✨`);
            }}
            onLogout={async () => {
              if (supabase) await supabase.auth.signOut();
              setUser(null);
              setAccountMode(null);
              setCurrentApp('landing');
              showToast('Wylogowano.');
            }}
            onImportProgress={handleImportProgress}
            onExportProgress={handleExportProgress}
          />
        </div>
      )}

      <Toast message={toastMessage} visible={toastVisible} />
    </>
  );
};
