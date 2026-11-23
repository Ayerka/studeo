// src/features/course/hooks/useCourseProgress.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { normalizeProgress } from '../lib/state';
import { LESSONS, GLOSSARY } from '@/data/courseData';
import type { CourseSessionState } from '@/features/course/lib/course-session';
import type { ProgressState } from '@/types';

const PREVIEW_PROGRESS_KEY = 'studeo-react-preview-progress-v1';
const EMPTY_PROGRESS: ProgressState = {
  done: [],
  flashKnown: [],
  examBest: 0,
  examCount: 0,
  quizScores: {},
};

export function useCourseProgress(user: User | null) {
  const [progress, setProgress] = useState<ProgressState>(() => {
    try {
      const raw = localStorage.getItem(PREVIEW_PROGRESS_KEY);
      if (raw) return normalizeProgress(JSON.parse(raw), LESSONS, GLOSSARY);
    } catch {
      // ignore
    }
    return EMPTY_PROGRESS;
  });

  const [learningPayload, setLearningPayload] = useState<Record<string, any>>({ progress: EMPTY_PROGRESS });
  const [syncStatus, setSyncStatus] = useState<string>('Gotowy');
  const [hasConflict, setHasConflict] = useState(false);

  const ownerRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const generationRef = useRef(0);
  const learningPayloadRef = useRef<Record<string, any>>({ progress: EMPTY_PROGRESS });
  const pendingLearningPayloadRef = useRef<Record<string, any> | null>(null);
  const savingProgressRef = useRef(false);

  // Zapis do localStorage w trybie gościa
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem(PREVIEW_PROGRESS_KEY, JSON.stringify(progress));
    } catch {}
  }, [progress, user]);

  const flushProgress = useCallback(async () => {
    if (!supabase || !user || savingProgressRef.current) return;
    savingProgressRef.current = true;
    const owner = user.id;
    const generation = generationRef.current;

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
          const conflict = error.code === '40001';
          if (!pendingLearningPayloadRef.current) pendingLearningPayloadRef.current = newPayload;
          setHasConflict(conflict);
          setSyncStatus(conflict ? 'Konflikt zapisu na innym urządzeniu' : 'Nie zapisano postępu');
          return;
        }

        const newRevision = Number(data);
        if (!Number.isInteger(newRevision) || newRevision <= revisionRef.current) {
          setSyncStatus('Nie potwierdzono zapisu postępu');
          return;
        }

        revisionRef.current = newRevision;
        learningPayloadRef.current = newPayload;
        setHasConflict(false);
        setSyncStatus('✓ Zapisano na Twoim koncie');
      }
    } catch {
      if (generation !== generationRef.current || ownerRef.current !== owner) return;
      if (!pendingLearningPayloadRef.current) {
        pendingLearningPayloadRef.current = learningPayloadRef.current;
      }
      setSyncStatus('Nie zapisano postępu');
    } finally {
      savingProgressRef.current = false;
      if (pendingLearningPayloadRef.current && ownerRef.current === owner) {
        void flushProgress();
      }
    }
  }, [user]);

  // Wczytanie stanu z Supabase po zalogowaniu
  const loadCloudState = useCallback(async (activeUser: User) => {
    if (!supabase || ownerRef.current === activeUser.id) return;

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    ownerRef.current = activeUser.id;
    revisionRef.current = 0;
    setSyncStatus('Wczytuję dane z chmury…');
    setHasConflict(false);

    try {
      const { data, error } = await supabase
        .from('learning_state')
        .select('payload, revision')
        .eq('user_id', activeUser.id)
        .maybeSingle();

      if (generation !== generationRef.current || ownerRef.current !== activeUser.id) return;
      if (error) throw error;

      const payload = data?.payload || {};
      learningPayloadRef.current = payload;
      setLearningPayload(payload);
      setProgress(normalizeProgress(payload.progress || {}, LESSONS, GLOSSARY));
      revisionRef.current = Number(data?.revision || 0);
      setSyncStatus('✓ Zsynchronizowano z kontem');
    } catch {
      if (generation !== generationRef.current || ownerRef.current !== activeUser.id) return;
      setSyncStatus('Nie udało się wczytać konta');
    }
  }, []);

  useEffect(() => {
    if (user) {
      void loadCloudState(user);
    } else {
      generationRef.current += 1;
      ownerRef.current = null;
      revisionRef.current = 0;
      learningPayloadRef.current = { progress: EMPTY_PROGRESS };
      pendingLearningPayloadRef.current = null;
      setSyncStatus('Gotowy');
      setHasConflict(false);
    }
  }, [user, loadCloudState]);

  const updateProgress = useCallback((newProgress: ProgressState) => {
    setProgress(newProgress);
    if (!supabase || !user) return;
    const newPayload = { ...learningPayloadRef.current, progress: newProgress };
    learningPayloadRef.current = newPayload;
    setLearningPayload(newPayload);
    pendingLearningPayloadRef.current = newPayload;
    void flushProgress();
  }, [user, flushProgress]);

  const updateCourseSession = useCallback((snapshot: CourseSessionState) => {
    const newPayload = { ...learningPayloadRef.current, ...snapshot };
    learningPayloadRef.current = newPayload;
    setLearningPayload(newPayload);
    if (!supabase || !user) return;
    pendingLearningPayloadRef.current = newPayload;
    void flushProgress();
  }, [user, flushProgress]);

  const downloadBackup = useCallback(() => {
    const blob = new Blob([JSON.stringify({ app: 'Studeo', version: 2, state: learningPayloadRef.current }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studeo-kopia-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const importBackup = useCallback((raw: Record<string, any>) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Nieprawidłowy plik kopii zapasowej.');
    }
    const snapshot = raw.state && typeof raw.state === 'object' ? raw.state : null;
    const importedProgress = raw.progress || snapshot?.progress;
    if (!importedProgress) return;

    const normalized = normalizeProgress(importedProgress, LESSONS, GLOSSARY);
    const newPayload = { ...(snapshot || learningPayloadRef.current), progress: normalized };
    setProgress(normalized);
    learningPayloadRef.current = newPayload;
    setLearningPayload(newPayload);
    if (supabase && user) {
      pendingLearningPayloadRef.current = newPayload;
      void flushProgress();
    }
  }, [user, flushProgress]);

  const reloadFromCloud = useCallback(() => {
    if (!user) return;
    generationRef.current += 1;
    ownerRef.current = null;
    pendingLearningPayloadRef.current = null;
    void loadCloudState(user);
  }, [user, loadCloudState]);

  return {
    progress,
    learningPayload,
    syncStatus,
    hasConflict,
    updateProgress,
    updateCourseSession,
    downloadBackup,
    importBackup,
    reloadFromCloud,
    retrySync: flushProgress,
  };
}