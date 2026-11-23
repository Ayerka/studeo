// src/features/student/lib/student-stats.ts
import type { ProgressState, StudentEntry, StudentSubject } from '@/types';
import { LESSONS } from '@/data/courseData';
import { coursePlan } from './subject-course';

export function dateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function recordStudyDay(
  previous?: StudentEntry | null,
  next?: Partial<StudentEntry>,
  now: Date = new Date(),
): Partial<StudentEntry> {
  if (!previous || next?.kind !== 'deck') return next || {};
  const before = previous.payload;
  const after = next.payload || {};
  const learnedLesson = Object.keys(after.lessonDone || {}).some((key) =>
    Boolean(after.lessonDone?.[Number(key)]) && !before.lessonDone?.[Number(key)]);
  const learnedCard = (after.cards || []).some((card) => {
    const oldCount = before.cards?.find((item) => item.id === card.id)?.review?.count || 0;
    return (card.review?.count || 0) > oldCount;
  });
  const answered = ['testAnswers', 'practice'].some((key) => {
    const oldAnswers = before[key as 'testAnswers' | 'practice'] || {};
    const newAnswers = after[key as 'testAnswers' | 'practice'] || {};
    return Object.keys(newAnswers).some((answerId) =>
      JSON.stringify(newAnswers[answerId]) !== JSON.stringify(oldAnswers[answerId]));
  });
  if (!learnedLesson && !learnedCard && !answered) return next;

  const studyDays = [...new Set([...(before.studyDays || []), ...(after.studyDays || []), dateKey(now)])].sort();
  return { ...next, payload: { ...after, studyDays } };
}

export function studentStats(
  subjects: StudentSubject[],
  entries: StudentEntry[],
  userId: string,
  extra: { progress?: ProgressState } = {}
) {
  const activeSubjectIds = new Set(subjects.filter((subject) => subject.user_id === userId && !subject.archived).map((subject) => subject.id));
  const activeEntries = entries.filter((entry) => entry.user_id === userId && activeSubjectIds.has(entry.subject_id) && !entry.archived);
  const decks = activeEntries.filter((entry) => entry.kind === 'deck');
  const modules = [...activeSubjectIds].flatMap((subjectId) => coursePlan(activeEntries, subjectId).current.map((item) => item.deck));
  const studentLessons = modules.flatMap((deck) => deck.payload.sections || []);
  const totalLessons = LESSONS.length + studentLessons.length;
  const doneLessons = Math.min(LESSONS.length, new Set(extra.progress?.done || []).size) + modules.reduce((total, deck) =>
    total + (deck.payload.sections || []).filter((_, index) => Boolean(deck.payload.lessonDone?.[index])).length, 0);

  const allCards = decks.flatMap((entry) => entry.payload.cards || []);
  const cards = allCards.length;
  const known = allCards.filter((c) => c.known).length;
  const reviews = allCards.reduce((total, card) => total + (card.review?.count || 0), 0);

  // Zadania
  const tasksList = activeEntries.filter((e) => e.kind === 'task');
  const tasks = tasksList.length;
  const doneTasks = tasksList.filter((e) => e.payload.status === 'done').length;
  const repeated = tasksList.reduce((sum, e) => sum + (e.payload.completions?.length || 0), 0);

  // Obliczanie serii dni (Streak)
  const allStudyDays = new Set<string>();
  const addStudyDate = (value: string) => {
    const parsed = new Date(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isFinite(parsed.getTime())) return;
    const day = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : dateKey(parsed);
    if (day <= dateKey()) allStudyDays.add(day);
  };
  decks.forEach((entry) => {
    const payload = entry.payload;
    (payload.studyDays || []).forEach(addStudyDate);
    Object.values(payload.lessonDone || {}).forEach((done) => {
      if (done && typeof done === 'object' && done.at) addStudyDate(done.at);
    });
    (payload.cards || []).forEach((card) => { if (card.review?.lastAt) addStudyDate(card.review.lastAt); });
    for (const key of ['testAnswers', 'practice'] as const) {
      Object.values(payload[key] || {}).forEach((answer) => { if (answer.at) addStudyDate(answer.at); });
    }
    (payload.testHistory || []).forEach((history) => {
      for (const key of ['testAnswers', 'practice'] as const) {
        Object.values(history[key] || {}).forEach((answer) => {
          if (answer && typeof answer === 'object' && 'at' in answer && answer.at) addStudyDate(String(answer.at));
        });
      }
    });
  });

  let streak = 0;
  const shift = (day: string, amount: number) => new Date(Date.parse(`${day}T12:00:00Z`) + amount * 86_400_000).toISOString().slice(0, 10);
  let cursor = allStudyDays.has(dateKey()) ? dateKey() : shift(dateKey(), -1);
  while (allStudyDays.has(cursor)) {
    streak += 1;
    cursor = shift(cursor, -1);
  }

  // Ostatnie 7 dni
  const week: { date: string; active: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = shift(dateKey(d), 0);
    week.push({ date: key, active: allStudyDays.has(key) });
  }

  return {
    doneLessons,
    totalLessons,
    cards,
    known,
    reviews,
    tasks,
    doneTasks,
    repeated,
    streak,
    week,
  };
}