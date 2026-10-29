import React, { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { LESSONS, GLOSSARY } from '../../data/courseData';
import { coursePlan, courseQuestions, courseSnapshotId } from '../../subject-course.js';
import type { StudentEntry, StudentSubject } from '../../types';

type CourseSection = 'home' | 'lessons' | 'flash' | 'exam' | 'glossary' | 'lesson';

interface StudentCourseWorkspaceProps {
  client: any;
  user: User;
  subject: StudentSubject;
  entries: StudentEntry[];
  saveEntry: (entry: Partial<StudentEntry>) => Promise<StudentEntry>;
  refresh: () => Promise<StudentEntry[]>;
  notify: (message: string, error?: boolean) => void;
  onOpenEntry: (entry: StudentEntry) => void;
  onBack: () => void;
  autoBuild?: boolean;
  onAutoBuildComplete?: () => void;
}

const navigation: { id: CourseSection; label: string }[] = [
  { id: 'home', label: '⌂ Pulpit' }, { id: 'lessons', label: '📚 Lekcje' },
  { id: 'flash', label: '🃏 Fiszki' }, { id: 'exam', label: '📝 Testy' },
  { id: 'glossary', label: '📖 Słownik' },
];

export const StudentCourseWorkspace: React.FC<StudentCourseWorkspaceProps> = ({
  client,
  user,
  subject,
  entries,
  saveEntry,
  refresh,
  notify,
  onOpenEntry,
  onBack,
  autoBuild = false,
  onAutoBuildComplete,
}) => {
  const [section, setSection] = useState<CourseSection>('home');
  const [lesson, setLesson] = useState<{ deck: StudentEntry; index: number } | null>(null);
  const [building, setBuilding] = useState(false);
  const [stopAfterCurrent, setStopAfterCurrent] = useState(false);
  const stopRef = useRef(false);
  const autoBuildRef = useRef(false);
  const plan = coursePlan(entries, subject.id);
  const lessons = plan.current.flatMap(({ deck, job }) => (deck.payload.sections || []).map((item, index) => ({ deck, job, item, index })));
  const completedLessons = lessons.filter(({ deck, index }) => Boolean(deck.payload.lessonDone?.[index])).length;
  const cards = plan.current.flatMap(({ deck }) => deck.payload.cards || []);
  const questions = plan.current.reduce((total, { deck }) => total + (deck.payload.questions || []).length, 0);

  const buildCourse = async () => {
    if (building) return;
    const jobs = [...plan.pending];
    if (!jobs.length) {
      notify(plan.skipped.length ? 'Nie znaleziono wystarczającej ilości tekstu w części materiałów.' : 'Kurs jest już aktualny.');
      return;
    }
    setBuilding(true);
    setStopAfterCurrent(false);
    stopRef.current = false;
    let completed = 0;
    try {
      for (const job of jobs) {
        if (stopRef.current) break;
        let snapshot = job.snapshot;
        if (!snapshot) {
          const id = await courseSnapshotId(user.id, subject.id, job.key);
          snapshot = await saveEntry({
            id,
            subject_id: subject.id,
            kind: 'material',
            title: `Kurs · ${job.source.title} · ${job.part}`.slice(0, 120),
            payload: {
              pages: job.pages,
              courseSnapshot: {
                version: 1,
                key: job.key,
                sourceId: job.source.id,
                sourceRevision: job.source.revision || 1,
                sourceTitle: job.source.title,
                part: job.part,
                parts: job.parts,
              },
            },
          });
        }
        const metadata = snapshot.payload.courseSnapshot;
        if (metadata?.startedAt && Date.now() - Date.parse(metadata.startedAt) < 180000) {
          throw new Error('Ten moduł jest już opracowywany. Odśwież panel za chwilę.');
        }
        snapshot = await saveEntry({
          ...snapshot,
          payload: { ...snapshot.payload, courseSnapshot: { ...metadata, startedAt: new Date().toISOString() } },
        });
        notify(`Tworzę moduł ${completed + 1}/${jobs.length}: ${job.source.title}, część ${job.part}/${job.parts}.`);
        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData.session) throw new Error('Zaloguj się ponownie.');
        let response: Response;
        let result: any;
        try {
          response = await fetch('/api/study', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
            body: JSON.stringify({ materialId: snapshot.id }),
          });
          result = await response.json();
        } catch {
          throw new Error('Połączenie zostało przerwane. Gotowe moduły są zapisane; spróbuj wznowić kurs za chwilę.');
        }
        if (!response.ok) {
          if (response.status < 500) {
            await saveEntry({ ...snapshot, payload: { ...snapshot.payload, courseSnapshot: { ...metadata, startedAt: null } } });
          }
          throw new Error(result.error || 'Nie udało się opracować tej części. Gotowe moduły pozostają zapisane.');
        }
        const refreshedEntries = await refresh();
        const savedDeck = refreshedEntries?.find((entry: StudentEntry) =>
          entry.id === result.id && entry.user_id === user.id && entry.subject_id === subject.id && entry.payload.sourceId === snapshot.id
        );
        if (!savedDeck) throw new Error('Nie udało się potwierdzić zapisu modułu. Odśwież panel.');
        completed += 1;
      }
      await refresh();
      setSection('home');
      const remainder = Math.max(0, jobs.length - completed);
      notify(`✓ Zapisano ${completed} nowych modułów.${remainder ? ` Pozostało ${remainder} części do wznowienia.` : ''}`);
    } catch (error: any) {
      await refresh();
      notify(error.message || 'Nie udało się opracować kursu.', true);
    } finally {
      setBuilding(false);
      setStopAfterCurrent(false);
    }
  };

  const createCourseExam = async (count: number) => {
    try {
      const examQuestions = courseQuestions(plan, count);
      if (!examQuestions.length) throw new Error('Najpierw opracuj materiały z pytaniami.');
      const exam = await saveEntry({
        subject_id: subject.id,
        kind: 'deck',
        title: `Test kursu · ${subject.title} · ${new Date().toLocaleDateString('pl-PL')}`.slice(0, 120),
        payload: { method: 'course-exam', cards: [], sections: [], questions: examQuestions, testAnswers: {}, requestedCount: count },
      });
      onOpenEntry(exam);
      notify('Test zapisany. Możesz do niego wrócić później.');
    } catch (error: any) {
      notify(error.message || 'Nie udało się przygotować testu.', true);
    }
  };

  const markLessonDone = async (deck: StudentEntry, index: number) => {
    const done = { ...(deck.payload.lessonDone || {}) };
    if (done[index]) delete done[index];
    else done[index] = { at: new Date().toISOString() } as any;
    try {
      await saveEntry({ ...deck, payload: { ...deck.payload, lessonDone: done } });
      notify('Postęp lekcji zapisany na Twoim koncie.');
      setLesson(null);
    } catch (error: any) {
      notify(error.message || 'Nie udało się zapisać postępu.', true);
    }
  };

  useEffect(() => {
    if (autoBuild && !autoBuildRef.current) {
      autoBuildRef.current = true;
      void buildCourse();
    }
    if (!autoBuild) autoBuildRef.current = false;
    onAutoBuildComplete?.();
  }, [autoBuild]);

  const renderLesson = () => {
    if (!lesson) return null;
    const item = lesson.deck.payload.sections?.[lesson.index];
    if (!item) return null;
    const source = entries.find((entry) => entry.id === lesson.deck.payload.sourceId);
    return <><div className="student-hero"><button className="student-quiet" onClick={() => setLesson(null)} type="button">← Plan kursu</button><span className="student-eyebrow">{subject.title} · lekcja {lesson.index + 1}</span><h1>{item.title || `Lekcja ${lesson.index + 1}`}</h1></div><article className="student-card course-reading"><p className="student-pre">{item.text}</p><details><summary>Sprawdź źródło</summary><p className="student-source">{item.quote}</p><p>{source?.payload.courseSnapshot?.sourceTitle || lesson.deck.title} · strona {item.page}</p>{source?.payload.pages?.filter((page) => page.page === item.page).map((page) => <p className="student-pre" key={page.page}>{page.text}</p>)}</details></article><div className="student-actions studeo-library"><button className="student-primary" onClick={() => void markLessonDone(lesson.deck, lesson.index)} type="button">{lesson.deck.payload.lessonDone?.[lesson.index] ? 'Cofnij ukończenie' : 'Oznacz jako ukończoną'}</button>{lesson.index > 0 && <button className="student-quiet" onClick={() => setLesson({ ...lesson, index: lesson.index - 1 })} type="button">← Poprzednia lekcja</button>}{lesson.index + 1 < (lesson.deck.payload.sections?.length || 0) && <button className="student-quiet" onClick={() => setLesson({ ...lesson, index: lesson.index + 1 })} type="button">Następna lekcja →</button>}<button className="student-quiet" onClick={() => onOpenEntry(lesson.deck)} type="button">Fiszki i test modułu</button></div></>;
  };

  return <section className="student-course-workspace">
    <aside className="student-course-sidebar" aria-label="Menu kursu">
      <div className="logo"><div className="logo-mark">✦</div><div><strong>{subject.title}</strong><small>Twoja strefa nauki</small></div></div>
      <button className="menu-btn" onClick={onBack} type="button">← Moje przedmioty</button>
      <div className="nav-title">Przestrzeń nauki</div>
      {navigation.map((item) => <button className={`menu-btn ${section === item.id ? 'active' : ''}`} aria-current={section === item.id ? 'page' : undefined} onClick={() => { setLesson(null); setSection(item.id); }} type="button" key={item.id}>{item.label}</button>)}
      {plan.current.map(({ deck, job }, moduleIndex) => <React.Fragment key={deck.id}><div className="nav-title">Moduł {moduleIndex + 1} · {job.source.title}</div>{(deck.payload.sections || []).map((item, index) => <button className="lesson-nav" onClick={() => setLesson({ deck, index })} type="button" key={`${deck.id}:${index}`}>{deck.payload.lessonDone?.[index] ? '✓ ' : '○ '}{item.title || `Lekcja ${index + 1}`}</button>)}</React.Fragment>)}
    </aside>
    <div className="student-course-content">
      {lesson ? renderLesson() : section === 'home' ? <>
        <div className="student-hero"><span className="student-eyebrow">Prywatny kurs · {subject.title}</span><h1>Twoja strefa nauki</h1><p className="student-muted">Lekcje i ćwiczenia na podstawie Twoich materiałów. Postępy zapisują się na Twoim koncie.</p></div>
        <div className="student-stats"><div><strong>{completedLessons}/{lessons.length}</strong><span>Ukończone lekcje</span></div><div><strong>{cards.length}</strong><span>Fiszek</span></div><div><strong>{questions}</strong><span>Pytań testowych</span></div></div>
        <section className="student-card course-builder"><h2>{plan.current.length ? 'Aktualizuj swój kurs' : 'Zbuduj swój kurs'}</h2><p>{plan.current.length} opracowanych modułów · {plan.pending.length} części czeka na opracowanie.</p><p className="student-muted">Wybranie tej opcji przesyła tekst materiałów do AI. Każda część jest tworzona ze źródeł i zachowuje cytaty oraz numery stron. Sprawdzaj wygenerowaną treść.</p>{building ? <button className="student-quiet" onClick={() => { stopRef.current = true; setStopAfterCurrent(true); }} type="button" disabled={stopAfterCurrent}>{stopAfterCurrent ? 'Zatrzymam po bieżącym module' : 'Zatrzymaj po bieżącym module'}</button> : <button className="student-primary" onClick={() => void buildCourse()} type="button">{plan.current.length ? 'Utwórz / zaktualizuj kurs' : 'Utwórz kurs z moich materiałów'}</button>}{plan.skipped.length > 0 && <details><summary>Pominięte materiały ({plan.skipped.length})</summary>{plan.skipped.map((source) => <p key={source.id}>{source.title}: za mało odczytanego tekstu.</p>)}</details>}</section>
        {plan.old.length > 0 && <section className="student-card"><h2>Wcześniejsze wersje</h2><p className="student-muted">Zachowujemy poprzednie wersje lekcji i wyniki.</p>{plan.old.map((deck) => <button className="student-quiet" key={deck.id} onClick={() => onOpenEntry(deck)} type="button">{deck.title}</button>)}</section>}
      </> : section === 'lessons' ? <>
        <div className="student-hero"><span className="student-eyebrow">Kurs przedmiotu</span><h1>Lekcje i materiały</h1><p>{completedLessons} z {lessons.length} lekcji ukończonych · {plan.pending.length} nowych części.</p><button className="student-primary" onClick={() => void buildCourse()} type="button" disabled={building}>{building ? 'Tworzę kurs…' : 'Utwórz / zaktualizuj kurs'}</button></div>
        <div className="course-outline">{plan.current.map(({ deck, job }) => <section className="student-card course-module" key={deck.id}><span className="student-eyebrow">Moduł · {job.source.title}</span><h2>{deck.title}</h2><ol className="course-lessons">{(deck.payload.sections || []).map((item, index) => <li key={index}><button onClick={() => setLesson({ deck, index })} type="button"><span>{deck.payload.lessonDone?.[index] ? '✓' : '○'}</span>{item.title || `Lekcja ${index + 1}`}</button></li>)}</ol><button className="student-quiet" onClick={() => onOpenEntry(deck)} type="button">Fiszki i ćwiczenia modułu</button></section>)}</div>
      </> : section === 'flash' ? <><div className="student-hero"><h1>Fiszki z kursu</h1><p>Moduły opracowane z materiałów tego przedmiotu.</p></div><div className="student-grid">{plan.current.map(({ deck, job }) => <article className="student-card" key={deck.id}><h2>{job.source.title}</h2><p>{deck.payload.cards?.length || 0} fiszek</p><button className="student-primary" onClick={() => onOpenEntry(deck)} type="button">Ucz się</button></article>)}</div></> : section === 'exam' ? <><div className="student-hero"><h1>Test z kursu</h1><p>Wybierz długość testu z aktualnych pytań modułów.</p></div><div className="student-actions">{[10, 20, 30].map((count) => <button className="student-primary" onClick={() => void createCourseExam(count)} type="button" key={count}>{count} pytań</button>)}</div></> : <><div className="student-hero"><h1>Słownik kursu</h1><p>Najważniejsze pojęcia z kursu bezpieczeństwa IT.</p></div><dl className="student-list">{GLOSSARY.map(([term, definition]) => <div className="student-item" key={term}><dt><strong>{term}</strong></dt><dd>{definition}</dd></div>)}</dl></>}
    </div>
  </section>;
};