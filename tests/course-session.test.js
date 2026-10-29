import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, GLOSSARY } from '../src/data/courseData.ts';
import { normalizeProgress } from '../src/state.js';
import { restoreCourseSession, serializeCourseSession } from '../src/course-session.ts';

const emptyProgress = normalizeProgress({}, LESSONS, GLOSSARY);

test('restores a legacy active exam, selected answers, quiz state and history', () => {
  const raw = {
    progress: { done: ['w1-start'] },
    quiz: { answers: { 'w1-start-0': 1, invalid: 9 }, shown: { 'w1-start-0': true } },
    flashIndex: 4,
    exam: {
      questions: [{ lesson: 'w1-start', index: 0 }],
      answers: [{ answer: 1, shown: true }],
      index: 0,
      type: 'all',
      active: true,
    },
    history: [{ at: '2026-10-01', score: { pct: 80 } }],
  };

  const restored = restoreCourseSession(raw, emptyProgress);
  assert.equal(restored.examActive, true);
  assert.equal(restored.examQuestions[0].lesson, 'w1-start');
  assert.deepEqual(restored.examAnswers[0], { answer: 1, shown: true });
  assert.deepEqual(restored.quiz.answers, { 'w1-start-0': 1 });
  assert.deepEqual(restored.quiz.shown, { 'w1-start-0': true });
  assert.equal(restored.flashIndex, 4);
  assert.equal(restored.history.length, 1);
});

test('restores Security+ sessions and rejects invalid stored answers', () => {
  const restored = restoreCourseSession({
    exam: {
      questions: [{ securityId: 'sp-01' }],
      answers: [{ answer: 99, shown: true }],
      index: 9,
      type: 'sec30',
      active: true,
    },
  }, emptyProgress);

  assert.equal(restored.examQuestions.length, 1);
  assert.equal(restored.examAnswers[0], undefined);
  assert.equal(restored.examIndex, 0);
  assert.equal(restored.examType, 'sec30');
  assert.equal(restored.examActive, true);
});

test('serializes exam references in the legacy-compatible format', () => {
  const question = { ...LESSONS[0].quiz[0], lesson: LESSONS[0].id };
  const snapshot = serializeCourseSession(
    emptyProgress,
    {},
    {},
    0,
    'all',
    [question],
    [{ answer: question.answer, shown: true }],
    0,
    true,
    []
  );

  assert.deepEqual(snapshot.exam.questions, [{ lesson: LESSONS[0].id, index: 0 }]);
  assert.equal(snapshot.exam.active, true);
  assert.deepEqual(restoreCourseSession(snapshot, emptyProgress).examAnswers[0], {
    answer: question.answer,
    shown: true,
  });
});