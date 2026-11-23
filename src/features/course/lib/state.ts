// src/features/course/lib/state.ts
import type { Lesson, GlossaryItem, ProgressState } from '@/types';

export function normalizeProgress(
  raw: any,
  lessons: Lesson[] = [],
  glossary: GlossaryItem[] = []
): ProgressState {
  const lessonIds = new Set(lessons.map((l) => l.id));
  const glossaryTerms = new Set(glossary.map((g) => g[0]));

  const done = Array.isArray(raw?.done)
    ? raw.done.filter((id: unknown): id is string => typeof id === 'string' && lessonIds.has(id))
    : [];

  const flashKnown = Array.isArray(raw?.flashKnown)
    ? raw.flashKnown.filter((term: unknown): term is string => typeof term === 'string' && glossaryTerms.has(term))
    : [];

  const examBest = typeof raw?.examBest === 'number' && Number.isFinite(raw.examBest)
    ? Math.max(0, Math.min(100, Math.round(raw.examBest)))
    : 0;

  const examCount = typeof raw?.examCount === 'number' && Number.isFinite(raw.examCount)
    ? Math.max(0, Math.round(raw.examCount))
    : 0;

  const quizScores: Record<string, { total: number; correct: number }> = {};
  if (raw?.quizScores && typeof raw.quizScores === 'object') {
    for (const [k, v] of Object.entries(raw.quizScores as Record<string, any>)) {
      if (lessonIds.has(k) && v && typeof v === 'object') {
        const total = typeof v.total === 'number' ? Math.max(0, v.total) : 0;
        const correct = typeof v.correct === 'number' ? Math.max(0, Math.min(total, v.correct)) : 0;
        quizScores[k] = { total, correct };
      }
    }
  }

  return { done, flashKnown, examBest, examCount, quizScores };
}

export function safeAnswers(rawQuiz: any, lessons: Lesson[] = []) {
  const answers: Record<string, number> = {};
  const shown: Record<string, boolean> = {};

  if (!rawQuiz || typeof rawQuiz !== 'object') return { answers, shown };

  const rawAnswers = rawQuiz.answers;
  const rawShown = rawQuiz.shown;

  for (const lesson of lessons) {
    lesson.quiz.forEach((q, idx) => {
      const key = `${lesson.id}-${idx}`;
      if (rawAnswers && Number.isInteger(rawAnswers[key])) {
        const val = rawAnswers[key];
        if (val >= 0 && val < q.options.length) {
          answers[key] = val;
        }
      }
      if (rawShown && typeof rawShown[key] === 'boolean') {
        shown[key] = rawShown[key];
      }
    });
  }

  return { answers, shown };
}