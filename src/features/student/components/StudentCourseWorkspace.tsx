import React, { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { BookOpen, BookText, ClipboardList, House, Layers, Sparkles } from 'lucide-react';
import { GLOSSARY } from '../../../data/courseData';
import { coursePlan, courseQuestions, courseSnapshotId } from '../lib/subject-course.js';
import type { StudentEntry, StudentSubject } from '../../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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

const navigation: { id: CourseSection; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Pulpit', icon: House },
  { id: 'lessons', label: 'Lekcje', icon: BookOpen },
  { id: 'flash', label: 'Fiszki', icon: Layers },
  { id: 'exam', label: 'Testy', icon: ClipboardList },
  { id: 'glossary', label: 'Słownik', icon: BookText },
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
  const lessonProgress = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;
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
    let activeSnapshot: StudentEntry | null = null;
    let activeMetadata: any = null;
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
        const metadata = snapshot.payload.courseSnapshot || {
          version: 1,
          key: job.key,
          sourceId: job.source.id,
          sourceRevision: job.source.revision || 1,
          sourceTitle: job.source.title,
          part: job.part,
          parts: job.parts,
        };
        if (metadata?.startedAt && Date.now() - Date.parse(metadata.startedAt) < 180000) {
          throw new Error('Ten moduł jest już opracowywany. Odśwież panel za chwilę.');
        }
        snapshot = await saveEntry({
          ...snapshot,
          payload: { ...snapshot.payload, courseSnapshot: { ...metadata, startedAt: new Date().toISOString() } },
        });
        activeSnapshot = snapshot;
        activeMetadata = metadata;
        notify(`Tworzę moduł ${completed + 1}/${jobs.length}: ${job.source.title}, część ${job.part}/${job.parts}.`);
        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData.session) throw new Error('Zaloguj się ponownie.');
        let response: Response;
        try {
          response = await fetch('/api/study', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
            body: JSON.stringify({ materialId: snapshot.id }),
          });
        } catch {
          throw new Error('Nie udało się połączyć z usługą tworzenia kursu. Sprawdź połączenie i spróbuj ponownie.');
        }
        let result: any;
        try {
          result = await response.json();
        } catch {
          throw new Error(`Usługa tworzenia kursu zwróciła nieprawidłową odpowiedź (${response.status}).`);
        }
        if (!response.ok) {
          if (response.status === 404 && result?.code === 'NOT_FOUND') {
            throw new Error('Generator kursów AI nie został wdrożony w projekcie Supabase. Skontaktuj się z administratorem.');
          }
          throw new Error(result?.error || result?.message || `Nie udało się opracować tej części (błąd ${response.status}).`);
        }
        const refreshedEntries = await refresh();
        const savedDeck = refreshedEntries?.find((entry: StudentEntry) =>
          entry.id === result.id && entry.user_id === user.id && entry.subject_id === subject.id && entry.payload.sourceId === snapshot.id
        );
        if (!savedDeck) throw new Error('Nie udało się potwierdzić zapisu modułu. Odśwież panel.');
        activeSnapshot = null;
        activeMetadata = null;
        completed += 1;
      }
      await refresh();
      setSection('home');
      const remainder = Math.max(0, jobs.length - completed);
      notify(`✓ Zapisano ${completed} nowych modułów.${remainder ? ` Pozostało ${remainder} części do wznowienia.` : ''}`);
    } catch (error: any) {
      if (activeSnapshot && activeMetadata) {
        try {
          await saveEntry({
            ...activeSnapshot,
            payload: { ...activeSnapshot.payload, courseSnapshot: { ...activeMetadata, startedAt: null } },
          });
        } catch {
          // Zachowujemy pierwotny błąd; odświeżenie może ponowić synchronizację danych.
        }
      }
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
    return <><div className="student-hero space-y-3 border-b pb-5"><Button variant="ghost" onClick={() => setLesson(null)} type="button">← Plan kursu</Button><Badge variant="outline">{subject.title} · lekcja {lesson.index + 1}</Badge><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{item.title || `Lekcja ${lesson.index + 1}`}</h1></div><Card className="course-reading gap-5"><p className="student-pre whitespace-pre-wrap break-words leading-7">{item.text}</p><details className="space-y-2"><summary className="cursor-pointer font-medium">Sprawdź źródło</summary><p className="student-source rounded-md border-l-2 border-primary/50 bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground">{item.quote}</p><p className="text-sm text-muted-foreground">{source?.payload.courseSnapshot?.sourceTitle || lesson.deck.title} · strona {item.page}</p>{source?.payload.pages?.filter((page) => page.page === item.page).map((page) => <p className="student-pre whitespace-pre-wrap break-words leading-7" key={page.page}>{page.text}</p>)}</details></Card><div className="student-actions flex flex-wrap items-center gap-2"><Button onClick={() => void markLessonDone(lesson.deck, lesson.index)} type="button">{lesson.deck.payload.lessonDone?.[lesson.index] ? 'Cofnij ukończenie' : 'Oznacz jako ukończoną'}</Button>{lesson.index > 0 && <Button variant="outline" onClick={() => setLesson({ ...lesson, index: lesson.index - 1 })} type="button">← Poprzednia lekcja</Button>}{lesson.index + 1 < (lesson.deck.payload.sections?.length || 0) && <Button variant="outline" onClick={() => setLesson({ ...lesson, index: lesson.index + 1 })} type="button">Następna lekcja →</Button>}<Button variant="outline" onClick={() => onOpenEntry(lesson.deck)} type="button">Fiszki i test modułu</Button></div></>;
  };

  return <section className="student-course-workspace grid min-h-[calc(100vh-9rem)] grid-cols-1 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm lg:grid-cols-[17rem_minmax(0,1fr)]">
    <aside className="student-course-sidebar grid grid-cols-2 content-start gap-1 border-b bg-sidebar p-4 text-sidebar-foreground lg:flex lg:flex-col lg:border-r lg:border-b-0" aria-label="Menu kursu">
      <div className="logo col-span-full mb-4 flex min-w-0 items-center gap-3 border-b border-sidebar-border pb-4"><div className="logo-mark flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="size-4" aria-hidden="true" /></div><div className="min-w-0"><strong className="block truncate text-sm font-semibold">{subject.title}</strong><small className="mt-1 block truncate text-xs text-sidebar-foreground/65">Twoja strefa nauki</small></div></div>
      <Button variant="ghost" className="menu-btn min-h-9 w-full justify-start rounded-md px-3 text-left text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground" onClick={onBack} type="button">← Moje przedmioty</Button>
      <div className="nav-title col-span-full mt-4 mb-1 px-3 text-[11px] font-semibold tracking-wide text-sidebar-foreground/55 uppercase">Przestrzeń nauki</div>
      {navigation.map(({ id, label, icon: Icon }) => <Button variant={section === id ? 'secondary' : 'ghost'} className={`menu-btn min-h-9 w-full justify-start gap-2 rounded-md px-3 text-left text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground ${section === id ? 'active bg-sidebar-foreground/15 font-medium text-sidebar-foreground' : ''}`} aria-current={section === id ? 'page' : undefined} onClick={() => { setLesson(null); setSection(id); }} type="button" key={id}><Icon className="size-4 shrink-0" aria-hidden="true" /><span>{label}</span></Button>)}
      {plan.current.map(({ deck, job }, moduleIndex) => <React.Fragment key={deck.id}><div className="nav-title col-span-full mt-4 mb-1 px-3 text-[11px] font-semibold tracking-wide text-sidebar-foreground/55 uppercase">Moduł {moduleIndex + 1} · {job.source.title}</div>{(deck.payload.sections || []).map((item, index) => <Button variant="ghost" className="lesson-nav min-h-8 w-full justify-start rounded-md pl-4 text-left text-xs text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground" onClick={() => setLesson({ deck, index })} type="button" key={`${deck.id}:${index}`}>{deck.payload.lessonDone?.[index] ? '✓ ' : '○ '}{item.title || `Lekcja ${index + 1}`}</Button>)}</React.Fragment>)}
    </aside>
    <div className="student-course-content min-w-0 space-y-6 p-4 sm:p-7 lg:p-9">
      {lesson ? renderLesson() : section === 'home' ? <>
        <div className="student-hero space-y-3 border-b pb-5"><span className="student-eyebrow block text-xs font-semibold tracking-wide text-primary uppercase">Prywatny kurs · {subject.title}</span><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Twoja strefa nauki</h1><p className="student-muted text-sm leading-6 text-muted-foreground">Lekcje i ćwiczenia na podstawie Twoich materiałów. Postępy zapisują się na Twoim koncie.</p></div>
        <div className="student-stats grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4"><strong className="text-2xl font-semibold tabular-nums">{completedLessons}/{lessons.length}</strong><span className="text-xs text-muted-foreground">Ukończone lekcje</span><Progress value={lessonProgress} aria-label="Postęp lekcji" /></div><div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-4"><strong className="text-2xl font-semibold tabular-nums">{cards.length}</strong><span className="text-xs text-muted-foreground">Fiszek</span></div><div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-4"><strong className="text-2xl font-semibold tabular-nums">{questions}</strong><span className="text-xs text-muted-foreground">Pytań testowych</span></div></div>
        <Card className="course-builder gap-4 p-5 sm:p-6"><h2 className="text-lg font-semibold">{plan.current.length ? 'Aktualizuj swój kurs' : 'Zbuduj swój kurs'}</h2><p className="text-sm">{plan.current.length} opracowanych modułów · {plan.pending.length} części czeka na opracowanie.</p><p className="student-muted text-sm leading-6 text-muted-foreground">Wybranie tej opcji przesyła tekst materiałów do AI. Każda część jest tworzona ze źródeł i zachowuje cytaty oraz numery stron. Sprawdzaj wygenerowaną treść.</p>{building ? <Button variant="outline" onClick={() => { stopRef.current = true; setStopAfterCurrent(true); }} type="button" disabled={stopAfterCurrent}>{stopAfterCurrent ? 'Zatrzymam po bieżącym module' : 'Zatrzymaj po bieżącym module'}</Button> : <Button onClick={() => void buildCourse()} type="button">{plan.current.length ? 'Utwórz / zaktualizuj kurs' : 'Utwórz kurs z moich materiałów'}</Button>}{plan.skipped.length > 0 && <details className="space-y-2"><summary className="cursor-pointer font-medium">Pominięte materiały ({plan.skipped.length})</summary>{plan.skipped.map((source) => <p className="text-sm text-muted-foreground" key={source.id}>{source.title}: za mało odczytanego tekstu.</p>)}</details>}</Card>
        {plan.old.length > 0 && <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-semibold">Wcześniejsze wersje</h2><p className="student-muted text-sm text-muted-foreground">Zachowujemy poprzednie wersje lekcji i wyniki.</p>{plan.old.map((deck) => <Button variant="outline" className="w-fit" key={deck.id} onClick={() => onOpenEntry(deck)} type="button">{deck.title}</Button>)}</Card>}
      </> : section === 'lessons' ? <>
        <div className="student-hero space-y-3 border-b pb-5"><Badge variant="outline">Kurs przedmiotu</Badge><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Lekcje i materiały</h1><p className="text-sm text-muted-foreground">{completedLessons} z {lessons.length} lekcji ukończonych · {plan.pending.length} nowych części.</p><Button onClick={() => void buildCourse()} type="button" disabled={building}>{building ? 'Tworzę kurs…' : 'Utwórz / zaktualizuj kurs'}</Button></div>
        <div className="course-outline grid gap-4 sm:grid-cols-2">{plan.current.map(({ deck, job }) => <Card className="course-module content-start gap-4" key={deck.id}><Badge variant="secondary">Moduł · {job.source.title}</Badge><h2 className="text-lg font-semibold">{deck.title}</h2><ol className="course-lessons mb-5 list-none space-y-1 p-0">{(deck.payload.sections || []).map((item, index) => <li key={index}><Button variant="ghost" className="w-full justify-start" onClick={() => setLesson({ deck, index })} type="button"><span>{deck.payload.lessonDone?.[index] ? '✓' : '○'}</span>{item.title || `Lekcja ${index + 1}`}</Button></li>)}</ol><Button variant="outline" onClick={() => onOpenEntry(deck)} type="button">Fiszki i ćwiczenia modułu</Button></Card>)}</div>
      </> : section === 'flash' ? <><div className="student-hero space-y-3 border-b pb-5"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Fiszki z kursu</h1><p className="text-sm text-muted-foreground">Moduły opracowane z materiałów tego przedmiotu.</p></div><div className="student-grid grid gap-4 sm:grid-cols-2">{plan.current.map(({ deck, job }) => <Card className="gap-4 p-5 sm:p-6" key={deck.id}><h2 className="text-lg font-semibold">{job.source.title}</h2><Badge variant="secondary">{deck.payload.cards?.length || 0} fiszek</Badge><Button className="w-fit" onClick={() => onOpenEntry(deck)} type="button">Ucz się</Button></Card>)}</div></> : section === 'exam' ? <><div className="student-hero space-y-3 border-b pb-5"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Test z kursu</h1><p className="text-sm text-muted-foreground">Wybierz długość testu z aktualnych pytań modułów.</p></div><div className="student-actions flex flex-wrap gap-2">{[10, 20, 30].map((count) => <Button onClick={() => void createCourseExam(count)} type="button" key={count}>{count} pytań</Button>)}</div></> : <><div className="student-hero space-y-3 border-b pb-5"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Słownik kursu</h1><p className="text-sm text-muted-foreground">Najważniejsze pojęcia z kursu bezpieczeństwa IT.</p></div><dl className="student-list grid gap-3">{GLOSSARY.map(([term, definition]) => <Card className="student-item gap-2 p-4 shadow-none" key={term}><dt className="font-semibold">{term}</dt><dd className="text-sm leading-6 text-muted-foreground">{definition}</dd></Card>)}</dl></>}
    </div>
  </section>;
};