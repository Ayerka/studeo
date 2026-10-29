import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
const { StudentPortal } = await vite.ssrLoadModule('/src/components/StudentPortal.tsx');
after(() => vite.close());

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function makeClient(owner, rows) {
  return {
    auth: { async getSession() { return { data: { session: { access_token: `token-${owner}` } } }; } },
    from(table) {
      let mode = 'select';
      let body = null;
      const filters = [];
      const query = {
        select() { return query; },
        eq(key, value) { filters.push([key, value]); return query; },
        order() { return query; },
        range() {
          return Promise.resolve({ data: rows[table].filter((row) => row.user_id === owner && filters.every(([key, value]) => row[key] === value)) });
        },
        insert(value) { mode = 'insert'; body = value; return query; },
        update(value) { mode = 'update'; body = value; return query; },
        async maybeSingle() {
          if (mode === 'insert') {
            const row = { ...body, revision: 1, archived: false, created_at: new Date().toISOString() };
            rows[table].push(row);
            return { data: structuredClone(row) };
          }
          const row = rows[table].find((item) => item.user_id === owner && filters.every(([key, value]) => item[key] === value));
          if (row && body) Object.assign(row, body);
          return { data: row ? structuredClone(row) : null };
        },
      };
      return query;
    },
    async rpc(name) {
      if (name === 'my_plan') return { data: [{ plan_key: 'premium_beta', plan_name: 'Premium', limits: { subjects: null, storage_bytes: 20e9, file_bytes: 20 * 1024 * 1024, ai_per_day: 100 } }] };
      return { data: null };
    },
  };
}

function installDom(dom) {
  dom.window.scrollTo = () => {};
  for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Event', 'MouseEvent', 'MutationObserver', 'FormData']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key] });
  }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}

