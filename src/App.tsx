import React, { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isConfigured } from './lib/supabase';
import { LandingPage } from './components/LandingPage';
import { CourseApp } from './components/CourseApp';
import { ProductionStudentPortal } from './components/ProductionStudentPortal';
import { AccountModal } from './components/AccountModal';
import { Toast } from './components/Toast';
import { normalizeProgress } from './state';
import type { CourseSessionState } from './course-session';
import { LESSONS, GLOSSARY } from './data/courseData';
import { createStudentStore, FALLBACK_PLAN, normalizePlan } from './student-model';
import type { ProgressState, StudentSubject, StudentEntry, AccountPlan } from './types';

const PREVIEW_PROGRESS_KEY = 'studeo-react-preview-progress-v1';
const EMPTY_PROGRESS: ProgressState = {
  done: [],
  flashKnown: [],
  examBest: 0,
  examCount: 0,
  quizScores: {},
};

export const App: React.FC = () => {
  const [currentApp, setCurrentApp] = useState<'landing' | 'course' | 'student'>('landing');
  const [courseSessionRevision, setCourseSessionRevision] = useState(0);
  const [accountMode, setAccountMode] = useState<'login' | 'register' | 'profile' | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('Gotowy');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const toastTimerRef = useRef<any>(null);
  const ownerRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const revisionRef = useRef(0);
  const learningPayloadRef = useRef<Record<string, any>>({ progress: EMPTY_PROGRESS });
  const storeRef = useRef<any>(supabase ? createStudentStore(supabase) : null);
  const pendingLearningPayloadRef = useRef<Record<string, any> | null>(null);
  const savingProgressRef = useRef(false);

  // Course Progress State
  const [progress, setProgress] = useState<ProgressState>(() => {
    try {
      const raw = localStorage.getItem(PREVIEW_PROGRESS_KEY);
      if (raw) {
        return normalizeProgress(JSON.parse(raw), LESSONS, GLOSSARY);
      }
    } catch {
      // ignore
    }
    return EMPTY_PROGRESS;
  });
  const [learningPayload, setLearningPayload] = useState<Record<string, any>>({ progress: EMPTY_PROGRESS });

  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [entries, setEntries] = useState<StudentEntry[]>([]);

  const [plan, setPlan] = useState<AccountPlan>(FALLBACK_PLAN);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3200);
  };

  const clearAccount = () => {
    if (!ownerRef.current) return;
    generationRef.current += 1;
    ownerRef.current = null;
    revisionRef.current = 0;
    learningPayloadRef.current = { progress: EMPTY_PROGRESS };
    pendingLearningPayloadRef.current = null;
    storeRef.current?.setOwner(null);
    setUser(null);
    setProgress(EMPTY_PROGRESS);
    setSubjects([]);
    setEntries([]);
    setPlan(FALLBACK_PLAN);
    setCurrentApp('landing');
    setSyncStatus('Gotowy');
  };

  const loadCloudState = async (activeUser: User) => {
    if (!supabase || ownerRef.current === activeUser.id) return;

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    ownerRef.current = activeUser.id;
    revisionRef.current = 0;
    storeRef.current?.setOwner(activeUser.id);
    setUser(activeUser);
    setProgress(EMPTY_PROGRESS);
    setSubjects([]);
    setEntries([]);
    setPlan(FALLBACK_PLAN);
    setCurrentApp('landing');
    setSyncStatus('Wczytuję dane z chmury…');

    try {
      const [learning, cloudSubjects, cloudEntries, planResult] = await Promise.all([
        supabase
          .from('learning_state')
          .select('payload, revision')
          .eq('user_id', activeUser.id)
          .maybeSingle(),
        storeRef.current.list('student_subjects'),
        storeRef.current.list('student_entries'),
        supabase.rpc('my_plan'),
      ]);

      if (generation !== generationRef.current || ownerRef.current !== activeUser.id) return;
      if (learning.error) throw learning.error;

      const payload = learning.data?.payload || {};
      learningPayloadRef.current = payload;
      setLearningPayload(payload);
      setProgress(normalizeProgress(payload.progress || {}, LESSONS, GLOSSARY));
      revisionRef.current = Number(learning.data?.revision || 0);
      setSubjects(cloudSubjects);
      setEntries(cloudEntries);
      setPlan(planResult.error
        ? FALLBACK_PLAN
        : normalizePlan(Array.isArray(planResult.data) ? planResult.data[0] : planResult.data));
      setCurrentApp('student');
      setSyncStatus('✓ Zsynchronizowano z kontem');
    } catch (error: any) {
      if (generation !== generationRef.current || ownerRef.current !== activeUser.id) return;
      ownerRef.current = null;
      storeRef.current?.setOwner(null);
      setUser(null);
      setCurrentApp('landing');
      setSyncStatus('Nie udało się wczytać konta');
      setAccountMode('login');
      showToast(error?.message || 'Nie udało się pobrać danych. Sprawdź połączenie i spróbuj ponownie.');
    }
  };

  useEffect(() => {
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (ownerRef.current === session.user.id) {
          setUser(session.user);
          return;
        }
        clearAccount();
        void loadCloudState(session.user);
      } else {
        clearAccount();
      }
    });

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setSyncStatus('Nie udało się sprawdzić sesji');
        return;
      }
      if (session?.user && ownerRef.current !== session.user.id) {
        void loadCloudState(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      generationRef.current += 1;
      ownerRef.current = null;
      storeRef.current?.setOwner(null);
    };
  }, []);

  // Save to localStorage whenever progress, subjects, or entries change
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem(PREVIEW_PROGRESS_KEY, JSON.stringify(progress));
    } catch {}
  }, [progress, user]);

  const flushProgress = async () => {
    if (!supabase || !user || savingProgressRef.current) return;
    savingProgressRef.current = true;
    const owner = user.id;
    const generation = generationRef.current;
    let continuePendingWrites = true;
    try {
      while (pendingLearningPayloadRef.current) {
        const newPayload = pendingLearningPayloadRef.current;
        pendingLearningPayloadRef.current = null;
        setSyncStatus('Zapisywanie…');
        const { data, error } = await supabase.rpc('save_learning_state', {
          expected_revision: revisionRef.current,
          new_payload: newPayload,
        });
        if (generation !== generationRef.current || ownerRef.current !== owner) return;
        if (error) {
          continuePendingWrites = false;
          const conflict = error.code === '40001';
          if (!pendingLearningPayloadRef.current) pendingLearningPayloadRef.current = newPayload;
          setSyncStatus(conflict ? 'Konflikt zapisu na innym urządzeniu' : 'Nie zapisano postępu');
          showToast(
            conflict
              ? 'Na innym urządzeniu zapisano nowsze postępy. Odśwież stronę przed dalszą nauką.'
              : 'Nie udało się zapisać postępu. Zmiany pozostają w tej karcie.'
          );
          return;
        }
        const newRevision = Number(data);
        if (!Number.isInteger(newRevision) || newRevision <= revisionRef.current) {
          setSyncStatus('Nie potwierdzono zapisu postępu');
          return;
        }
        revisionRef.current = newRevision;
        learningPayloadRef.current = newPayload;
        setSyncStatus('✓ Zapisano na Twoim koncie');
      }
    } catch (error: any) {
      continuePendingWrites = false;
      if (generation !== generationRef.current || ownerRef.current !== owner) return;
      if (!pendingLearningPayloadRef.current) {
        pendingLearningPayloadRef.current = learningPayloadRef.current;
      }
      setSyncStatus('Nie zapisano postępu');
      showToast(error?.message || 'Nie udało się zapisać postępu. Zmiany pozostają w tej karcie.');
    } finally {
      savingProgressRef.current = false;
      if (continuePendingWrites && pendingLearningPayloadRef.current && ownerRef.current === owner) {
        void flushProgress();
      }
    }
  };

  const handleUpdateProgress = (newProgress: ProgressState) => {
    setProgress(newProgress);
    if (!supabase || !user) return;
    const newPayload = { ...learningPayloadRef.current, progress: newProgress };
    learningPayloadRef.current = newPayload;
    setLearningPayload(newPayload);
    pendingLearningPayloadRef.current = newPayload;
    void flushProgress();
  };

  const downloadPendingBackup = () => {
    const blob = new Blob([JSON.stringify({ app: 'Studeo', version: 2, state: learningPayloadRef.current }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'studeo-niezapisane-postepy.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const reloadCloudProgress = () => {
    if (!user || !supabase) return;
    if (!window.confirm('Wczytać postępy z chmury i odrzucić niezapisane zmiany? Najpierw pobierz ich kopię.')) return;
    const activeUser = user;
    generationRef.current += 1;
    ownerRef.current = null;
    pendingLearningPayloadRef.current = null;
    storeRef.current?.setOwner(null);
    void loadCloudState(activeUser);
  };

  useEffect(() => {
    const onOnline = () => void flushProgress();
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingLearningPayloadRef.current || savingProgressRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  });

  const handleCourseStateChange = (snapshot: CourseSessionState) => {
    const newPayload = { ...learningPayloadRef.current, ...snapshot };
    learningPayloadRef.current = newPayload;
    setLearningPayload(newPayload);
    if (!supabase || !user) return;
    pendingLearningPayloadRef.current = newPayload;
    void flushProgress();
  };

  const handleSaveSubject = async (sub: Partial<StudentSubject>): Promise<StudentSubject> => {
    const id = sub.id || crypto.randomUUID();
    const previous = subjects.find((subject) => subject.id === id);
    const item: StudentSubject = {
      ...previous,
      ...sub,
      id,
      title: sub.title || 'Nowy przedmiot',
      created_at: sub.created_at || new Date().toISOString(),
      user_id: user?.id,
    };
    if (supabase && user) {
      const saved = await storeRef.current.save('student_subjects', item);
      setSubjects((prev) => [...prev.filter((subject) => subject.id !== id), saved]);
      return saved;
    }
    setSubjects((prev) => [...prev.filter((subject) => subject.id !== id), item]);
    return item;
  };

  const handleSaveEntry = async (entry: Partial<StudentEntry>): Promise<StudentEntry> => {
    const id = entry.id || crypto.randomUUID();
    const previous = entries.find((current) => current.id === id);
    const item: StudentEntry = {
      ...previous,
      ...entry,
      id,
      subject_id: entry.subject_id || '',
      kind: entry.kind || 'material',
      title: entry.title || 'Wpis',
      payload: entry.payload || {},
      created_at: entry.created_at || new Date().toISOString(),
      user_id: user?.id,
    };

    if (supabase && user) {
      const saved = await storeRef.current.save('student_entries', item);
      setEntries((prev) => [...prev.filter((current) => current.id !== id), saved]);
      return saved;
    }
    setEntries((prev) => [...prev.filter((current) => current.id !== id), item]);
    return item;
  };

  const handleExportProgress = () => {
    const backup = {
      app: 'Studeo',
      version: 2,
      date: new Date().toISOString(),
      state: learningPayloadRef.current,
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

  const handleImportProgress = async (data: any) => {
    if (!data || typeof data !== 'object') throw new Error('Nieprawidłowy plik kopii zapasowej.');
    const importedSnapshot = data.state || null;
    const importedProgress = importedSnapshot?.progress || data.progress;
    if (importedProgress) {
      const normalized = normalizeProgress(importedProgress, LESSONS, GLOSSARY);
      setProgress(normalized);
      if (importedSnapshot) {
        const newPayload = { ...importedSnapshot, progress: normalized };
        learningPayloadRef.current = newPayload;
        setLearningPayload(newPayload);
        if (supabase && user) {
          pendingLearningPayloadRef.current = newPayload;
          void flushProgress();
        }
      } else {
        handleUpdateProgress(normalized);
      }
      setCourseSessionRevision((revision) => revision + 1);
    }
    if (Array.isArray(data.subjects) || Array.isArray(data.entries)) {
      if (!user || !storeRef.current) throw new Error('Zaloguj się, aby przywrócić dane konta.');
      const importedSubjects = Array.isArray(data.subjects) ? data.subjects : [];
      const subjectIds = new Set([...subjects, ...importedSubjects].map((subject: StudentSubject) => subject.id));
      const importedEntries = Array.isArray(data.entries)
        ? data.entries.filter((entry: StudentEntry) => subjectIds.has(entry.subject_id))
        : [];
      const savedSubjects: StudentSubject[] = [];
      const savedEntries: StudentEntry[] = [];
      try {
        for (const subject of importedSubjects) {
          const existing = subjects.find((item) => item.id === subject.id);
          savedSubjects.push(await storeRef.current.save('student_subjects', {
            ...existing,
            ...subject,
            revision: existing?.revision,
            user_id: user.id,
          }));
        }
        for (const entry of importedEntries) {
          const existing = entries.find((item) => item.id === entry.id);
          const payload = { ...(existing?.payload || {}), ...(entry.payload || {}) };
          if (payload.path) {
            delete payload.path;
            payload.fileRemoved = true;
          }
          if (Array.isArray(payload.attachments)) payload.attachments = [];
          savedEntries.push(await storeRef.current.save('student_entries', {
            ...existing,
            ...entry,
            payload,
            revision: existing?.revision,
            user_id: user.id,
          }));
        }
      } catch (error: any) {
        throw new Error(`Nie udało się przywrócić wszystkich wpisów: ${error.message}`);
      }
      setSubjects((current) => [...current.filter((item) => !savedSubjects.some((saved) => saved.id === item.id)), ...savedSubjects]);
      setEntries((current) => [...current.filter((item) => !savedEntries.some((saved) => saved.id === item.id)), ...savedEntries]);
    }
    showToast('Pomyślnie przywrócono dane!');
  };

  return (
    <>
      {(syncStatus === 'Nie zapisano postępu' || syncStatus === 'Konflikt zapisu na innym urządzeniu') && (
        <div className="sync-recovery" role="alert">
          <span>{syncStatus === 'Nie zapisano postępu'
            ? 'Postęp nie został zsynchronizowany. Zostaw tę kartę otwartą lub pobierz kopię.'
            : 'Zapisano nowszy postęp na innym urządzeniu. Pobierz kopię przed wczytaniem chmury.'}</span>
          <button type="button" onClick={downloadPendingBackup}>Pobierz kopię zmian</button>
          {syncStatus === 'Nie zapisano postępu' ? (
            <button type="button" onClick={() => void flushProgress()}>Ponów zapis</button>
          ) : (
            <button type="button" onClick={reloadCloudProgress}>Wczytaj chmurę</button>
          )}
        </div>
      )}
      {currentApp === 'landing' && (
        <LandingPage
          onLogin={() => setAccountMode('login')}
          onRegister={() => setAccountMode('register')}
          onExploreCourse={() => setCurrentApp('course')}
        />
      )}

      {currentApp === 'course' && (
        <CourseApp
          key={courseSessionRevision}
          progress={progress}
          onUpdateProgress={handleUpdateProgress}
          onOpenStudentPortal={() => setCurrentApp('student')}
          onOpenProfile={() => setAccountMode('profile')}
          syncStatus={syncStatus}
          onExportProgress={handleExportProgress}
          showToast={showToast}
          initialSnapshot={learningPayload}
          onStateChange={handleCourseStateChange}
        />
      )}

      {currentApp === 'student' && supabase && user && (
        <ProductionStudentPortal
          client={supabase}
          user={user}
          onOpenCourse={() => setCurrentApp('course')}
          onOpenProfile={() => setAccountMode('profile')}
          onLogout={async () => {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setUser(null);
            setCurrentApp('landing');
            showToast('Wylogowano.');
          }}
          exportCourse={() => progress}
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
            onClose={() => {
              setAccountMode(null);
              if (!isConfigured) setCurrentApp('course');
            }}
            onOpenLanding={() => {
              setAccountMode(null);
              setCurrentApp('landing');
            }}
            onAuthSuccess={(loggedInUser) => {
              setUser(loggedInUser);
              setAccountMode(null);
              void loadCloudState(loggedInUser);
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
