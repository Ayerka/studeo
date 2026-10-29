import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, GLOSSARY, LECTURE_MULTI, SECURITY_PLUS, pickSecurityQuestions } from '../src/data/courseData.ts';

test('React course data preserves lesson identifiers and track coverage', () => {
  assert.equal(LESSONS.length, 34);
  assert.equal(new Set(LESSONS.map((lesson) => lesson.id)).size, 34);
  assert.deepEqual([1, 2, 3, 4].map((track) => LESSONS.filter((lesson) => lesson.track === track).length), [8, 10, 8, 8]);
  for (const lesson of LESSONS) {
    assert.ok(lesson.quiz.length > 0, lesson.id);
    for (const question of lesson.quiz) {
      assert.ok(question.answer >= 0 && question.answer < question.options.length, `${lesson.id}: ${question.q}`);
      assert.ok(question.why, `${lesson.id}: explanation`);
    }
  }
});

test('React glossary and multi-select questions retain unique complete data', () => {
  assert.equal(GLOSSARY.length, 144);
  assert.equal(new Set(GLOSSARY.map(([term]) => term)).size, 144);
  assert.equal(LECTURE_MULTI.length, 22);
  assert.equal(new Set(LECTURE_MULTI.map((question) => question.id)).size, 22);
  for (const question of LECTURE_MULTI) {
    assert.ok(question.answers?.length);
    assert.ok(question.answers.every((answer) => answer >= 0 && answer < question.options.length));
  }
});

test('Security+ practice bank retains unique questions across five domains', () => {
  assert.equal(SECURITY_PLUS.length, 30);
  assert.equal(new Set(SECURITY_PLUS.map((question) => question.id)).size, 30);
  assert.equal(new Set(SECURITY_PLUS.map((question) => question.domain)).size, 5);
  for (const question of SECURITY_PLUS) {
    assert.equal(question.options.length, 4);
    assert.ok(question.answer >= 0 && question.answer < question.options.length);
    assert.ok(question.why.length > 30);
  }
  for (const count of [10, 20, 30]) {
    const selected = pickSecurityQuestions(count);
    assert.equal(selected.length, count);
    assert.equal(new Set(selected.map((question) => question.id)).size, count);
  }
});