test('React student panel loads private data and saves a subject for the signed-in owner', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://studeo.test' });
  installDom(dom);
  const rows = { student_subjects: [], student_entries: [] };
  const root = createRoot(dom.window.document.getElementById('root'));
  const client = makeClient('student-a', rows);

  try {
    await act(async () => {
      root.render(React.createElement(StudentPortal, {
        client,
        user: { id: 'student-a', email: 'a@example.test', user_metadata: {} },
        builtinProgress: { done: [], flashKnown: [], examBest: 0, examCount: 0, quizScores: {} },
        onOpenCourse() {},
        onOpenProfile() {},
        async onLogout() {},
      }));
      await tick();
    });

    assert.match(dom.window.document.body.textContent, /Mniej chaosu/);
    const addSubject = [...dom.window.document.querySelectorAll('button')].find((button) => button.textContent.includes('Dodaj przedmiot'));
    await act(async () => { addSubject.click(); await tick(); });
    const form = dom.window.document.querySelector('form.student-form');
    const title = form.querySelector('input');
    title.value = 'Bezpieczeństwo <img src=x onerror=alert(1)>';
    await act(async () => { form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); await tick(); });

    assert.equal(rows.student_subjects.length, 1);
    assert.equal(rows.student_subjects[0].user_id, 'student-a');
    assert.equal(rows.student_subjects[0].title, 'Bezpieczeństwo <img src=x onerror=alert(1)>');
    assert.match(dom.window.document.body.textContent, /Bezpieczeństwo <img src=x onerror=alert\(1\)>/);
    assert.equal(dom.window.document.querySelector('img'), null);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('React student course sends private material to the study API and saves the returned module', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://studeo.test' });
  installDom(dom);
  const material = {
    id: 'material-1',
    user_id: 'student-a',
    subject_id: 'subject-a',
    kind: 'material',
    title: 'Wykład 1',
    revision: 1,
    created_at: '2026-10-01T10:00:00.000Z',
    archived: false,
    payload: { pages: [{ page: 1, text: 'Treść wykładu o bezpieczeństwie, ochronie informacji, zasadach dostępu i organizacji pracy. '.repeat(3) }] },
  };
  const rows = {
    student_subjects: [{ id: 'subject-a', user_id: 'student-a', title: 'Bezpieczeństwo IT', revision: 1, created_at: '2026-10-01T10:00:00.000Z', archived: false }],
    student_entries: [material],
  };
  const client = makeClient('student-a', rows);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/study');
    assert.equal(options.headers.Authorization, 'Bearer token-student-a');
    const body = JSON.parse(options.body);
    const snapshot = rows.student_entries.find((entry) => entry.id === body.materialId);
    assert.equal(snapshot.user_id, 'student-a');
    assert.ok(snapshot.payload.courseSnapshot);
    const deck = {
      id: 'deck-ai-1', user_id: 'student-a', subject_id: 'subject-a', kind: 'deck', title: 'Moduł AI',
      revision: 1, created_at: new Date().toISOString(), archived: false,
      payload: { method: 'ai', sourceId: snapshot.id, sections: [{ title: 'Lekcja', text: 'Z materiału źródłowego.', page: 1, quote: 'Treść wykładu' }], cards: [], questions: [] },
    };
    rows.student_entries.push(deck);
    return { ok: true, status: 200, async json() { return { id: deck.id }; } };
  };
  const root = createRoot(dom.window.document.getElementById('root'));

  try {
    await act(async () => {
      root.render(React.createElement(StudentPortal, {
        client,
        user: { id: 'student-a', email: 'a@example.test', user_metadata: {} },
        builtinProgress: { done: [], flashKnown: [], examBest: 0, examCount: 0, quizScores: {} },
        onOpenCourse() {},
        onOpenProfile() {},
        async onLogout() {},
      }));
      await tick();
    });
    const subjectButton = [...dom.window.document.querySelectorAll('button')].filter((button) => button.textContent.includes('Wejdź do kursu')).at(-1);
    await act(async () => { subjectButton.click(); await tick(); });
    const buildButton = [...dom.window.document.querySelectorAll('button')].find((button) => button.textContent.includes('Utwórz kurs z moich materiałów'));
    assert.ok(buildButton, dom.window.document.body.textContent.slice(0, 1000));
    await act(async () => { buildButton.click(); await new Promise((resolve) => setTimeout(resolve, 30)); });
    assert.ok(rows.student_entries.some((entry) => entry.kind === 'deck' && entry.payload.method === 'ai'));
    assert.match(dom.window.document.body.textContent, /Zapisano 1 nowych modułów/);
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => root.unmount());
    dom.window.close();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('React portal isolates owners and saves manual flashcard review', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://studeo.test' });
  installDom(dom);
  const privateSubject = { id: 'subject-a', user_id: 'student-a', title: 'Prywatny przedmiot', revision: 1, created_at: '2026-10-01', archived: false };
  const rows = { student_subjects: [privateSubject], student_entries: [] };
  const root = createRoot(dom.window.document.getElementById('root'));
  const client = makeClient('student-a', rows);
  const clickButton = async (label) => act(async () => {
    const button = [...dom.window.document.querySelectorAll('button')].find((item) => item.textContent.includes(label));
    assert.ok(button, `missing button: ${label}`);
    button.click();
    await tick();
  });

  try {
    await act(async () => {
      root.render(React.createElement(StudentPortal, {
        client,
        user: { id: 'student-a', email: 'a@example.test', user_metadata: {} },
        builtinProgress: { done: [], flashKnown: [], examBest: 0, examCount: 0, quizScores: {} },
        onOpenCourse() {}, onOpenProfile() {}, async onLogout() {},
      }));
      await tick();
    });
    await clickButton('Przedmioty');
    await clickButton('Otwórz przedmiot');
    await clickButton('Nauka');
    await clickButton('Własne fiszki');
    const form = dom.window.document.querySelector('form.student-form');
    assert.ok(form, 'manual flashcard editor is rendered');
    form.querySelector('input[name=title]').value = 'Zestaw prywatny';
    form.querySelector('textarea[name=cards]').value = 'Co oznacza CIA? | Poufność, integralność, dostępność';
    await act(async () => { form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); await tick(); });
    const deck = rows.student_entries.find((entry) => entry.kind === 'deck');
    assert.ok(deck);
    assert.equal(deck.user_id, 'student-a');
    await clickButton('Otwórz');
    await clickButton('Pokaż odpowiedź');
    await clickButton('Pamiętam');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    assert.equal(deck.payload.cards[0].review.grade, 'good');
    assert.ok(deck.payload.cards[0].review.dueAt);

    const secondRoot = dom.window.document.createElement('div');
    dom.window.document.body.append(secondRoot);
    const otherClient = makeClient('student-b', rows);
    const rootB = createRoot(secondRoot);
    await act(async () => {
      rootB.render(React.createElement(StudentPortal, {
        client: otherClient,
        user: { id: 'student-b', email: 'b@example.test', user_metadata: {} },
        builtinProgress: { done: [], flashKnown: [], examBest: 0, examCount: 0, quizScores: {} },
        onOpenCourse() {}, onOpenProfile() {}, async onLogout() {},
      }));
      await tick();
    });
    assert.doesNotMatch(secondRoot.textContent, /Prywatny przedmiot|Zestaw prywatny/);
    await act(async () => rootB.unmount());
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('React task editor stores recurring work and advances its due date on completion', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://studeo.test' });
  installDom(dom);
  const rows = { student_subjects: [{ id: 'subject-a', user_id: 'student-a', title: 'Matematyka', revision: 1, created_at: '2026-10-01', archived: false }], student_entries: [] };
  const root = createRoot(dom.window.document.getElementById('root'));
  const client = makeClient('student-a', rows);
  const findButton = (text) => [...dom.window.document.querySelectorAll('button')].find((button) => button.textContent.includes(text));

  try {
    await act(async () => {
      root.render(React.createElement(StudentPortal, {
        client,
        user: { id: 'student-a', email: 'a@example.test', user_metadata: {} },
        builtinProgress: { done: [], flashKnown: [], examBest: 0, examCount: 0, quizScores: {} },
        onOpenCourse() {}, onOpenProfile() {}, async onLogout() {},
      }));
      await tick();
    });
    await act(async () => { findButton('Do zrobienia').click(); await tick(); });
    await act(async () => { findButton('Dodaj zadanie').click(); await tick(); });
    const form = dom.window.document.querySelector('form.student-form');
    form.querySelector('input[name=title]').value = 'Raport cotygodniowy';
    form.querySelector('textarea[name=description]').value = 'Przygotuj raport.';
    form.querySelector('input[name=due]').value = '2026-10-26';
    form.querySelector('select[name=repeat]').value = 'weekly';
    await act(async () => { form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); await tick(); });
    const task = rows.student_entries.find((entry) => entry.kind === 'task');
    assert.ok(task);
    assert.equal(task.payload.repeat, 'weekly');
    assert.equal(task.payload.due, '2026-10-26');

    await act(async () => { findButton('Oznacz gotowe').click(); await tick(); });
    assert.equal(task.payload.status, 'todo');
    assert.equal(task.payload.due, '2026-11-02');
    assert.equal(task.payload.completions.length, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});