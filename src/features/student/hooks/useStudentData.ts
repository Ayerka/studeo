import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createStudentStore, FALLBACK_PLAN, normalizePlan } from '../lib/student-model';
import { recordStudyDay } from '../lib/student-stats';
import type { AccountPlan, StudentEntry, StudentSubject } from '@/types';

interface StudentDataState {
  subjects: StudentSubject[];
  entries: StudentEntry[];
  plan: AccountPlan;
  loading: boolean;
  error: string;
  status: string;
}

const EMPTY_STATE: StudentDataState = {
  subjects: [],
  entries: [],
  plan: FALLBACK_PLAN,
  loading: true,
  error: '',
  status: 'Wczytuję Twoje dane…',
};

export function useStudentData(client: SupabaseClient, user: User) {
  const storeRef = useRef(createStudentStore(client));
  const ownerRef = useRef(user.id);
  const [state, setState] = useState<StudentDataState>(EMPTY_STATE);

  const load = async (): Promise<StudentEntry[]> => {
    const owner = user.id;
    storeRef.current.setOwner(owner);
    setState((current) => ({ ...current, loading: true, error: '', status: 'Wczytuję Twoje dane…' }));
    try {
      const [subjects, entries, planResult] = await Promise.all([
        storeRef.current.list('student_subjects'),
        storeRef.current.list('student_entries'),
        client.rpc('my_plan'),
      ]);
        if (ownerRef.current !== owner) return [];
      setState({
        subjects,
        entries,
        plan: planResult.error
          ? FALLBACK_PLAN
          : normalizePlan(Array.isArray(planResult.data) ? planResult.data[0] : planResult.data),
        loading: false,
        error: '',
        status: '✓ Zsynchronizowano z kontem',
      });
      return entries;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Nie udało się wczytać panelu.';
      if (ownerRef.current !== owner) return [];
        setState((current) => ({
        ...current,
        loading: false,
        error: message,
        status: 'Nie udało się wczytać danych',
      }));
      throw error;
    }
  };

  useEffect(() => {
    ownerRef.current = user.id;
    storeRef.current.setOwner(user.id);
    setState(EMPTY_STATE);
    void load();
    return () => {
      ownerRef.current = '';
      storeRef.current.setOwner(null);
    };
  }, [client, user.id]);

  const saveSubject = async (input: Partial<StudentSubject>) => {
    const previous = state.subjects.find((subject) => subject.id === input.id);
    const saved = await storeRef.current.save('student_subjects', {
      ...previous,
      ...input,
      id: input.id || crypto.randomUUID(),
      user_id: user.id,
      title: String(input.title || 'Nowy przedmiot').trim(),
      created_at: input.created_at || new Date().toISOString(),
    });
    setState((current) => ({
      ...current,
      subjects: [...current.subjects.filter((subject) => subject.id !== saved.id), saved],
      status: '✓ Zapisano na Twoim koncie',
    }));
    return saved as StudentSubject;
  };

  const saveEntry = async (input: Partial<StudentEntry>) => {
    const previous = state.entries.find((entry) => entry.id === input.id);
    let next: Partial<StudentEntry> = {
      ...previous,
      ...input,
      id: input.id || crypto.randomUUID(),
      user_id: user.id,
      subject_id: input.subject_id || previous?.subject_id || '',
      kind: input.kind || previous?.kind || 'material',
      title: String(input.title || previous?.title || 'Wpis').trim(),
      payload: input.payload || previous?.payload || {},
      created_at: input.created_at || previous?.created_at || new Date().toISOString(),
    };
    next = recordStudyDay(previous, next);
    const saved = await storeRef.current.save('student_entries', next);
    setState((current) => ({
      ...current,
      entries: [...current.entries.filter((entry) => entry.id !== saved.id), saved],
      status: '✓ Zapisano na Twoim koncie',
    }));
    return saved as StudentEntry;
  };

  const importStudentData = async (subjects: StudentSubject[], entries: StudentEntry[]) => {
    if (subjects.length > 500 || entries.length > 10_000) {
      throw new Error('Kopia zawiera zbyt wiele rekordów.');
    }
    const subjectIds = new Map<string, string>();
    const entryIds = new Map<string, string>();
    const validSubjects = subjects.filter((subject) => typeof subject?.id === 'string' && typeof subject.title === 'string');
    for (const subject of validSubjects) subjectIds.set(subject.id, crypto.randomUUID());
    const validEntries = entries.filter((entry) =>
      typeof entry?.id === 'string' && subjectIds.has(entry.subject_id) &&
      ['material', 'note', 'event', 'task', 'deck', 'audio'].includes(entry.kind) &&
      Boolean(entry.payload) && typeof entry.payload === 'object' && !Array.isArray(entry.payload));
    for (const entry of validEntries) entryIds.set(entry.id, crypto.randomUUID());

    for (const subject of validSubjects) {
      await storeRef.current.save('student_subjects', {
        id: subjectIds.get(subject.id),
        user_id: user.id,
        title: subject.title.slice(0, 120),
        archived: Boolean(subject.archived),
        created_at: subject.created_at || new Date().toISOString(),
      });
    }
    for (const entry of validEntries) {
      const payload = { ...entry.payload };
      delete payload.path;
      if (entry.kind === 'material' && entry.payload.path) payload.fileRemoved = true;
      if (Array.isArray(payload.attachments)) payload.attachments = [];
      if (payload.sourceId) payload.sourceId = entryIds.get(payload.sourceId) || payload.sourceId;
      if (payload.courseSnapshot) {
        payload.courseSnapshot = {
          ...payload.courseSnapshot,
          sourceId: entryIds.get(payload.courseSnapshot.sourceId) || payload.courseSnapshot.sourceId,
        };
      }
      await storeRef.current.save('student_entries', {
        id: entryIds.get(entry.id),
        user_id: user.id,
        subject_id: subjectIds.get(entry.subject_id),
        kind: entry.kind,
        title: entry.title.slice(0, 120),
        payload,
        archived: Boolean(entry.archived),
        created_at: entry.created_at || new Date().toISOString(),
      });
    }
    await load();
    return { subjects: validSubjects.length, entries: validEntries.length };
  };

  return {
    ...state,
    saveSubject,
    saveEntry,
    importStudentData,
    refresh: load,
    setStatus: (status: string) => setState((current) => ({ ...current, status })),
  };
}