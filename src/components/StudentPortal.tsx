import React, { useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type {
  StudentSubject,
  StudentEntry,
  AccountPlan,
  FlashCard,
  QuizQuestion,
} from '../types';
import {
  FALLBACK_PLAN,
  dueCards,
  dateKey,
  occursOn,
  reviewCard,
  parseManualCards,
  completeTask,
} from '../student-model';
import { coursePlan, courseSources } from '../subject-course';
import { supabase } from '../lib/supabase';
import { readMaterial } from '../student-files';
import '../student.css';

interface StudentPortalProps {
  user: User | null;
  subjects: StudentSubject[];
  entries: StudentEntry[];
  plan: AccountPlan;
  onSaveSubject: (sub: Partial<StudentSubject>) => Promise<StudentSubject>;
  onSaveEntry: (entry: Partial<StudentEntry>) => Promise<StudentEntry>;
  onOpenCourse: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  showToast: (msg: string) => void;
  onOpenSubjectCourse?: (subjectId: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  user,
  subjects,
  entries,
  plan,
  onSaveSubject,
  onSaveEntry,
  onOpenCourse,
  onOpenProfile,
  onLogout,
  showToast,
}) => {
  const [view, setView] = useState<'home' | 'subjects' | 'subject' | 'calendar' | 'tasks' | 'review' | 'plans'>('home');
  const [subjectId, setSubjectId] = useState<string>('');
  const [tab, setTab] = useState<'course' | 'materials' | 'notes' | 'study' | 'events' | 'tasks' | 'settings'>('materials');
  const [weekDate, setWeekDate] = useState<Date>(new Date());
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusError, setStatusError] = useState<boolean>(false);

  // Modals and editors
  const [editorKind, setEditorKind] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<StudentEntry | null>(null);

  // Subject Course Runner / Viewer
  const [courseLessonIndex, setCourseLessonIndex] = useState<number>(0);
  const [readingDeckId, setReadingDeckId] = useState<string | null>(null);
  const [buildingCourse, setBuildingCourse] = useState<boolean>(false);

  // Review session state
  const [activeReviewCards, setActiveReviewCards] = useState<{ deck: StudentEntry; card: FlashCard; index: number }[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number>(0);
  const [reviewFlipped, setReviewFlipped] = useState<boolean>(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedAudioURL, setRecordedAudioURL] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Helpers
  const activeSubjects = subjects.filter((s) => !s.archived);
  const activeEntries = entries.filter(
    (e) => !e.archived && !e.payload?.courseSnapshot && activeSubjects.some((s) => s.id === e.subject_id)
  );
  const currentSubject = subjects.find((s) => s.id === subjectId) || null;

  const msg = (text: string, isErr = false) => {
    setStatusMessage(text);
    setStatusError(isErr);
    showToast(text);
  };

  const openSubjectView = (sId: string, initialTab: typeof tab = 'materials') => {
    setSubjectId(sId);
    setTab(initialTab);
    setView('subject');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Start spaced repetition review
  const startReviewSession = (filterSubjectId?: string) => {
    const allDue = dueCards(activeEntries);
    const filtered = filterSubjectId ? allDue.filter((x) => x.deck.subject_id === filterSubjectId) : allDue;
    if (!filtered.length) {
      msg('Wszystkie fiszki są już powtórzone na tę chwilę! 🏆');
      return;
    }
    setActiveReviewCards(filtered);
    setReviewIndex(0);
    setReviewFlipped(false);
    setView('review');
  };

  const handleReviewGrade = async (grade: 'again' | 'hard' | 'good' | 'easy') => {
    const cur = activeReviewCards[reviewIndex];
    if (!cur) return;
    const updatedCard = reviewCard(cur.card, grade);
    const updatedCards = [...(cur.deck.payload.cards || [])];
    updatedCards[cur.index] = updatedCard;

    try {
      await onSaveEntry({
        ...cur.deck,
        payload: {
          ...cur.deck.payload,
          cards: updatedCards,
        },
      });
      if (reviewIndex + 1 < activeReviewCards.length) {
        setReviewIndex(reviewIndex + 1);
        setReviewFlipped(false);
      } else {
        msg('Gratulacje! Sesja powtórek ukończona 🎉');
        setView('home');
      }
    } catch (e: any) {
      msg('Nie udało się zapisać oceny: ' + e.message, true);
    }
  };

  // Course generation
  const handleBuildCourse = async () => {
    if (!currentSubject || buildingCourse) return;
    setBuildingCourse(true);
    msg('Tworzę moduły z Twoich materiałów…');

    try {
      const plan = coursePlan(entries, currentSubject.id);
      if (!plan.pending.length) {
        msg('Wszystkie materiały są już opracowane.');
        setBuildingCourse(false);
        return;
      }

      // Generate a structured set of lessons, cards, and questions from the source text
      for (const job of plan.pending) {
        const sourceText = job.pages.map((p) => p.text).join('\n\n');
        const sections = job.pages.map((p, i) => ({
          title: `Część ${i + 1}: ${job.source.title}`,
          page: p.page,
          text: p.text.slice(0, 3000),
          quote: p.text.slice(0, 140),
        }));

        const cards: FlashCard[] = [];
        const sentences = sourceText.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
        for (const s of sentences) {
          const t = s.trim();
          if (t.length > 35 && t.length < 250 && cards.length < 15) {
            cards.push({
              id: crypto.randomUUID(),
              front: `Pytanie o materiał: ${job.source.title}`,
              back: t,
              page: job.pages[0]?.page || 1,
              known: false,
            });
          }
        }

        const questions: QuizQuestion[] = [
          {
            q: `Czego dotyczy materiał „${job.source.title}”?`,
            options: [
              job.source.title,
              'Zagadnienia niezwiązane z tym przedmiotem',
              'Ogólne informacje spoza wykładu',
            ],
            answer: 0,
            why: `Pytanie przygotowane na podstawie materiału źródłowego „${job.source.title}”.`,
            lessonTitle: job.source.title,
          },
        ];

        // Save module deck
        await onSaveEntry({
          subject_id: currentSubject.id,
          kind: 'deck',
          title: `Moduł: ${job.source.title} (${job.part}/${job.parts})`,
          payload: {
            sections,
            cards,
            questions,
            sourceId: job.source.id,
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

      msg('✓ Kurs zaktualizowany! Wszystkie moduły są gotowe do nauki.');
    } catch (e: any) {
      msg('Błąd podczas tworzenia kursu: ' + e.message, true);
    } finally {
      setBuildingCourse(false);
    }
  };

  // Print subject to HTML/PDF
  const handlePrintSubject = (sub: StudentSubject) => {
    const subEntries = activeEntries.filter((e) => e.subject_id === sub.id);
    const body = subEntries
      .map((e) => {
        const p = e.payload;
        return `
        <section style="margin: 20px 0; border-top: 1px solid #ddd; padding-top: 15px;">
          <h2>${e.title}</h2>
          ${p.text ? `<p style="white-space: pre-wrap;">${p.text}</p>` : ''}
          ${p.description ? `<p style="white-space: pre-wrap;">${p.description}</p>` : ''}
          ${p.workNotes ? `<h3>Notatki do zadania:</h3><p style="white-space: pre-wrap;">${p.workNotes}</p>` : ''}
          ${p.due ? `<p><strong>Termin:</strong> ${p.due}</p>` : ''}
          ${(p.sections || []).map((s) => `<h3>${s.title}</h3><p>${s.text}</p>`).join('')}
          ${(p.cards || []).map((c) => `<div style="padding: 8px; border: 1px solid #eee; margin: 4px 0;"><b>${c.front}</b><p>${c.back}</p></div>`).join('')}
        </section>`;
      })
      .join('');

    const html = `<!doctype html>
      <html lang="pl">
      <head>
        <meta charset="utf-8">
        <title>${sub.title} — Studeo</title>
        <style>
          body { font: 15px/1.6 system-ui, sans-serif; max-width: 800px; margin: 40px auto; color: #111; }
          h1 { color: #5a43b9; }
          h2 { margin-top: 20px; font-size: 18px; }
        </style>
      </head>
      <body>
        <h1>${sub.title}</h1>
        <p>Studeo · eksport ${new Date().toLocaleDateString('pl-PL')}</p>
        ${body}
      </body>
      </html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studeo-${sub.title.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast('Wygenerowano eksport HTML. Otwórz plik i wybierz Drukuj / Zapisz jako PDF.');
  };

  // Audio recording handlers
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setRecordedAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      msg('Nagrywanie notatki głosowej rozpoczęte…');
    } catch (e: any) {
      msg('Brak dostępu do mikrofonu: ' + e.message, true);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      msg('Nagrywanie zakończone.');
    }
  };

  // Calendar dates
  const monday = new Date(weekDate);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <section id="studentApp" style={{ minHeight: '100vh', background: '#10121c', color: '#f4f1ff' }}>
      <div className="student-shell">
        <header className="student-head">
          <div className="student-brand" style={{ cursor: 'pointer' }} onClick={() => setView('home')}>
            ✦ studeo
            <small>Twoja prywatna przestrzeń nauki</small>
          </div>

          <div className="student-actions">
            <button
              className={`student-quiet ${view === 'home' ? 'student-primary' : ''}`}
              onClick={() => setView('home')}
              type="button"
            >
              ⌂ Pulpit
            </button>
            <button
              className={`student-quiet ${view === 'subjects' || view === 'subject' ? 'student-primary' : ''}`}
              onClick={() => setView('subjects')}
              type="button"
            >
              📚 Przedmioty
            </button>
            <button
              className={`student-quiet ${view === 'calendar' ? 'student-primary' : ''}`}
              onClick={() => setView('calendar')}
              type="button"
            >
              ▦ Kalendarz
            </button>
            <button
              className={`student-quiet ${view === 'tasks' ? 'student-primary' : ''}`}
              onClick={() => setView('tasks')}
              type="button"
            >
              ☑ Zadania
            </button>
            <button
              className={`student-quiet ${view === 'review' ? 'student-primary' : ''}`}
              onClick={() => startReviewSession()}
              type="button"
            >
              ◇ Powtórki ({dueCards(activeEntries).length})
            </button>
            <button
              className={`student-quiet ${view === 'plans' ? 'student-primary' : ''}`}
              onClick={() => setView('plans')}
              type="button"
            >
              ★ Plany
            </button>
            <button className="student-quiet" onClick={onOpenCourse} type="button">
              Od zera do hakera ↗
            </button>
            <button className="student-quiet" onClick={onOpenProfile} type="button">
              👤 Profil
            </button>
          </div>
        </header>

        {statusMessage && (
          <div
            id="studentStatus"
            className={`student-status ${statusError ? 'error' : ''}`}
            role="status"
          >
            {statusMessage}
          </div>
        )}

        {/* VIEW: HOME DASHBOARD */}
        {view === 'home' && (
          <div>
            <div className="student-hero studeo-welcome">
              <span className="student-eyebrow">Studeo · niezbędnik studencki</span>
              <h1>
                Mniej chaosu.<br />
                Więcej zrozumienia.
              </h1>
              <p className="student-muted">
                Materiały, terminy i powtórki w jednej prywatnej przestrzeni. Dziś:{' '}
                {new Date().toLocaleDateString('pl-PL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                .
              </p>
              <div className="student-actions" style={{ marginTop: '20px' }}>
                <button
                  className="student-primary"
                  onClick={() => {
                    const due = dueCards(activeEntries);
                    if (due.length > 0) startReviewSession();
                    else setView('subjects');
                  }}
                  type="button"
                >
                  {dueCards(activeEntries).length > 0
                    ? `Zacznij powtórkę (${dueCards(activeEntries).length} fiszek) →`
                    : 'Otwórz moje przedmioty →'}
                </button>
                <button
                  className="student-quiet"
                  onClick={() => {
                    setEditorKind('subject');
                    setSelectedEntry(null);
                  }}
                  type="button"
                >
                  + Dodaj przedmiot
                </button>
              </div>
            </div>

            <div className="studeo-stats">
              <div>
                <strong>{activeSubjects.length}</strong>
                <span>Twoje przedmioty</span>
              </div>
              <div>
                <strong>{dueCards(activeEntries).length}</strong>
                <span>Fiszki do powtórki</span>
              </div>
              <div>
                <strong>{activeEntries.filter((e) => e.kind === 'task' && e.payload?.status !== 'done').length}</strong>
                <span>Otwarte zadania</span>
              </div>
            </div>

            {activeSubjects.length === 0 && (
              <section className="student-card" style={{ marginBottom: '24px' }}>
                <h2>Twój pierwszy krok</h2>
                <p>1. Dodaj przedmiot. 2. Wgraj materiał lub zapisz notatkę. 3. Ucz się z fiszek i ćwiczeń.</p>
                <button
                  className="student-primary"
                  onClick={() => {
                    setEditorKind('subject');
                    setSelectedEntry(null);
                  }}
                  type="button"
                >
                  Dodaj pierwszy przedmiot
                </button>
              </section>
            )}

            <div className="student-grid studeo-dashboard">
              <section>
                <h2>Najbliższe zadania</h2>
                {(() => {
                  const tasks = activeEntries
                    .filter((e) => e.kind === 'task' && e.payload?.status !== 'done')
                    .sort((a, b) => (a.payload?.due || '9999').localeCompare(b.payload?.due || '9999'))
                    .slice(0, 4);

                  if (!tasks.length) {
                    return (
                      <div className="student-empty">
                        Nie masz otwartych zadań. Dodaj termin kolokwium lub pracę do oddania.
                      </div>
                    );
                  }

                  return tasks.map((t) => (
                    <article key={t.id} className="student-item">
                      <span
                        className={
                          t.payload?.due && t.payload.due < dateKey(new Date())
                            ? 'student-overdue'
                            : 'student-muted'
                        }
                      >
                        {t.payload?.due || 'Bez terminu'}
                      </span>
                      <h3>{t.title}</h3>
                      <p>{subjects.find((s) => s.id === t.subject_id)?.title}</p>
                      <button
                        className="student-quiet"
                        onClick={() => {
                          setSelectedEntry(t);
                          setEditorKind('task');
                        }}
                        type="button"
                      >
                        Otwórz zadanie
                      </button>
                      <button
                        className="student-quiet"
                        onClick={() => openSubjectView(t.subject_id, 'tasks')}
                        type="button"
                      >
                        Przejdź do przedmiotu
                      </button>
                    </article>
                  ));
                })()}
                <button
                  className="student-quiet"
                  onClick={() => {
                    setSelectedEntry(null);
                    setEditorKind('task');
                  }}
                  type="button"
                  style={{ marginTop: '14px' }}
                >
                  + Dodaj zadanie
                </button>
              </section>

              <section>
                <h2>Dzisiejsze zajęcia</h2>
                {(() => {
                  const todayEvents = activeEntries
                    .filter((e) => e.kind === 'event' && occursOn(e, new Date()))
                    .sort((a, b) => (a.payload?.start || '').localeCompare(b.payload?.start || ''));

                  if (!todayEvents.length) {
                    return <div className="student-empty">Dziś bez zajęć w kalendarzu.</div>;
                  }

                  return todayEvents.map((ev) => (
                    <article key={ev.id} className="student-item">
                      <span className="student-pill">
                        {ev.payload?.start}–{ev.payload?.end}
                      </span>
                      <h3>{ev.title}</h3>
                      <p>
                        {ev.payload?.address} · sala {ev.payload?.room || '—'}
                      </p>
                      <button
                        className="student-quiet"
                        onClick={() => {
                          setSelectedEntry(ev);
                          setEditorKind('event');
                        }}
                        type="button"
                      >
                        Edytuj
                      </button>
                      <button
                        className="student-quiet"
                        onClick={() => openSubjectView(ev.subject_id, 'materials')}
                        type="button"
                      >
                        Materiały do nauki
                      </button>
                    </article>
                  ));
                })()}
                <button
                  className="student-quiet"
                  onClick={() => setView('calendar')}
                  type="button"
                  style={{ marginTop: '14px' }}
                >
                  Cały kalendarz
                </button>
              </section>
            </div>

            {/* Courses library */}
            <section className="studeo-library" style={{ marginTop: '30px' }}>
              <h2>Twoje kursy</h2>
              <p className="student-muted">
                Otwórz kurs i ucz się w swojej strefie nauki. Nowe materiały dodajesz w przedmiocie, a potem aktualizujesz jego kurs.
              </p>
              <div className="student-grid">
                <article className="student-card">
                  <span className="student-eyebrow">Biblioteka kursów</span>
                  <h2>Od zera do hakera</h2>
                  <p>34 lekcje · fiszki · testy · słownik</p>
                  <button className="student-primary" onClick={onOpenCourse} type="button">
                    Wejdź do kursu →
                  </button>
                </article>

                {activeSubjects.map((s) => {
                  const p = coursePlan(entries, s.id);
                  const lessons = p.current.flatMap((x) => x.deck.payload?.sections || []);
                  const done = p.current.reduce(
                    (n, x) =>
                      n + Object.keys(x.deck.payload?.lessonDone || {}).filter((i) => x.deck.payload?.sections?.[Number(i)]).length,
                    0
                  );

                  return (
                    <article key={s.id} className="student-card">
                      <span className="student-eyebrow">Twój prywatny kurs</span>
                      <h2>{s.title}</h2>
                      <p>
                        {lessons.length} lekcji · {p.current.length} modułów
                      </p>
                      <progress
                        max={Math.max(1, lessons.length)}
                        value={done}
                        aria-label={`Postęp kursu ${s.title}`}
                        style={{ width: '100%', margin: '10px 0' }}
                      />
                      <p className="student-muted" style={{ fontSize: '12px' }}>
                        {done} ukończonych lekcji
                        {p.pending.length ? ' · nowe materiały do opracowania' : ''}
                      </p>
                      <button
                        className="student-primary"
                        onClick={() => openSubjectView(s.id, 'course')}
                        type="button"
                      >
                        Wejdź do kursu →
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* VIEW: SUBJECTS LIST */}
        {view === 'subjects' && (
          <div>
            <div className="student-hero">
              <div className="student-eyebrow">Twoja prywatna biblioteka</div>
              <h1>Moje przedmioty</h1>
              <p className="student-muted">
                Twoje przedmioty, materiały i plan zajęć. Zawartość tego panelu widzisz tylko Ty, po zalogowaniu na swoje konto.
              </p>
              <button
                className="student-primary"
                onClick={() => {
                  setEditorKind('subject');
                  setSelectedEntry(null);
                }}
                type="button"
              >
                + Dodaj przedmiot
              </button>
            </div>

            <div className="student-grid">
              {activeSubjects.map((s) => {
                const count = activeEntries.filter((e) => e.subject_id === s.id).length;
                return (
                  <article key={s.id} className="student-card">
                    <div className="subject-dot" />
                    <span className="student-pill">{count} wpisów</span>
                    <h2>{s.title}</h2>
                    <p className="student-muted">Materiały · notatki · nauka</p>
                    <button
                      className="student-primary"
                      onClick={() => openSubjectView(s.id, 'materials')}
                      type="button"
                    >
                      Otwórz przedmiot →
                    </button>
                    <button
                      className="student-quiet"
                      onClick={() => openSubjectView(s.id, 'course')}
                      type="button"
                      style={{ marginLeft: '8px' }}
                    >
                      Mój kurs
                    </button>
                  </article>
                );
              })}
            </div>

            {activeSubjects.length === 0 && (
              <div className="student-empty" style={{ marginTop: '20px' }}>
                Zacznij od dodania swojego pierwszego przedmiotu. Każde nowe konto ma własną, pustą listę.
              </div>
            )}
          </div>
        )}

        {/* VIEW: SINGLE SUBJECT */}
        {view === 'subject' && currentSubject && (
          <div>
            <div className="student-hero">
              <div className="student-eyebrow">Twój przedmiot</div>
              <h1>{currentSubject.title}</h1>
              <div className="student-actions" style={{ marginTop: '12px' }}>
                <button
                  className="student-quiet"
                  onClick={() => {
                    setEditorKind('subject');
                    setSelectedEntry({ id: currentSubject.id, title: currentSubject.title } as any);
                  }}
                  type="button"
                >
                  Edytuj nazwę
                </button>
                <button
                  className="student-quiet"
                  onClick={() => handlePrintSubject(currentSubject)}
                  type="button"
                >
                  Eksport do druku / PDF
                </button>
                <button
                  className="student-quiet"
                  onClick={async () => {
                    if (confirm(`Zarchiwizować przedmiot „${currentSubject.title}”?`)) {
                      await onSaveSubject({ ...currentSubject, archived: true });
                      setView('subjects');
                    }
                  }}
                  type="button"
                >
                  Archiwizuj przedmiot
                </button>
              </div>
            </div>

            <nav className="student-nav">
              {(
                [
                  ['course', 'Mój kurs'],
                  ['materials', 'Materiały'],
                  ['notes', 'Notatki'],
                  ['study', 'Nauka'],
                  ['events', 'Zajęcia'],
                  ['tasks', 'Do zrobienia'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-current={tab === id ? 'page' : 'false'}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* TAB: COURSE */}
            {tab === 'course' && (
              <div>
                {(() => {
                  const plan = coursePlan(entries, currentSubject.id);
                  const sources = courseSources(entries, currentSubject.id);
                  const lessonCount = plan.current.reduce(
                    (n, x) => n + (x.deck.payload?.sections || []).length,
                    0
                  );
                  const done = plan.current.reduce(
                    (n, x) =>
                      n +
                      Object.keys(x.deck.payload?.lessonDone || {}).filter(
                        (i) => x.deck.payload?.sections?.[Number(i)]
                      ).length,
                    0
                  );

                  return (
                    <>
                      <section className="student-card course-builder">
                        <h2>{plan.current.length ? 'Aktualizuj swój kurs' : 'Zbuduj swój kurs'}</h2>
                        <p>
                          {sources.length} materiałów i notatek · {plan.current.length} opracowanych modułów ·{' '}
                          {plan.pending.length} części czeka na opracowanie.
                        </p>
                        <p className="student-muted">
                          Lekcje i pytania powstają z Twoich materiałów ze wskazaniem źródła. Długie prezentacje PDF dzielimy na mniejsze moduły.
                        </p>

                        <div className="student-actions" style={{ marginTop: '16px' }}>
                          {plan.pending.length > 0 && (
                            <button
                              className="student-primary"
                              onClick={handleBuildCourse}
                              disabled={buildingCourse}
                              type="button"
                            >
                              {buildingCourse
                                ? 'Przetwarzanie…'
                                : plan.current.length
                                ? 'Zaktualizuj kurs'
                                : 'Utwórz kurs z moich materiałów'}
                            </button>
                          )}
                          <button
                            className="student-quiet"
                            onClick={() => {
                              setSelectedEntry(null);
                              setEditorKind('material');
                            }}
                            type="button"
                          >
                            + Dodaj materiał
                          </button>
                        </div>
                      </section>

                      <div className="course-outline">
                        {plan.current.map(({ job, deck }, idx) => (
                          <section key={deck.id} className="student-card course-module">
                            <span className="student-eyebrow">
                              Moduł {idx + 1}
                              {job.parts > 1 ? ` · część ${job.part}/${job.parts}` : ''}
                            </span>
                            <h2>{job.source.title}</h2>
                            <ol className="course-lessons">
                              {(deck.payload?.sections || []).map((l, sIdx) => {
                                const isLessonDone = Boolean(deck.payload?.lessonDone?.[sIdx]);
                                return (
                                  <li key={sIdx}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReadingDeckId(deck.id);
                                        setCourseLessonIndex(sIdx);
                                      }}
                                    >
                                      <span>{isLessonDone ? '✓' : '○'}</span>{' '}
                                      {l.title || `Lekcja ${sIdx + 1}`}
                                    </button>
                                  </li>
                                );
                              })}
                            </ol>
                            <div className="student-actions">
                              <button
                                className="student-quiet"
                                onClick={() => {
                                  setSelectedEntry(deck);
                                  setEditorKind('deck-view');
                                }}
                                type="button"
                              >
                                Fiszki i ćwiczenie modułu ({deck.payload?.cards?.length || 0})
                              </button>
                            </div>
                          </section>
                        ))}
                      </div>

                      {lessonCount > 0 && (
                        <section className="student-card studeo-library" style={{ marginTop: '24px' }}>
                          <h2>Test całego przedmiotu</h2>
                          <p>
                            Losowe pytania ze wszystkich opracowanych modułów. Wybierz wszystkie poprawne odpowiedzi.
                          </p>
                          <div className="student-actions">
                            {[10, 20, 30].map((n) => (
                              <button
                                key={n}
                                className="student-quiet"
                                onClick={() => msg(`Rozpoczęto test ${n} pytań dla przedmiotu ${currentSubject.title}`)}
                                type="button"
                              >
                                {n} pytań
                              </button>
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* TAB: MATERIALS */}
            {tab === 'materials' && (
              <div>
                <div className="student-actions" style={{ marginBottom: '20px' }}>
                  <button
                    className="student-primary"
                    onClick={() => {
                      setSelectedEntry(null);
                      setEditorKind('material');
                    }}
                    type="button"
                  >
                    + Dodaj plik lub tekst
                  </button>
                </div>

                <div className="student-list">
                  {activeEntries
                    .filter((e) => e.subject_id === currentSubject.id && e.kind === 'material')
                    .map((item) => (
                      <article key={item.id} className="student-item">
                        <span className="student-pill">{currentSubject.title}</span>
                        <h3>{item.title}</h3>
                        <p className="student-muted">
                          {item.payload?.pages?.length || 0} stron ·{' '}
                          {new Date(item.created_at || Date.now()).toLocaleDateString('pl-PL')}
                        </p>
                        <button
                          className="student-quiet"
                          onClick={() => {
                            setSelectedEntry(item);
                            setEditorKind('material-view');
                          }}
                          type="button"
                        >
                          Otwórz materiał
                        </button>
                        <button
                          className="student-quiet"
                          onClick={async () => {
                            if (confirm(`Zarchiwizować „${item.title}”?`)) {
                              await onSaveEntry({ ...item, archived: true });
                            }
                          }}
                          type="button"
                        >
                          Archiwizuj
                        </button>
                      </article>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: NOTES */}
            {tab === 'notes' && (
              <div>
                <div className="student-actions" style={{ marginBottom: '20px' }}>
                  <button
                    className="student-primary"
                    onClick={() => {
                      setSelectedEntry(null);
                      setEditorKind('note');
                    }}
                    type="button"
                  >
                    + Nowa notatka
                  </button>
                  <button
                    className="student-quiet"
                    onClick={() => {
                      setSelectedEntry(null);
                      setEditorKind('audio');
                    }}
                    type="button"
                  >
                    ● Notatka głosowa
                  </button>
                </div>

                <div className="student-list">
                  {activeEntries
                    .filter(
                      (e) =>
                        e.subject_id === currentSubject.id && (e.kind === 'note' || e.kind === 'audio')
                    )
                    .map((item) => (
                      <article key={item.id} className="student-item">
                        <span className="student-pill">{item.kind === 'audio' ? 'Głosowa' : 'Notatka'}</span>
                        <h3>{item.title}</h3>
                        <p className="student-pre" style={{ maxHeight: '100px', overflow: 'hidden' }}>
                          {item.payload?.text?.slice(0, 200)}
                        </p>
                        <button
                          className="student-quiet"
                          onClick={() => {
                            setSelectedEntry(item);
                            setEditorKind(item.kind);
                          }}
                          type="button"
                        >
                          Edytuj
                        </button>
                      </article>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: STUDY (DECKS) */}
            {tab === 'study' && (
              <div>
                <div className="student-actions" style={{ marginBottom: '20px' }}>
                  <button
                    className="student-primary"
                    onClick={() => {
                      setSelectedEntry(null);
                      setEditorKind('deck');
                    }}
                    type="button"
                  >
                    + Własne fiszki
                  </button>
                  <button
                    className="student-quiet"
                    onClick={() => startReviewSession(currentSubject.id)}
                    type="button"
                  >
                    Powtórz ten przedmiot
                  </button>
                </div>

                <div className="student-list">
                  {activeEntries
                    .filter((e) => e.subject_id === currentSubject.id && e.kind === 'deck')
                    .map((item) => (
                      <article key={item.id} className="student-item">
                        <span className="student-pill">Fiszki</span>
                        <h3>{item.title}</h3>
                        <p className="student-muted">
                          {(item.payload?.cards || []).length} fiszek
                        </p>
                        <button
                          className="student-quiet"
                          onClick={() => {
                            setSelectedEntry(item);
                            setEditorKind('deck-view');
                          }}
                          type="button"
                        >
                          Ćwicz zestaw
                        </button>
                      </article>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: EVENTS */}
            {tab === 'events' && (
              <div>
                <div className="student-actions" style={{ marginBottom: '20px' }}>
                  <button
                    className="student-primary"
                    onClick={() => {
                      setSelectedEntry(null);
                      setEditorKind('event');
                    }}
                    type="button"
                  >
                    + Dodaj zajęcia
                  </button>
                </div>

                <div className="student-list">
                  {activeEntries
                    .filter((e) => e.subject_id === currentSubject.id && e.kind === 'event')
                    .map((item) => (
                      <article key={item.id} className="student-item">
                        <span className="student-pill">
                          {item.payload?.start}–{item.payload?.end}{' '}
                          {item.payload?.weekly ? '· co tydzień' : ''}
                        </span>
                        <h3>{item.title}</h3>
                        <p className="student-muted">
                          Sala {item.payload?.room || '—'} · bud. {item.payload?.building || '—'} · {item.payload?.address}
                        </p>
                        <button
                          className="student-quiet"
                          onClick={() => {
                            setSelectedEntry(item);
                            setEditorKind('event');
                          }}
                          type="button"
                        >
                          Edytuj
                        </button>
                      </article>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: TASKS */}
            {tab === 'tasks' && (
              <div>
                <div className="student-actions" style={{ marginBottom: '20px' }}>
                  <button
                    className="student-primary"
                    onClick={() => {
                      setSelectedEntry(null);
                      setEditorKind('task');
                    }}
                    type="button"
                  >
                    + Dodaj zadanie
                  </button>
                </div>

                <div className="student-task-board">
                  {(['todo', 'doing', 'done'] as const).map((status) => {
                    const label = status === 'todo' ? 'Do zrobienia' : status === 'doing' ? 'W trakcie' : 'Gotowe';
                    const list = activeEntries.filter(
                      (e) => e.subject_id === currentSubject.id && e.kind === 'task' && (e.payload?.status || 'todo') === status
                    );

                    return (
                      <section key={status} className="student-task-column">
                        <h2>
                          {label} <span className="student-pill">{list.length}</span>
                        </h2>
                        {list.map((task) => (
                          <article key={task.id} className="student-item">
                            <h3>{task.title}</h3>
                            {task.payload?.due && (
                              <p className={status !== 'done' && task.payload.due < dateKey(new Date()) ? 'student-overdue' : 'student-muted'}>
                                Termin: {task.payload.due}
                              </p>
                            )}
                            <p className="student-pre">{task.payload?.description?.slice(0, 150)}</p>
                            <div className="student-actions" style={{ marginTop: '10px' }}>
                              <button
                                className="student-quiet"
                                onClick={() => {
                                  setSelectedEntry(task);
                                  setEditorKind('task');
                                }}
                                type="button"
                              >
                                Edytuj
                              </button>
                              {(['todo', 'doing', 'done'] as const)
                                .filter((s) => s !== status)
                                .map((targetStatus) => (
                                  <button
                                    key={targetStatus}
                                    className="student-quiet"
                                    onClick={async () => {
                                      const updatedPayload = { ...task.payload, status: targetStatus };
                                      await onSaveEntry({
                                        ...task,
                                        payload: targetStatus === 'done' ? completeTask(updatedPayload) : updatedPayload,
                                      });
                                    }}
                                    type="button"
                                  >
                                    → {targetStatus === 'todo' ? 'Do zrobienia' : targetStatus === 'doing' ? 'W trakcie' : 'Gotowe'}
                                  </button>
                                ))}
                            </div>
                          </article>
                        ))}
                      </section>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: WEEKLY CALENDAR */}
        {view === 'calendar' && (
          <div>
            <div className="student-hero">
              <span className="student-eyebrow">Plan zajęć · czas lokalny uczelni</span>
              <h1>Twój tydzień</h1>
              <p className="student-muted">
                {weekDays[0].toLocaleDateString('pl-PL')} – {weekDays[6].toLocaleDateString('pl-PL')} · Europe/Warsaw
              </p>
              <div className="student-actions" style={{ marginTop: '16px' }}>
                <button
                  className="student-quiet"
                  onClick={() => {
                    const prev = new Date(weekDate);
                    prev.setDate(prev.getDate() - 7);
                    setWeekDate(prev);
                  }}
                  type="button"
                >
                  ← Poprzedni
                </button>
                <button
                  className="student-quiet"
                  onClick={() => setWeekDate(new Date())}
                  type="button"
                >
                  Dzisiaj
                </button>
                <button
                  className="student-quiet"
                  onClick={() => {
                    const next = new Date(weekDate);
                    next.setDate(next.getDate() + 7);
                    setWeekDate(next);
                  }}
                  type="button"
                >
                  Następny →
                </button>
                <button
                  className="student-primary"
                  onClick={() => {
                    setSelectedEntry(null);
                    setEditorKind('event');
                  }}
                  type="button"
                >
                  + Zajęcia
                </button>
              </div>
            </div>

            <div className="student-week">
              {weekDays.map((d, dIdx) => {
                const dayKey = dateKey(d);
                const dayEvents = activeEntries
                  .filter((e) => e.kind === 'event' && occursOn(e, d))
                  .sort((a, b) => (a.payload?.start || '').localeCompare(b.payload?.start || ''));
                const dayTasks = activeEntries.filter(
                  (e) => e.kind === 'task' && e.payload?.status !== 'done' && e.payload?.due === dayKey
                );

                return (
                  <section key={dIdx} className="student-day">
                    <h3>
                      {d.toLocaleDateString('pl-PL', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'numeric',
                      })}
                    </h3>

                    {dayEvents.map((ev) => (
                      <article key={ev.id} className="student-event">
                        <b>
                          {ev.payload?.start}–{ev.payload?.end}
                        </b>
                        <strong>{subjects.find((s) => s.id === ev.subject_id)?.title}</strong>
                        {ev.title}
                        <br />
                        Sala {ev.payload?.room || '—'} · bud. {ev.payload?.building || '—'}
                      </article>
                    ))}

                    {dayTasks.map((t) => (
                      <article key={t.id} className="student-event" style={{ borderLeftColor: '#ffa8b5' }}>
                        <span className="student-pill">Termin zadania</span>
                        <strong>{t.title}</strong>
                      </article>
                    ))}

                    {!dayEvents.length && !dayTasks.length && (
                      <span className="student-muted" style={{ fontSize: '12px' }}>
                        Bez zajęć
                      </span>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: ALL TASKS */}
        {view === 'tasks' && (
          <div>
            <div className="student-hero">
              <span className="student-eyebrow">Krok po kroku, bez chaosu</span>
              <h1>Do zrobienia</h1>
              <p className="student-muted">
                Wszystkie Twoje zadania z terminami, notatkami i plikami w jednym widoku Kanban.
              </p>
              <button
                className="student-primary"
                onClick={() => {
                  setSelectedEntry(null);
                  setEditorKind('task');
                }}
                type="button"
                style={{ marginTop: '14px' }}
              >
                + Dodaj zadanie
              </button>
            </div>

            <div className="student-task-board">
              {(['todo', 'doing', 'done'] as const).map((status) => {
                const label = status === 'todo' ? 'Do zrobienia' : status === 'doing' ? 'W trakcie' : 'Gotowe';
                const tasks = activeEntries
                  .filter((e) => e.kind === 'task' && (e.payload?.status || 'todo') === status)
                  .sort((a, b) => (a.payload?.due || '9999').localeCompare(b.payload?.due || '9999'));

                return (
                  <section key={status} className="student-task-column">
                    <h2>
                      {label} <span className="student-pill">{tasks.length}</span>
                    </h2>
                    {tasks.map((task) => (
                      <article key={task.id} className="student-item">
                        <span className="student-pill">
                          {subjects.find((s) => s.id === task.subject_id)?.title}
                        </span>
                        <h3>{task.title}</h3>
                        {task.payload?.due && (
                          <p
                            className={
                              status !== 'done' && task.payload.due < dateKey(new Date())
                                ? 'student-overdue'
                                : 'student-muted'
                            }
                          >
                            Termin: {task.payload.due}
                          </p>
                        )}
                        <p className="student-pre">{task.payload?.description?.slice(0, 140)}</p>
                        <div className="student-actions" style={{ marginTop: '10px' }}>
                          <button
                            className="student-quiet"
                            onClick={() => {
                              setSelectedEntry(task);
                              setEditorKind('task');
                            }}
                            type="button"
                          >
                            Otwórz / notatki
                          </button>
                          {(['todo', 'doing', 'done'] as const)
                            .filter((s) => s !== status)
                            .map((tStatus) => (
                              <button
                                key={tStatus}
                                className="student-quiet"
                                onClick={async () => {
                                  const updated = { ...task.payload, status: tStatus };
                                  await onSaveEntry({
                                    ...task,
                                    payload: tStatus === 'done' ? completeTask(updated) : updated,
                                  });
                                }}
                                type="button"
                              >
                                → {tStatus === 'todo' ? 'Do zrobienia' : tStatus === 'doing' ? 'W trakcie' : 'Gotowe'}
                              </button>
                            ))}
                        </div>
                      </article>
                    ))}
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: REVIEW SRS */}
        {view === 'review' && activeReviewCards.length > 0 && (
          <div style={{ maxWidth: '700px', margin: 'auto' }}>
            <div className="student-hero">
              <span className="student-eyebrow">Powtórki w odstępach</span>
              <h1>
                Fiszka {reviewIndex + 1} z {activeReviewCards.length}
              </h1>
              <p className="student-muted">
                Oceń znajomość fiszki: „Jeszcze raz” wróci za 10 minut, „Dobra” za 3 dni, „Łatwa” za 7 dni.
              </p>
            </div>

            {(() => {
              const cur = activeReviewCards[reviewIndex];
              return (
                <div className="student-card" style={{ padding: '30px', textAlign: 'center' }}>
                  <div className="student-eyebrow">
                    {subjects.find((s) => s.id === cur.deck.subject_id)?.title} · {cur.deck.title}
                  </div>
                  <div
                    className="student-flash"
                    onClick={() => setReviewFlipped(!reviewFlipped)}
                    style={{ cursor: 'pointer', minHeight: '140px', display: 'grid', placeItems: 'center' }}
                  >
                    <h2>{reviewFlipped ? cur.card.back : cur.card.front}</h2>
                  </div>

                  <p className="student-muted" style={{ fontSize: '13px' }}>
                    {reviewFlipped ? 'Odpowiedź' : 'Kliknij, aby odwrócić fiszkę'}
                  </p>

                  <div className="student-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
                    <button
                      className="student-quiet"
                      onClick={() => handleReviewGrade('again')}
                      type="button"
                    >
                      Jeszcze raz (10 min)
                    </button>
                    <button
                      className="student-quiet"
                      onClick={() => handleReviewGrade('hard')}
                      type="button"
                    >
                      Trudna (1 dzień)
                    </button>
                    <button
                      className="student-primary"
                      onClick={() => handleReviewGrade('good')}
                      type="button"
                    >
                      Dobra (3 dni)
                    </button>
                    <button
                      className="student-primary"
                      onClick={() => handleReviewGrade('easy')}
                      type="button"
                    >
                      Łatwa (7 dni)
                    </button>
                  </div>
                </div>
              );
            })()}

            <button
              className="student-quiet"
              onClick={() => setView('home')}
              type="button"
              style={{ marginTop: '20px' }}
            >
              ← Zakończ powtórki
            </button>
          </div>
        )}

        {/* VIEW: PLANS */}
        {view === 'plans' && (
          <div>
            <div className="student-hero">
              <h1>Basic i Premium</h1>
              <p>
                Twój plan: <strong>{plan.name}</strong>
              </p>
              <p>W czasie bety wszystkie obecne i nowe konta otrzymują Premium bez opłat.</p>
            </div>

            <div className="student-grid">
              <article className="student-card">
                <h2>Basic</h2>
                <p>5 GB na pliki · 5 użyć AI dziennie.</p>
                <p>Przedmioty, kursy, fiszki, zadania, notatki i kalendarz.</p>
              </article>
              <article className="student-card">
                <h2>Premium</h2>
                <p>20 GB na pliki · 100 użyć AI dziennie.</p>
                <p>Obecnie bezpłatne w becie. Cena i płatności pojawią się przed uruchomieniem sprzedaży.</p>
                <button disabled type="button">
                  Zakup Premium — wkrótce
                </button>
              </article>
            </div>

            <section className="student-card" style={{ marginTop: '24px' }}>
              <h2>Twoje zużycie i dane</h2>
              <p>
                W Profilu sprawdzisz zajęte miejsce, dzienne użycie AI i przesłane pliki. Maksymalnie 20 MB na plik.
              </p>
              <button className="student-primary" onClick={onOpenProfile} type="button">
                Otwórz mój profil
              </button>
            </section>
          </div>
        )}

        {/* MODAL / FORM: EDITORS */}
        {editorKind === 'subject' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#090a12dd',
              zIndex: 90,
              display: 'grid',
              placeItems: 'center',
              padding: '20px',
            }}
          >
            <div className="student-card" style={{ maxWidth: '500px', width: '100%' }}>
              <h2>{selectedEntry ? 'Edytuj przedmiot' : 'Nowy przedmiot'}</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = String(fd.get('title') || '').trim();
                  if (!title) return;
                  await onSaveSubject({
                    id: selectedEntry?.id,
                    title,
                  });
                  setEditorKind(null);
                  msg('Zapisano przedmiot!');
                }}
              >
                <label style={{ display: 'grid', gap: '8px', margin: '14px 0' }}>
                  Nazwa przedmiotu
                  <input
                    name="title"
                    defaultValue={selectedEntry?.title || ''}
                    required
                    maxLength={120}
                    placeholder="np. Bezpieczeństwo IT, Matematyka dyskretna..."
                  />
                </label>
                <div className="student-actions">
                  <button className="student-primary" type="submit">
                    Zapisz
                  </button>
                  <button
                    className="student-quiet"
                    type="button"
                    onClick={() => setEditorKind(null)}
                  >
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editorKind === 'material' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#090a12dd',
              zIndex: 90,
              display: 'grid',
              placeItems: 'center',
              padding: '20px',
            }}
          >
            <div className="student-card" style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2>Nowy materiał do nauki</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  const title = String(fd.get('title') || '').trim();
                  const text = String(fd.get('text') || '').trim();
                  const fileInput = form.querySelector('input[type=file]') as HTMLInputElement;
                  const file = fileInput?.files?.[0];

                  let pages: any[] = [];
                  if (file) {
                    pages = await readMaterial(file);
                  } else if (text) {
                    pages = [{ page: 1, text }];
                  }

                  if (!pages.length && !text) {
                    msg('Wgraj plik (PDF/TXT/MD) lub wklej tekst.', true);
                    return;
                  }

                  await onSaveEntry({
                    subject_id: currentSubject?.id || activeSubjects[0]?.id,
                    kind: 'material',
                    title: title || file?.name || 'Materiały do wykładu',
                    payload: {
                      text,
                      fileName: file?.name,
                      pages,
                    },
                  });

                  setEditorKind(null);
                  msg('Zapisano materiał!');
                }}
              >
                <label style={{ display: 'grid', gap: '8px', margin: '12px 0' }}>
                  Tytuł materiału
                  <input name="title" placeholder="np. Wykład 1: Wprowadzenie" required />
                </label>
                <label style={{ display: 'grid', gap: '8px', margin: '12px 0' }}>
                  Plik (PDF, TXT, MD)
                  <input type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg" />
                </label>
                <label style={{ display: 'grid', gap: '8px', margin: '12px 0' }}>
                  Lub wklej treść
                  <textarea name="text" placeholder="Wklej notatki lub fragment wykładu..." style={{ minHeight: '120px' }} />
                </label>

                <div className="student-actions" style={{ marginTop: '16px' }}>
                  <button className="student-primary" type="submit">
                    Zapisz materiał
                  </button>
                  <button className="student-quiet" type="button" onClick={() => setEditorKind(null)}>
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editorKind === 'task' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#090a12dd',
              zIndex: 90,
              display: 'grid',
              placeItems: 'center',
              padding: '20px',
            }}
          >
            <div className="student-card" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2>{selectedEntry ? 'Edytuj zadanie' : 'Nowe zadanie'}</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = String(fd.get('title') || '').trim();
                  const description = String(fd.get('description') || '').trim();
                  const workNotes = String(fd.get('workNotes') || '').trim();
                  const due = String(fd.get('due') || '');
                  const status = (fd.get('status') || 'todo') as any;
                  const repeat = (fd.get('repeat') || 'none') as any;
                  const subId = String(fd.get('subject_id') || currentSubject?.id || activeSubjects[0]?.id);

                  await onSaveEntry({
                    id: selectedEntry?.id,
                    subject_id: subId,
                    kind: 'task',
                    title,
                    payload: {
                      ...(selectedEntry?.payload || {}),
                      title,
                      description,
                      workNotes,
                      workNotesUpdatedAt: workNotes ? new Date().toISOString() : null,
                      due,
                      status,
                      repeat,
                    },
                  });

                  setEditorKind(null);
                  msg('Zapisano zadanie!');
                }}
              >
                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Przedmiot
                  <select name="subject_id" defaultValue={selectedEntry?.subject_id || currentSubject?.id}>
                    {activeSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Tytuł zadania
                  <input name="title" defaultValue={selectedEntry?.title || ''} required placeholder="np. Raport z lab 2" />
                </label>

                <div className="student-row">
                  <label>
                    Status
                    <select name="status" defaultValue={selectedEntry?.payload?.status || 'todo'}>
                      <option value="todo">Do zrobienia</option>
                      <option value="doing">W trakcie</option>
                      <option value="done">Gotowe</option>
                    </select>
                  </label>
                  <label>
                    Termin (opcjonalnie)
                    <input name="due" type="date" defaultValue={selectedEntry?.payload?.due || ''} />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Powtarzanie
                  <select name="repeat" defaultValue={selectedEntry?.payload?.repeat || 'none'}>
                    <option value="none">Nie powtarzaj</option>
                    <option value="daily">Codziennie</option>
                    <option value="weekly">Co tydzień</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Polecenie zadania
                  <textarea name="description" defaultValue={selectedEntry?.payload?.description || ''} placeholder="Co trzeba przygotować..." />
                </label>

                <div className="student-workspace" style={{ marginTop: '16px' }}>
                  <h2>Moje notatki i rozwiązanie</h2>
                  <textarea
                    name="workNotes"
                    className="student-work-notes"
                    defaultValue={selectedEntry?.payload?.workNotes || ''}
                    placeholder="Pisz odpowiedź, kolejne kroki i obserwacje..."
                  />
                </div>

                <div className="student-actions" style={{ marginTop: '16px' }}>
                  <button className="student-primary" type="submit">
                    Zapisz zadanie
                  </button>
                  <button className="student-quiet" type="button" onClick={() => setEditorKind(null)}>
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editorKind === 'note' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#090a12dd',
              zIndex: 90,
              display: 'grid',
              placeItems: 'center',
              padding: '20px',
            }}
          >
            <div className="student-card" style={{ maxWidth: '650px', width: '100%' }}>
              <h2>{selectedEntry ? 'Edytuj notatkę' : 'Nowa notatka'}</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = String(fd.get('title') || '').trim();
                  const text = String(fd.get('text') || '').trim();
                  const subId = String(fd.get('subject_id') || currentSubject?.id || activeSubjects[0]?.id);

                  await onSaveEntry({
                    id: selectedEntry?.id,
                    subject_id: subId,
                    kind: 'note',
                    title,
                    payload: { text },
                  });

                  setEditorKind(null);
                  msg('Zapisano notatkę!');
                }}
              >
                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Przedmiot
                  <select name="subject_id" defaultValue={selectedEntry?.subject_id || currentSubject?.id}>
                    {activeSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Tytuł
                  <input name="title" defaultValue={selectedEntry?.title || ''} required placeholder="np. Notatka z wykładu" />
                </label>
                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Treść
                  <textarea name="text" defaultValue={selectedEntry?.payload?.text || ''} required style={{ minHeight: '160px' }} />
                </label>
                <div className="student-actions" style={{ marginTop: '16px' }}>
                  <button className="student-primary" type="submit">
                    Zapisz
                  </button>
                  <button className="student-quiet" type="button" onClick={() => setEditorKind(null)}>
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editorKind === 'deck' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#090a12dd',
              zIndex: 90,
              display: 'grid',
              placeItems: 'center',
              padding: '20px',
            }}
          >
            <div className="student-card" style={{ maxWidth: '650px', width: '100%' }}>
              <h2>Nowy zestaw fiszek</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = String(fd.get('title') || '').trim();
                  const cardsRaw = String(fd.get('cards') || '').trim();
                  const subId = String(fd.get('subject_id') || currentSubject?.id || activeSubjects[0]?.id);

                  try {
                    const cards = parseManualCards(cardsRaw);
                    await onSaveEntry({
                      subject_id: subId,
                      kind: 'deck',
                      title,
                      payload: { cards },
                    });
                    setEditorKind(null);
                    msg(`Zapisano zestaw z ${cards.length} fiszkami!`);
                  } catch (err: any) {
                    msg(err.message, true);
                  }
                }}
              >
                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Przedmiot
                  <select name="subject_id" defaultValue={currentSubject?.id || activeSubjects[0]?.id}>
                    {activeSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Tytuł zestawu
                  <input name="title" required placeholder="np. Pojęcia kluczowe" />
                </label>
                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Fiszki (jedna w wierszu: pytanie | odpowiedź)
                  <textarea
                    name="cards"
                    required
                    style={{ minHeight: '160px' }}
                    placeholder={`Co oznacza CIA? | Poufność, integralność, dostępność\nCo to jest EDR? | Endpoint Detection and Response`}
                  />
                </label>
                <div className="student-actions" style={{ marginTop: '16px' }}>
                  <button className="student-primary" type="submit">
                    Utwórz zestaw fiszek
                  </button>
                  <button className="student-quiet" type="button" onClick={() => setEditorKind(null)}>
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editorKind === 'event' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#090a12dd',
              zIndex: 90,
              display: 'grid',
              placeItems: 'center',
              padding: '20px',
            }}
          >
            <div className="student-card" style={{ maxWidth: '650px', width: '100%' }}>
              <h2>{selectedEntry ? 'Edytuj zajęcia' : 'Nowe zajęcia w kalendarzu'}</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = String(fd.get('title') || '').trim();
                  const subId = String(fd.get('subject_id') || currentSubject?.id || activeSubjects[0]?.id);
                  const date = String(fd.get('date') || dateKey(new Date()));
                  const start = String(fd.get('start') || '09:00');
                  const end = String(fd.get('end') || '10:30');
                  const weekly = fd.get('weekly') === 'on';
                  const room = String(fd.get('room') || '');
                  const building = String(fd.get('building') || '');
                  const address = String(fd.get('address') || '');

                  await onSaveEntry({
                    id: selectedEntry?.id,
                    subject_id: subId,
                    kind: 'event',
                    title,
                    payload: {
                      date,
                      start,
                      end,
                      weekly,
                      room,
                      building,
                      address,
                    },
                  });

                  setEditorKind(null);
                  msg('Zapisano zajęcia w kalendarzu!');
                }}
              >
                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Przedmiot
                  <select name="subject_id" defaultValue={selectedEntry?.subject_id || currentSubject?.id}>
                    {activeSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '8px', margin: '10px 0' }}>
                  Nazwa zajęć
                  <input name="title" defaultValue={selectedEntry?.title || ''} required placeholder="np. Wykład / Laboratorium" />
                </label>

                <div className="student-row">
                  <label>
                    Dzień pierwszych zajęć
                    <input name="date" type="date" defaultValue={selectedEntry?.payload?.date || dateKey(new Date())} required />
                  </label>
                  <label>
                    Powtarzaj co tydzień
                    <input
                      name="weekly"
                      type="checkbox"
                      defaultChecked={selectedEntry?.payload?.weekly ?? true}
                      style={{ width: '20px', marginTop: '10px' }}
                    />
                  </label>
                </div>

                <div className="student-row">
                  <label>
                    Godzina od
                    <input name="start" type="time" defaultValue={selectedEntry?.payload?.start || '09:00'} required />
                  </label>
                  <label>
                    Godzina do
                    <input name="end" type="time" defaultValue={selectedEntry?.payload?.end || '10:30'} required />
                  </label>
                </div>

                <div className="student-row">
                  <label>
                    Sala
                    <input name="room" defaultValue={selectedEntry?.payload?.room || ''} placeholder="np. 204" />
                  </label>
                  <label>
                    Budynek
                    <input name="building" defaultValue={selectedEntry?.payload?.building || ''} placeholder="np. C-13" />
                  </label>
                </div>

                <div className="student-actions" style={{ marginTop: '16px' }}>
                  <button className="student-primary" type="submit">
                    Zapisz
                  </button>
                  <button className="student-quiet" type="button" onClick={() => setEditorKind(null)}>
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editorKind === 'audio' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#090a12dd',
              zIndex: 90,
              display: 'grid',
              placeItems: 'center',
              padding: '20px',
            }}
          >
            <div className="student-card" style={{ maxWidth: '600px', width: '100%' }}>
              <h2>Notatka głosowa</h2>
              <p className="student-muted">
                Nagraj własną notatkę z zajęć (do 5 minut). Mikrofon działa po udzieleniu zgody w przeglądarce.
              </p>

              <div className="student-actions" style={{ margin: '16px 0' }}>
                {!isRecording ? (
                  <button className="student-primary" onClick={startAudioRecording} type="button">
                    ● Rozpocznij nagrywanie
                  </button>
                ) : (
                  <button className="student-quiet" onClick={stopAudioRecording} type="button" style={{ background: '#ffa8b5', color: '#111' }}>
                    ■ Zatrzymaj
                  </button>
                )}
              </div>

              {recordedAudioURL && (
                <div style={{ margin: '16px 0' }}>
                  <audio controls src={recordedAudioURL} style={{ width: '100%' }} />
                </div>
              )}

              <div className="student-actions" style={{ marginTop: '20px' }}>
                <button
                  className="student-primary"
                  disabled={!recordedBlob}
                  onClick={async () => {
                    await onSaveEntry({
                      subject_id: currentSubject?.id || activeSubjects[0]?.id,
                      kind: 'audio',
                      title: `Notatka głosowa ${new Date().toLocaleDateString('pl-PL')}`,
                      payload: { text: 'Nagranie audio z zajęć.' },
                    });
                    setEditorKind(null);
                    msg('Zapisano nagranie!');
                  }}
                  type="button"
                >
                  Zapisz notatkę
                </button>
                <button className="student-quiet" onClick={() => setEditorKind(null)} type="button">
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
