import React, { useEffect, useRef, useState } from 'react';
import type { ProgressState, ExamAnswer, QuizQuestion } from '../types';
import { LESSONS, GLOSSARY, LECTURE_MULTI, SECURITY_PLUS, pickSecurityQuestions } from '../data/courseData';
import { restoreCourseSession, serializeCourseSession, type CourseSessionState } from '../course-session';
import { CourseHeader } from './CourseHeader';
import { CourseSidebar, type CourseView } from './CourseSidebar';
import { LessonCard } from './LessonCard';
import '../course.css';

interface CourseAppProps {
  progress: ProgressState;
  onUpdateProgress: (progress: ProgressState) => void;
  onOpenStudentPortal: () => void;
  onOpenProfile: () => void;
  syncStatus: string;
  onExportProgress: () => void;
  showToast: (msg: string) => void;
  initialSnapshot: Record<string, any>;
  onStateChange: (snapshot: CourseSessionState) => void;
}

export const CourseApp: React.FC<CourseAppProps> = ({
  progress,
  onUpdateProgress,
  onOpenStudentPortal,
  onOpenProfile,
  syncStatus,
  onExportProgress,
  showToast,
  initialSnapshot,
  onStateChange,
}) => {
  const [restoredSession] = useState(() => restoreCourseSession(initialSnapshot, progress));
  const [view, setView] = useState<CourseView>(restoredSession.examActive ? 'exam-active' : 'home');
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<number>(0);
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [hashInput, setHashInput] = useState('Przelej 100 zł');

  // Flashcards state
  const [flashIndex, setFlashIndex] = useState(restoredSession.flashIndex);
  const [flashReveal, setFlashReveal] = useState(false);

  // Lesson quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>(restoredSession.quiz.answers);
  const [quizShown, setQuizShown] = useState<Record<string, boolean>>(restoredSession.quiz.shown);

  // Exam state
  const [examType, setExamType] = useState(restoredSession.examType);
  const [examQs, setExamQs] = useState<QuizQuestion[]>(restoredSession.examQuestions);
  const [examIndex, setExamIndex] = useState(restoredSession.examIndex);
  const [examAnswers, setExamAnswers] = useState<ExamAnswer[]>(restoredSession.examAnswers);
  const [examHistory, setExamHistory] = useState<any[]>(restoredSession.history);
  const [latestScore, setLatestScore] = useState<{ correct: number; total: number; pct: number } | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  useEffect(() => {
    onStateChangeRef.current(
      serializeCourseSession(
        progress,
        quizAnswers,
        quizShown,
        flashIndex,
        examType,
        examQs,
        examAnswers,
        examIndex,
        view === 'exam-active',
        examHistory
      )
    );
  }, [progress, quizAnswers, quizShown, flashIndex, examType, examQs, examAnswers, examIndex, view, examHistory]);

  // Speech synthesis state
  const [isSpeaking, setIsSpeaking] = useState(false);

  const TOTAL = LESSONS.length;
  const currentLesson = LESSONS.find((l) => l.id === lessonId) || null;
  const percentDone = Math.round((progress.done.length / TOTAL) * 100);

  // Hash calculation simulation
  const calculateDemoHash = (txt: string) => {
    let x = 2166136261 >>> 0;
    for (const ch of new TextEncoder().encode(txt)) {
      x ^= ch;
      x = Math.imul(x, 16777619) >>> 0;
    }
    return x.toString(16).padStart(8, '0').toUpperCase() + ' (odcisk demonstracyjny, NIE SHA-256)';
  };

  const gotoPage = (newPage: CourseView, newLessonId: string | null = null) => {
    setView(newPage);
    if (newLessonId) setLessonId(newLessonId);
    setQuery('');
    setDemoStep(0);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleDone = (id: string) => {
    const isDone = progress.done.includes(id);
    const newDone = isDone ? progress.done.filter((x) => x !== id) : [...progress.done, id];
    onUpdateProgress({ ...progress, done: newDone });
    showToast(isDone ? 'Lekcja przeniesiona do powtórki' : 'Super! Lekcja oznaczona jako opanowana 🎉');
  };

  const handleReadLesson = (lesson: typeof LESSONS[0]) => {
    if (!('speechSynthesis' in window)) {
      showToast('Ta przeglądarka nie obsługuje odsłuchu tekstu');
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      showToast('Zatrzymano odsłuch');
      return;
    }
    const txt = [
      lesson.title,
      ...lesson.sections.flatMap((s) => [
        s.title,
        ...s.paragraphs.map((p) => p.replace(/<[^>]+>/g, '')),
      ]),
    ].join('. ');
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'pl-PL';
    u.rate = 0.93;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
    showToast('Odtwarzam lekcję. Kliknij ponownie, aby zatrzymać.');
  };

  const handleMiniAnswer = (quizKey: string, answerIdx: number) => {
    setQuizAnswers((prev) => ({ ...prev, [quizKey]: answerIdx }));
  };

  const handleMiniCheck = (quizKey: string, q: QuizQuestion, lId: string) => {
    setQuizShown((prev) => ({ ...prev, [quizKey]: true }));
    const a = quizAnswers[quizKey];
    const prevStats = progress.quizScores[lId] || { correct: 0, total: 0 };
    const updatedStats = {
      total: prevStats.total + 1,
      correct: prevStats.correct + (a === q.answer ? 1 : 0),
    };
    onUpdateProgress({
      ...progress,
      quizScores: {
        ...progress.quizScores,
        [lId]: updatedStats,
      },
    });
  };

  const handleToggleFlashKnown = () => {
    const term = GLOSSARY[flashIndex][0];
    const isKnown = progress.flashKnown.includes(term);
    const newKnown = isKnown
      ? progress.flashKnown.filter((x) => x !== term)
      : [...progress.flashKnown, term];
    onUpdateProgress({ ...progress, flashKnown: newKnown });
  };

  const handleStartExam = (selectedExamType: string) => {
    setExamType(selectedExamType);
    let pool: QuizQuestion[] = [];
    if (selectedExamType.startsWith('sec')) {
      const count = Number(selectedExamType.slice(3));
      pool = pickSecurityQuestions(count);
    } else {
      const lecturePool: QuizQuestion[] = [
        ...LESSONS.filter(
          (l) => selectedExamType === 'all' || String(l.track) === selectedExamType
        ).flatMap((l) =>
          l.quiz.map((q) => ({ ...q, lesson: l.id, lessonTitle: l.title }))
        ),
        ...LECTURE_MULTI.filter(
          (q) => selectedExamType === 'all' || String(q.track) === selectedExamType
        ),
      ];

      const shuffled = [...lecturePool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      pool = shuffled.slice(0, selectedExamType === 'all' ? 20 : 10);
    }

    setExamQs(pool);
    setExamIndex(0);
    setExamAnswers([]);
    setView('exam-active');
    window.scrollTo(0, 0);
  };

  const correctChoices = (q: QuizQuestion): number[] => {
    if (Array.isArray(q.answers)) return q.answers;
    if (Number.isInteger(q.answer)) return [q.answer as number];
    return [];
  };

  const selectedChoices = (a?: ExamAnswer): number[] => {
    if (Array.isArray(a?.answer)) return a.answer;
    if (Number.isInteger(a?.answer)) return [a.answer as number];
    return [];
  };

  const isExamQCorrect = (q: QuizQuestion, a?: ExamAnswer): boolean => {
    const sel = selectedChoices(a);
    const corr = correctChoices(q);
    return sel.length === corr.length && corr.every((i) => sel.includes(i));
  };

  const correctText = (q: QuizQuestion): string => {
    return correctChoices(q)
      .map((i) => q.options[i])
      .join('; ');
  };

  const handleExamOptionClick = (optIdx: number) => {
    const curA = examAnswers[examIndex];
    if (curA?.shown) return;
    const q = examQs[examIndex];
    const prevSel = selectedChoices(curA);
    let newAnswer: number | number[];

    if (q.answers) {
      newAnswer = prevSel.includes(optIdx)
        ? prevSel.filter((x) => x !== optIdx)
        : [...prevSel, optIdx];
    } else {
      newAnswer = optIdx;
    }

    const updated = [...examAnswers];
    updated[examIndex] = { answer: newAnswer, shown: false };
    setExamAnswers(updated);
  };

  const handleExamCheck = () => {
    const updated = [...examAnswers];
    if (updated[examIndex]) {
      updated[examIndex] = { ...updated[examIndex], shown: true };
      setExamAnswers(updated);
    }
  };

  const handleExamNext = () => {
    if (examIndex === examQs.length - 1) {
      // Finish exam
      const correct = examQs.filter((q, i) => isExamQCorrect(q, examAnswers[i])).length;
      const pct = Math.round((correct / examQs.length) * 100);
      const newCount = progress.examCount + 1;
      const newBest = Math.max(progress.examBest, pct);
      onUpdateProgress({
        ...progress,
        examCount: newCount,
        examBest: newBest,
      });
      setLatestScore({ correct, total: examQs.length, pct });
      const examSnapshot = serializeCourseSession(
        progress,
        quizAnswers,
        quizShown,
        flashIndex,
        examType,
        examQs,
        examAnswers,
        examIndex,
        false,
        examHistory
      ).exam;
      setExamHistory((history) => [
        ...history,
        { at: new Date().toISOString(), score: { correct, total: examQs.length, pct }, ...examSnapshot },
      ].slice(-100));
      setView('exam-done');
      window.scrollTo(0, 0);
    } else {
      setExamIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Render visual helpers
  const renderVisual = (kind: string | null) => {
    if (!kind) return null;
    const titleMap: Record<string, string> = {
      cia: 'Triada CIA: trzy pytania',
      nist: 'Plan działania w cyklu',
      aaa: 'Etapy kontroli dostępu',
      categories: 'Kategorie: kto lub co działa?',
      types: 'Typy: kiedy i po co?',
      crypto: 'Od tekstu jawnego do szyfrogramu',
      keys: 'Klucze publiczny i prywatny — symulacja',
      hybrid: 'Dwa rodzaje kryptografii razem',
      bits: 'Każdy bit podwaja możliwości',
      hash: 'Eksperyment: zmień choć jedną literę',
      signature: 'Dwa zadania, dwa zestawy kluczy',
      pki: 'Kto potwierdza klucz serwera?',
      data: 'Trzy stany tych samych danych',
      salt: 'Dwie osoby, to samo hasło',
      blockchain: 'Powiązane bloki',
    };

    const row = (items: React.ReactNode[]) => (
      <div className="v-row">
        {items.map((x, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="v-arrow">→</span>}
            <div className="v-pill">{x}</div>
          </React.Fragment>
        ))}
      </div>
    );

    let content: React.ReactNode = null;
    if (kind === 'cia') {
      content = (
        <>
          {row([
            <span>🔒 C<small>Poufność</small></span>,
            <span>📝 I<small>Integralność</small></span>,
            <span>📶 A<small>Dostępność</small></span>,
          ])}
          <p className="visual-desc">
            Czytać tylko uprawnionym • nie zmieniać bez zgody • udostępniać, kiedy trzeba.
          </p>
        </>
      );
    } else if (kind === 'nist') {
      content = (
        <>
          {row(['Identify', 'Protect', 'Detect'])}
          <div style={{ height: '8px' }} />
          {row(['Respond', 'Recover', 'Govern*'])}
          <p className="visual-desc">
            * Govern — funkcja dodana w NIST CSF 2.0 i obejmująca nadzór nad pozostałymi.
          </p>
        </>
      );
    } else if (kind === 'aaa') {
      content = (
        <>
          {row([
            <span>👤 Login<small>Identyfikacja</small></span>,
            <span>🔑 Hasło<small>Uwierzytelnianie</small></span>,
            <span>🎫 Prawa<small>Autoryzacja</small></span>,
          ])}
          <p className="visual-desc">
            📋 Accounting = zapisywanie działań w logach. Skrót AAA obejmuje 3 ostatnie etapy.
          </p>
        </>
      );
    } else if (kind === 'categories') {
      content = (
        <>
          {row([
            <span>📑 Reguły<small>Zarządcza</small></span>,
            <span>🧍 Człowiek<small>Operacyjna</small></span>,
          ])}
          <div style={{ height: '8px' }} />
          {row([
            <span>💻 Program<small>Techniczna</small></span>,
            <span>🚪 Bariera<small>Fizyczna</small></span>,
          ])}
        </>
      );
    } else if (kind === 'types') {
      content = (
        <>
          {row([
            <span>PRZED<small>dyrektywne • odstraszające • prewencyjne</small></span>,
            <span>W TRAKCIE<small>wykrywające</small></span>,
            <span>PO<small>korygujące • odtworzeniowe</small></span>,
          ])}
          <p className="visual-desc">
            Kompensujące zastępują docelowe zabezpieczenie na dowolnym etapie.
          </p>
        </>
      );
    } else if (kind === 'crypto') {
      content = (
        <>
          {row([
            <span>„Cześć”<small>Tekst jawny</small></span>,
            <span>🔑 + szyfr<small>Encryption</small></span>,
            <span>7#x!2<small>Szyfrogram*</small></span>,
          ])}
          <p className="visual-desc">* Znaki to tylko ilustracja, nie wynik prawdziwego szyfru.</p>
        </>
      );
    } else if (kind === 'keys') {
      const steps = [
        ['1. Ty tworzysz parę kluczy', 'Twój publiczny klucz można udostępnić, Twój prywatny pozostaje u Ciebie.'],
        ['2. Ania bierze Twój publiczny', 'Ania szyfruje nim wiadomość specjalnie dla Ciebie.'],
        ['3. Wiadomość podróżuje przez sieć', 'Ktoś może przechwycić szyfrogram, ale nie powinien odczytać treści.'],
        ['4. Odszyfrowujesz prywatnym', 'Dopiero pasujący prywatny klucz pozwala odczytać wiadomość.'],
      ];
      content = (
        <>
          <div className="pill-switch">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                className={demoStep === i ? 'active' : ''}
                onClick={() => setDemoStep(i)}
              >
                Krok {i + 1}
              </button>
            ))}
          </div>
          <div className="v-demo">
            <div className="big">{steps[demoStep][0]}</div>
            <div style={{ margin: '7px 0' }}>{steps[demoStep][1]}</div>
            <div style={{ fontSize: '30px', marginTop: '12px', textAlign: 'center' }}>
              {['🔐 → 🗝️', '👩 → 🔒', '📨 → 🌐', '🗝️ → 💬'][demoStep]}
            </div>
          </div>
          <p className="visual-desc">
            Klikaj kroki, aby przejść cały proces. To analogia, nie rzeczywiste generowanie kluczy.
          </p>
        </>
      );
    } else if (kind === 'hybrid') {
      content = (
        <>
          {row([
            <span>📦 Duży plik<small>Symetrycznie</small></span>,
            <span>🗝️ Mały sekret<small>Asymetrycznie*</small></span>,
          ])}
          <p className="visual-desc">
            * W modelu ze slajdu; nowoczesny TLS często uzgadnia sekret przez wymianę kluczy.
          </p>
        </>
      );
    } else if (kind === 'bits') {
      content = (
        <>
          <div className="v-row" style={{ justifyContent: 'flex-start', gap: '6px', marginBottom: '12px' }}>
            {[0, 1, 1, 0, 1, 0, 0, 1].map((n, i) => (
              <span key={i} className="bit-square">
                {n}
              </span>
            ))}
          </div>
          <div className="v-demo">1 bit = 2 możliwości • 2 bity = 4 • 3 bity = 8 • 8 bitów = 256.</div>
        </>
      );
    } else if (kind === 'hash') {
      content = (
        <>
          <label className="mini muted" htmlFor="hashDemo">
            Napisz dowolny tekst (to demonstracyjny odcisk, nie SHA-256):
          </label>
          <input
            id="hashDemo"
            className="hash-input"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
          />
          <div className="hash-out">{calculateDemoHash(hashInput)}</div>
          <p className="visual-desc">
            Zmień np. „100” na „900”. Wynik się zmieni. To uproszczona symulacja koncepcji hasha, a nie algorytm kryptograficzny.
          </p>
        </>
      );
    } else if (kind === 'signature') {
      content = row([
        <span>✍️ Prywatny nadawcy<small>Tworzy podpis</small></span>,
        <span>✅ Publiczny nadawcy<small>Weryfikuje</small></span>,
      ]);
    } else if (kind === 'pki') {
      content = row([
        <span>🏛️ CA<small>Wystawia certyfikat</small></span>,
        <span>📜 Serwer<small>Przedstawia certyfikat</small></span>,
        <span>🌐 Przeglądarka<small>Sprawdza</small></span>,
      ]);
    } else if (kind === 'data') {
      content = row([
        <span>💾 Na dysku<small>At rest</small></span>,
        <span>📨 Wysyłane<small>In transit</small></span>,
        <span>🧠 W RAM<small>In use</small></span>,
      ]);
    } else if (kind === 'salt') {
      content = (
        <>
          {row([
            <span>kot123 + sól A<small>Hash A</small></span>,
            <span>kot123 + sól B<small>Hash B</small></span>,
          ])}
          <p className="visual-desc">
            Sole sprawiają, że identyczne hasła nie muszą mieć takich samych wyników.
          </p>
        </>
      );
    } else if (kind === 'blockchain') {
      content = (
        <>
          {row([
            <span>Blok 1<small>hash 1</small></span>,
            <span>Blok 2<small>hash 1 + 2</small></span>,
            <span>Blok 3<small>hash 2 + 3</small></span>,
          ])}
          <p className="visual-desc">
            Uproszczony łańcuch powiązań — zmiana wcześniejszego bloku zaburza późniejsze.
          </p>
        </>
      );
    }

    return (
      <div className="visual">
        <h4>✦ {titleMap[kind] || 'Prosty schemat'}</h4>
        {content}
      </div>
    );
  };

  return (
    <div className="app" id="courseApp">
      <CourseSidebar
        open={sidebarOpen}
        view={view}
        lessonId={lessonId}
        doneLessonIds={progress.done}
        syncStatus={syncStatus}
        onClose={() => setSidebarOpen(false)}
        onNavigate={gotoPage}
        onOpenStudentPortal={onOpenStudentPortal}
        onOpenProfile={onOpenProfile}
        onExportProgress={onExportProgress}
      />

      <main className="main">
        <CourseHeader
          query={query}
          percentDone={percentDone}
          onQueryChange={(nextQuery) => {
            setQuery(nextQuery);
            if (nextQuery.trim()) {
              setView('search');
            } else if (view === 'search') {
              setView('home');
            }
          }}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNavigate={gotoPage}
        />

        <div id="content" className="content">
          {/* SEARCH VIEW */}
          {view === 'search' && query.trim() && (
            <div>
              <div className="eyebrow">Wyszukiwanie</div>
              <h1 className="page-title">Wyniki dla „{query}”</h1>
              <p className="lede">Tematy i terminy ze wszystkich czterech wykładów.</p>

              {(() => {
                const qLower = query.toLowerCase();
                const matchedLessons = LESSONS.filter((l) =>
                  (
                    l.title +
                    ' ' +
                    l.subtitle +
                    ' ' +
                    l.sections.map((s) => s.title + ' ' + s.paragraphs.join(' ')).join(' ')
                  )
                    .toLowerCase()
                    .includes(qLower)
                );
                const matchedGlossary = GLOSSARY.filter((x) =>
                  (x[0] + ' ' + x[1]).toLowerCase().includes(qLower)
                );

                return (
                  <>
                    <div className="section-heading">
                      <h2>Lekcje ({matchedLessons.length})</h2>
                    </div>
                    {matchedLessons.length > 0 ? (
                      <div className="lesson-grid">
                        {matchedLessons.map((lesson) => (
                          <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            completed={progress.done.includes(lesson.id)}
                            onOpen={(id) => gotoPage('lesson', id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="empty">Nie znaleziono lekcji.</div>
                    )}

                    <div className="section-heading">
                      <h2>Pojęcia ({matchedGlossary.length})</h2>
                    </div>
                    {matchedGlossary.length > 0 ? (
                      <div className="glossary-list">
                        {matchedGlossary.slice(0, 35).map((x, i) => (
                          <div key={i} className="glossary-item">
                            <strong>{x[0]}</strong>
                            <p>{x[1]}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty">Nie znaleziono pojęć.</div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* HOME VIEW */}
          {view === 'home' && (
            <div>
              <section className="hero">
                <div>
                  <div className="hero-tag">✦ Kurs stworzony na podstawie Twoich wykładów</div>
                  <h1>
                    Bezpieczeństwo IT<br />
                    nareszcie po ludzku.
                  </h1>
                  <p>
                    Zero wiedzy na wejściu? Idealnie. Tłumaczymy wszystko od początku:
                    proste historie, schematy, fiszki i pytania jak na zejściówce.
                  </p>
                  <button
                    className="primary-btn white"
                    onClick={() => {
                      const next = LESSONS.find((l) => !progress.done.includes(l.id)) || LESSONS[0];
                      gotoPage('lesson', next.id);
                    }}
                    type="button"
                  >
                    {progress.done.length ? 'Kontynuuj naukę' : 'Zacznij pierwszą lekcję'} →
                  </button>
                </div>
                <div className="hero-illustration">
                  <div className="hero-orb">
                    <span>🔐</span>
                  </div>
                  <div className="hero-small one">✨</div>
                  <div className="hero-small two">🗝️</div>
                </div>
              </section>

              <div className="stat-grid">
                <div className="stat">
                  <div className="sm">Ukończone lekcje</div>
                  <div className="num">
                    {progress.done.length}
                    <span className="muted"> / {TOTAL}</span>
                  </div>
                  <div className="meter">
                    <div style={{ width: `${percentDone}%` }} />
                  </div>
                </div>
                <div className="stat">
                  <div className="sm">Opanowane fiszki</div>
                  <div className="num">
                    {progress.flashKnown.length}
                    <span className="muted"> / {GLOSSARY.length}</span>
                  </div>
                  <div className="help">Każda opanowana fiszka to jedno pojęcie</div>
                </div>
                <div className="stat">
                  <div className="sm">Najlepszy wynik testu</div>
                  <div className="num">
                    {progress.examBest}
                    <span className="muted">%</span>
                  </div>
                  <div className="help">Twoje testy: {progress.examCount}</div>
                </div>
              </div>

              <div className="section-heading">
                <h2>Twoje cztery wykłady</h2>
                <small>Wybierz blok tematyczny</small>
              </div>
              <div className="track-grid">
                <div className="track-card">
                  <div className="ico">🛡️</div>
                  <h3>Wykład 1 — Podstawy bezpieczeństwa</h3>
                  <p>CIA, NIST, kontrola dostępu, kategorie zabezpieczeń, role i należyta staranność.</p>
                  <div className="foot">
                    <span>{LESSONS.filter((l) => l.track === 1).length} lekcji</span>
                    <button
                      className="secondary-btn"
                      onClick={() => {
                        setTrackFilter(1);
                        gotoPage('lessons');
                      }}
                      type="button"
                    >
                      Przejdź do lekcji →
                    </button>
                  </div>
                </div>
                <div className="track-card">
                  <div className="ico">🔐</div>
                  <h3>Wykład 2 — Kryptografia</h3>
                  <p>Klucze, szyfrowanie, hash, podpisy cyfrowe, certyfikaty i blockchain.</p>
                  <div className="foot">
                    <span>{LESSONS.filter((l) => l.track === 2).length} lekcji</span>
                    <button
                      className="secondary-btn"
                      onClick={() => {
                        setTrackFilter(2);
                        gotoPage('lessons');
                      }}
                      type="button"
                    >
                      Przejdź do lekcji →
                    </button>
                  </div>
                </div>
                <div className="track-card">
                  <div className="ico">🎭</div>
                  <h3>Wykład 3 — Aktorzy zagrożeń</h3>
                  <p>Motywacje, APT, insiderzy, wektory ataku, socjotechnika i phishing.</p>
                  <div className="foot">
                    <span>8 lekcji</span>
                    <button
                      className="secondary-btn"
                      onClick={() => {
                        setTrackFilter(3);
                        gotoPage('lessons');
                      }}
                      type="button"
                    >
                      Przejdź do lekcji →
                    </button>
                  </div>
                </div>
                <div className="track-card">
                  <div className="ico">🦠</div>
                  <h3>Wykład 4 — Malware i techniki ataków</h3>
                  <p>Wirusy, ransomware, Wi-Fi, ataki na hasła, RCE i przejęcie sesji.</p>
                  <div className="foot">
                    <span>8 lekcji</span>
                    <button
                      className="secondary-btn"
                      onClick={() => {
                        setTrackFilter(4);
                        gotoPage('lessons');
                      }}
                      type="button"
                    >
                      Przejdź do lekcji →
                    </button>
                  </div>
                </div>
              </div>

              <div className="section-heading">
                <h2>Co dalej?</h2>
                <small>Twoja kolejna lekcja</small>
              </div>
              <div className="lesson-grid">
                {(() => {
                  const next = LESSONS.find((l) => !progress.done.includes(l.id)) || LESSONS[0];
                  const previewList = [
                    next,
                    ...LESSONS.filter((l) => l.id !== next.id && !progress.done.includes(l.id)).slice(0, 2),
                  ];
                  return previewList.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      completed={progress.done.includes(lesson.id)}
                      onOpen={(id) => gotoPage('lesson', id)}
                    />
                  ));
                })()}
              </div>

              <div className="section-heading">
                <h2>Jak działa aplikacja?</h2>
              </div>
              <div className="more-grid">
                <div className="source-card">
                  <strong>📚 {TOTAL} lekcji + weryfikacja wiedzy</strong>
                  <p>Każde zagadnienie opisane prosto, z przykładami i pytaniami sprawdzającymi.</p>
                </div>
                <div className="source-card">
                  <strong>🃏 Fiszki i próbny test</strong>
                  <p>Powtarzaj definicje i rozwiązuj losowo dobrane pytania z czterech wykładów.</p>
                </div>
              </div>

              <p className="footer-note">
                Źródło: „Bezpieczeństwo IT — Wykład 1” (53 strony) , „Bezpieczeństwo IT — Wykład 2” (20 stron)
                oraz „Bezpieczeństwo IT — Wykład 3” (26 stron PDF) oraz „Bezpieczeństwo IT — Wykład 4” (20 stron PDF),
                dr inż. Marcin Grabarczyk, semestr zimowy 2026/2027. Proste analogie, ćwiczenia i dodatkowe objaśnienia
                są materiałem edukacyjnym do tych slajdów.
              </p>
            </div>
          )}

          {/* ALL LESSONS VIEW */}
          {view === 'lessons' && (
            <div>
              <div className="eyebrow">Twój program nauki</div>
              <h1 className="page-title">Lekcje, które mają sens.</h1>
              <p className="lede">
                Wybieraj temat w dowolnej kolejności. Najlepiej zacznij od pierwszego wykładu — pojęcia są ułożone od
                łatwiejszych do trudniejszych.
              </p>

              <div className="track-toggle">
                <button
                  type="button"
                  className={trackFilter === 0 ? 'active' : ''}
                  onClick={() => setTrackFilter(0)}
                >
                  Wszystkie ({TOTAL})
                </button>
                <button
                  type="button"
                  className={trackFilter === 1 ? 'active' : ''}
                  onClick={() => setTrackFilter(1)}
                >
                  Wykład 1
                </button>
                <button
                  type="button"
                  className={trackFilter === 2 ? 'active' : ''}
                  onClick={() => setTrackFilter(2)}
                >
                  Wykład 2
                </button>
                <button
                  type="button"
                  className={trackFilter === 3 ? 'active' : ''}
                  onClick={() => setTrackFilter(3)}
                >
                  Wykład 3
                </button>
                <button
                  type="button"
                  className={trackFilter === 4 ? 'active' : ''}
                  onClick={() => setTrackFilter(4)}
                >
                  Wykład 4
                </button>
              </div>

              <div className="lesson-grid">
                {LESSONS.filter((lesson) => !trackFilter || lesson.track === trackFilter).map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    completed={progress.done.includes(lesson.id)}
                    onOpen={(id) => gotoPage('lesson', id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SINGLE LESSON VIEW */}
          {view === 'lesson' && currentLesson && (
            <div>
              <button className="back-link" onClick={() => gotoPage('lessons')} type="button">
                ← Wszystkie lekcje
              </button>
              <div className="article-head">
                <div className="article-icon">{currentLesson.icon}</div>
                <div>
                  <div className="eyebrow">
                    Wykład {currentLesson.track} · Lekcja{' '}
                    {LESSONS.filter((x) => x.track === currentLesson.track).findIndex(
                      (x) => x.id === currentLesson.id
                    ) + 1}
                  </div>
                  <h1>{currentLesson.title}</h1>
                  <p>{currentLesson.subtitle}</p>
                  <div className="sourcefoot">Na podstawie: {currentLesson.slides}</div>
                </div>
              </div>

              <div className="article-actions">
                <button
                  className={progress.done.includes(currentLesson.id) ? 'secondary-btn' : 'primary-btn'}
                  onClick={() => handleToggleDone(currentLesson.id)}
                  type="button"
                >
                  {progress.done.includes(currentLesson.id)
                    ? '✓ Lekcja ukończona — cofnij'
                    : '✓ Oznacz jako opanowaną'}
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => handleReadLesson(currentLesson)}
                  type="button"
                >
                  {isSpeaking ? '⏹ Zatrzymaj odsłuch' : '🔊 Odsłuchaj'}
                </button>
                <button className="ghost-btn" onClick={() => window.print()} type="button">
                  🖨️ Drukuj / zapisz PDF
                </button>
              </div>

              <div className="two-col">
                <div>
                  <div className="paper">
                    {renderVisual(currentLesson.visual)}
                    {currentLesson.sections.map((sec, idx) => (
                      <section key={idx} className="unit-section">
                        <div className="section-inline-label">Krok {idx + 1}</div>
                        <h3>{sec.title}</h3>
                        {sec.paragraphs.map((p, pIdx) => (
                          <p key={pIdx} dangerouslySetInnerHTML={{ __html: p }} />
                        ))}
                        {sec.bullets && sec.bullets.length > 0 && (
                          <ul>
                            {sec.bullets.map((b, bIdx) => (
                              <li key={bIdx} dangerouslySetInnerHTML={{ __html: b }} />
                            ))}
                          </ul>
                        )}
                      </section>
                    ))}
                  </div>

                  <div className="quiz-card" id="lessonQuiz">
                    <div className="quiz-eyebrow">Zadania jak na zejściówce</div>
                    <h3>Sprawdź, czy naprawdę to rozumiesz</h3>
                    <p className="mini muted">
                      Odpowiedz na pytania. Po odpowiedzi zobaczysz wyjaśnienie, nie tylko „dobrze/źle”.
                    </p>

                    {currentLesson.quiz.map((q, qIdx) => {
                      const qKey = `${currentLesson.id}-${qIdx}`;
                      const ans = quizAnswers[qKey];
                      const shown = quizShown[qKey];
                      const isCorrect = ans === q.answer;

                      return (
                        <div
                          key={qIdx}
                          style={{
                            marginTop: '19px',
                            paddingTop: '18px',
                            borderTop: '1px solid var(--line)',
                          }}
                        >
                          <div className="mini muted" style={{ fontWeight: 700, marginBottom: '5px' }}>
                            PYTANIE {qIdx + 1}
                          </div>
                          <div style={{ fontWeight: 750, fontSize: '14px', lineHeight: 1.5 }}>
                            {q.q}
                          </div>

                          {q.options.map((opt, optIdx) => (
                            <button
                              key={optIdx}
                              className={`option ${ans === optIdx ? 'selected' : ''} ${
                                shown && optIdx === q.answer ? 'correct' : ''
                              } ${shown && ans === optIdx && ans !== q.answer ? 'wrong' : ''}`}
                              disabled={shown}
                              onClick={() => handleMiniAnswer(qKey, optIdx)}
                              type="button"
                            >
                              <span className="bullet">{String.fromCharCode(65 + optIdx)}</span>
                              {opt}
                            </button>
                          ))}

                          {shown ? (
                            <div className="quiz-answer">
                              <strong>
                                {isCorrect
                                  ? '✅ Super, dobrze!'
                                  : `🌻 Poprawna odpowiedź: ${q.options[q.answer || 0]}`}
                              </strong>
                              <div>{q.why}</div>
                            </div>
                          ) : (
                            <button
                              className="secondary-btn"
                              disabled={ans === undefined}
                              onClick={() => handleMiniCheck(qKey, q, currentLesson.id)}
                              type="button"
                              style={{ marginTop: '10px' }}
                            >
                              Sprawdź odpowiedź
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(() => {
                    const lIdx = LESSONS.findIndex((x) => x.id === currentLesson.id);
                    return (
                      <div className="bottom-nav">
                        <button
                          className="ghost-btn"
                          disabled={lIdx === 0}
                          onClick={() => lIdx > 0 && gotoPage('lesson', LESSONS[lIdx - 1].id)}
                          type="button"
                        >
                          ← Poprzednia
                        </button>
                        <button
                          className="primary-btn"
                          onClick={() => {
                            if (lIdx === TOTAL - 1) {
                              gotoPage('exam');
                            } else {
                              gotoPage('lesson', LESSONS[lIdx + 1].id);
                            }
                          }}
                          type="button"
                        >
                          {lIdx === TOTAL - 1 ? 'Przejdź do testu' : 'Następna lekcja →'}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                <aside className="rail">
                  <div className="hint">
                    <div className="hint-title">💡 Zapamiętaj</div>
                    <p>{currentLesson.remember}</p>
                  </div>
                  <div className="hint example">
                    <div className="hint-title">🌷 Przykład z życia</div>
                    <p>{currentLesson.example}</p>
                  </div>
                  <div className="hint warn">
                    <div className="hint-title">⚠️ Częsta pomyłka</div>
                    <p>{currentLesson.pitfalls}</p>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {/* FLASHCARDS VIEW */}
          {view === 'flash' && (
            <div>
              <div className="eyebrow">Fiszki · wszystkie ważne pojęcia</div>
              <h1 className="page-title">Zapamiętasz szybciej.</h1>
              <p className="lede">
                Kliknij kartę, żeby zobaczyć wyjaśnienie. Oznaczaj pojęcia, które już znasz. Fiszki korzystają ze słownika wykładów.
              </p>

              <div className="stat-grid" style={{ maxWidth: '750px' }}>
                <div className="stat">
                  <div className="sm">Fiszka</div>
                  <div className="num">
                    {flashIndex + 1}
                    <span className="muted"> / {GLOSSARY.length}</span>
                  </div>
                </div>
                <div className="stat">
                  <div className="sm">Już znam</div>
                  <div className="num">{progress.flashKnown.length}</div>
                </div>
                <div className="stat">
                  <div className="sm">Do powtórki</div>
                  <div className="num">{GLOSSARY.length - progress.flashKnown.length}</div>
                </div>
              </div>

              {(() => {
                const term = GLOSSARY[flashIndex];
                const known = progress.flashKnown.includes(term[0]);
                return (
                  <div className="flash-layout">
                    <div
                      className="flashcard"
                      id="flipFlash"
                      role="button"
                      tabIndex={0}
                      aria-label="Odwróć fiszkę"
                      onClick={() => setFlashReveal(!flashReveal)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setFlashReveal(!flashReveal);
                        }
                      }}
                    >
                      <div className="cap">{flashReveal ? 'ODPOWIEDŹ' : 'POJĘCIE'}</div>
                      {flashReveal ? (
                        <div className="answer">{term[1]}</div>
                      ) : (
                        <h2>{term[0]}</h2>
                      )}
                      <div className="tap">
                        ↻ Kliknij, żeby {flashReveal ? 'wrócić do pojęcia' : 'odkryć znaczenie'}
                      </div>
                    </div>

                    <div className="flash-controls">
                      <button
                        className="ghost-btn"
                        onClick={() => {
                          setFlashIndex((flashIndex - 1 + GLOSSARY.length) % GLOSSARY.length);
                          setFlashReveal(false);
                        }}
                        type="button"
                      >
                        ← Wstecz
                      </button>
                      <button
                        className={known ? 'secondary-btn' : 'primary-btn'}
                        onClick={handleToggleFlashKnown}
                        type="button"
                      >
                        {known ? '✓ Znam — cofnij' : '✓ Już znam'}
                      </button>
                      <button
                        className="ghost-btn"
                        onClick={() => {
                          setFlashIndex((flashIndex + 1) % GLOSSARY.length);
                          setFlashReveal(false);
                        }}
                        type="button"
                      >
                        Dalej →
                      </button>
                    </div>

                    <div className="flash-controls">
                      <button
                        className="secondary-btn"
                        onClick={() => {
                          const ids = GLOSSARY.map((x, i) => [x[0], i] as [string, number]).filter(
                            (x) => !progress.flashKnown.includes(x[0])
                          );
                          if (!ids.length) {
                            showToast('Znasz wszystkie fiszki! 🏆');
                            return;
                          }
                          const randIdx = ids[Math.floor(Math.random() * ids.length)][1];
                          setFlashIndex(randIdx);
                          setFlashReveal(false);
                        }}
                        type="button"
                      >
                        Losuj nieopanowaną
                      </button>
                      <button
                        className="ghost-btn"
                        onClick={() => {
                          setFlashIndex(Math.floor(Math.random() * GLOSSARY.length));
                          setFlashReveal(false);
                        }}
                        type="button"
                      >
                        Losowa fiszka 🎲
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* GLOSSARY VIEW */}
          {view === 'glossary' && (
            <div>
              <div className="eyebrow">Leksykon · polski i angielski</div>
              <h1 className="page-title">Słownik cyberpojęć.</h1>
              <p className="lede">
                Nie rozumiesz skrótu? Znajdź go tutaj — każde pojęcie jest wyjaśnione bez skomplikowanego żargonu.
              </p>

              <div className="section-heading">
                <h2>{GLOSSARY.length} pojęć</h2>
                <small>Wyszukiwanie działa w górnym polu</small>
              </div>

              <div className="glossary-list">
                {GLOSSARY.map((item, idx) => (
                  <div key={idx} className="glossary-item">
                    <strong>{item[0]}</strong>
                    <p>{item[1]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXAM VIEW */}
          {view === 'exam' && (
            <div>
              <div className="eyebrow">Trening wiedzy i Security+</div>
              <h1 className="page-title">Test wiedzy bez stresu.</h1>
              <p className="lede">
                Domyślny test obejmuje wyłącznie cztery wykłady z kursu. Osobny tryb Security+ SY0-701 wykracza poza te wykłady.
                Po każdej odpowiedzi dowiesz się, dlaczego jest poprawna lub nie.
              </p>

              <div className="quiz-config">
                <label htmlFor="examScope">Wybierz zakres</label>
                <select
                  id="examScope"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                >
                  <option value="sec10">Security+ SY0-701 — 10 pytań</option>
                  <option value="sec20">Security+ SY0-701 — 20 pytań</option>
                  <option value="sec30">Security+ SY0-701 — 30 pytań</option>
                  <option value="all">Wszystkie cztery wykłady — 20 pytań</option>
                  <option value="1">Tylko wykład 1 — 10 pytań</option>
                  <option value="2">Tylko wykład 2 — 10 pytań</option>
                  <option value="3">Tylko wykład 3 — 10 pytań</option>
                  <option value="4">Tylko wykład 4 — 10 pytań</option>
                </select>

                <p className="mini muted">
                  Pytania z wykładów zawierają także wybór wielu odpowiedzi i poprawnych par. Zaznacz wszystkie poprawne:
                  nie podajemy ich liczby. Punkt otrzymujesz tylko za kompletny poprawny zestaw. Security+ (rozszerzenie poza wykłady):
                  30 autorskich pytań ćwiczeniowych z pięciu obszarów zakresu SY0-701.
                </p>
                <div className="mini muted">
                  Bez limitu czasu: najpierw naucz się rozumieć. Każdy test miesza kolejność dostępnych pytań.
                </div>
                <button
                  className="primary-btn"
                  onClick={() => handleStartExam(examType)}
                  type="button"
                >
                  Rozpocznij test →
                </button>
              </div>

              <div className="section-heading">
                <h2>Jak się przygotować?</h2>
              </div>
              <div className="more-grid">
                <div className="source-card">
                  <strong>1. Zrozum każdy przykład</strong>
                  <p>W teście scenariuszowym ważniejsze jest dobranie działania niż pamięciowa definicja.</p>
                </div>
                <div className="source-card">
                  <strong>2. Wracaj do błędów</strong>
                  <p>Po odpowiedzi czytaj wyjaśnienie. Jeśli coś nadal jest trudne, wróć do odpowiedniej lekcji.</p>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE EXAM RUNNER */}
          {view === 'exam-active' && (
            <div className="exam">
              {(() => {
                const q = examQs[examIndex];
                if (!q) {
                  return <p>Brak pytań.</p>;
                }
                const a = examAnswers[examIndex];
                const shown = Boolean(a?.shown);
                const selected = selectedChoices(a);
                const correct = correctChoices(q);
                const isPassed = isExamQCorrect(q, a);

                return (
                  <>
                    <div className="eyebrow">Test w toku</div>
                    <h1 className="page-title">Dobrze Ci idzie. 💜</h1>
                    <div className="exam-counter">
                      <span>
                        Pytanie {examIndex + 1} z {examQs.length}
                      </span>
                      <span>
                        {Math.round((examIndex / examQs.length) * 100)}% ukończono
                      </span>
                    </div>
                    <div className="exam-progress">
                      <div style={{ width: `${(examIndex / examQs.length) * 100}%` }} />
                    </div>

                    <div className="quiz-card" style={{ marginTop: '22px' }}>
                      <div className="quiz-eyebrow">{q.lessonTitle}</div>
                      <h3>{q.q}</h3>
                      <p className="mini muted">
                        {q.answers
                          ? 'Zaznacz wszystkie poprawne odpowiedzi.'
                          : 'Wybierz jedną odpowiedź.'}
                      </p>

                      {q.options.map((opt, optIdx) => {
                        const isSel = selected.includes(optIdx);
                        const isCorr = correct.includes(optIdx);
                        return (
                          <button
                            key={optIdx}
                            className={`option ${isSel ? 'selected' : ''} ${
                              shown && isCorr ? 'correct' : ''
                            } ${shown && isSel && !isCorr ? 'wrong' : ''}`}
                            disabled={shown}
                            aria-pressed={isSel}
                            onClick={() => handleExamOptionClick(optIdx)}
                            type="button"
                          >
                            <span className="bullet">{String.fromCharCode(65 + optIdx)}</span>
                            {opt}
                          </button>
                        );
                      })}

                      {shown && (
                        <div className="quiz-answer">
                          <strong>
                            {isPassed ? '✅ Poprawnie!' : `🌻 Poprawny zestaw: ${correctText(q)}`}
                          </strong>
                          <div>{q.why}</div>
                        </div>
                      )}

                      <div className="right-actions">
                        {shown ? (
                          <button
                            className="primary-btn"
                            onClick={handleExamNext}
                            type="button"
                          >
                            {examIndex === examQs.length - 1 ? 'Zobacz wynik 🏆' : 'Następne pytanie →'}
                          </button>
                        ) : (
                          <button
                            className="primary-btn"
                            disabled={selected.length === 0}
                            onClick={handleExamCheck}
                            type="button"
                          >
                            Sprawdź odpowiedź
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      className="back-link"
                      onClick={() => setView('exam')}
                      type="button"
                      style={{ marginTop: '18px' }}
                    >
                      ← Przerwij test
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {/* EXAM DONE VIEW */}
          {view === 'exam-done' && (
            <div>
              <div className="eyebrow">Test zakończony</div>
              {(() => {
                const r = latestScore || { correct: 0, total: 0, pct: 0 };
                const wrong = examQs.filter((q, i) => !isExamQCorrect(q, examAnswers[i]));

                return (
                  <>
                    <div className="result">
                      <div style={{ fontSize: '48px' }}>{r.pct >= 80 ? '🏆' : '🌷'}</div>
                      <h1 style={{ margin: '12px 0 2px' }}>
                        {r.pct >= 80 ? 'Świetna robota!' : 'To dobry materiał do powtórki!'}
                      </h1>
                      <div className="score">{r.pct}%</div>
                      <p className="muted">
                        Poprawne odpowiedzi: {r.correct} z {r.total}
                      </p>
                      <div className="flash-controls">
                        <button
                          className="primary-btn"
                          onClick={() => handleStartExam(examType)}
                          type="button"
                        >
                          Rozwiąż kolejny test
                        </button>
                        <button
                          className="ghost-btn"
                          onClick={() => gotoPage('lessons')}
                          type="button"
                        >
                          Przejdź do lekcji
                        </button>
                      </div>
                    </div>

                    {wrong.length > 0 && (
                      <>
                        <div className="section-heading">
                          <h2>Warto powtórzyć ({wrong.length})</h2>
                        </div>
                        <div className="glossary-list">
                          {wrong.map((q, idx) => (
                            <div key={idx} className="glossary-item">
                              <strong>{q.lessonTitle}</strong>
                              <p>
                                {q.q}
                                <br />
                                <b>Odpowiedź:</b> {correctText(q)}
                              </p>
                              {q.id ? (
                                <p>{q.why}</p>
                              ) : (
                                <button
                                  className="back-link"
                                  style={{ margin: '8px 0 0' }}
                                  onClick={() => q.lesson && gotoPage('lesson', q.lesson)}
                                  type="button"
                                >
                                  Otwórz lekcję →
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
