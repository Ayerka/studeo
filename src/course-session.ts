import { LESSONS, LECTURE_MULTI, SECURITY_PLUS, GLOSSARY } from './data/courseData';
import { safeAnswers } from './state';
import type { ExamAnswer, ProgressState, QuizQuestion } from './types';

const EXAM_TYPES = new Set(['all', '1', '2', '3', '4', 'sec10', 'sec20', 'sec30']);

export interface CourseSessionState {
  progress: ProgressState;
  quiz: { answers: Record<string, number>; shown: Record<string, boolean> };
  flashIndex: number;
  exam: {
    questions: Array<{ lesson: string; index: number } | { lectureId: string } | { securityId: string }>;
    answers: ExamAnswer[];
    index: number;
    type: string;
    active: boolean;
  };
  history: any[];
}

export function resolveExamQuestion(reference: any): QuizQuestion | null {
  if (typeof reference?.lectureId === 'string') {
    return LECTURE_MULTI.find((question) => question.id === reference.lectureId) || null;
  }
  if (typeof reference?.securityId === 'string') {
    return SECURITY_PLUS.find((question) => question.id === reference.securityId) || null;
  }
  if (typeof reference?.lesson !== 'string' || !Number.isInteger(reference.index)) return null;
  const lesson = LESSONS.find((item) => item.id === reference.lesson);
  const question = lesson?.quiz[reference.index];
  return question ? { ...question, lesson: lesson.id, lessonTitle: lesson.title } : null;
}

export function restoreCourseSession(raw: any, progress: ProgressState) {
  const quiz = safeAnswers(raw?.quiz, LESSONS);
  const examRaw = raw?.exam || {};
  const examQuestions = Array.isArray(examRaw.questions)
    ? examRaw.questions.map(resolveExamQuestion).filter((question): question is QuizQuestion => Boolean(question)).slice(0, 30)
    : [];
  const examAnswers = examQuestions.map((question, index): ExamAnswer | undefined => {
    const answer = examRaw.answers?.[index];
    const selected = Array.isArray(answer?.answer) ? answer.answer : [answer?.answer];
    if (
      !selected.length ||
      !selected.every((choice: unknown) => Number.isInteger(choice) && Number(choice) >= 0 && Number(choice) < question.options.length)
    ) return undefined;
    const normalized = [...new Set(selected as number[])];
    if (question.answers && !Array.isArray(answer?.answer)) return undefined;
    if (!question.answers && normalized.length !== 1) return undefined;
    return { answer: question.answers ? normalized : normalized[0], shown: answer?.shown === true };
  });
  const examType = EXAM_TYPES.has(examRaw.type) ? examRaw.type : 'all';
  const requestedIndex = Number.isInteger(examRaw.index) ? examRaw.index : 0;

  return {
    progress,
    quiz,
    flashIndex: Number.isInteger(raw?.flashIndex)
      ? Math.max(0, Math.min(raw.flashIndex, GLOSSARY.length - 1))
      : 0,
    examType,
    examQuestions,
    examAnswers,
    examIndex: examQuestions.length ? Math.max(0, Math.min(requestedIndex, examQuestions.length - 1)) : 0,
    examActive: examRaw.active === true && examQuestions.length > 0,
    history: Array.isArray(raw?.history) ? raw.history.slice(-100) : [],
  };
}

export function serializeCourseSession(
  progress: ProgressState,
  quizAnswers: Record<string, number>,
  quizShown: Record<string, boolean>,
  flashIndex: number,
  examType: string,
  questions: QuizQuestion[],
  answers: ExamAnswer[],
  examIndex: number,
  examActive: boolean,
  history: any[]
): CourseSessionState {
  const questionRefs = questions.map((question) => {
    if (question.id?.startsWith('lecture-multi-')) return { lectureId: question.id };
    if (question.id) return { securityId: question.id };
    const lesson = LESSONS.find((item) => item.id === question.lesson);
    return { lesson: question.lesson || '', index: lesson?.quiz.findIndex((item) => item.q === question.q) ?? -1 };
  });

  return {
    progress,
    quiz: { answers: quizAnswers, shown: quizShown },
    flashIndex,
    exam: { questions: questionRefs, answers, index: examIndex, type: examType, active: examActive },
    history: history.slice(-100),
  };
}