import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ProgressState, ExamAnswer, QuizQuestion } from '../../../types';
import { LESSONS as FALLBACK_LESSONS, GLOSSARY as FALLBACK_GLOSSARY, LECTURE_MULTI as FALLBACK_LECTURE_MULTI, pickSecurityQuestions } from '../../../data/courseData';
import { supabase } from '@/lib/supabase';
import { listPublishedCourses } from '../lib/public-courses';
import type { PublicCourse } from '@/types';
import { restoreCourseSession, serializeCourseSession, type CourseSessionState } from '../lib/course-session';
import { CourseHeader } from './CourseHeader';
import { CourseSidebar, type CourseView } from './CourseSidebar';
import { LessonCard } from './LessonCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Volume2,
  VolumeX,
  Printer,
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Shuffle,
  Trophy,
  Sparkles,
  ShieldAlert,
  Lightbulb,
} from 'lucide-react';

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
  const location = useLocation();
  const navigate = useNavigate();
  const [publicCourse, setPublicCourse] = useState<PublicCourse | null>(null);

  useEffect(() => {
    let active = true;

    void fetch('/courses/od-zera-do-hakera.json', { cache: 'no-cache' })
      .then((response) => response.ok ? response.json() : null)
      .then((raw: unknown) => {
        if (!active || publicCourse) return;
        if (raw && typeof raw === 'object') {
          const publicJson = raw as PublicCourse;
          if (Array.isArray(publicJson.content?.lessons)) setPublicCourse(publicJson);
        }
      })
      .catch(() => undefined);

    if (!supabase) return () => { active = false; };

    active = true;
    void listPublishedCourses(supabase)
      .then((courses) => {
        if (active) setPublicCourse(courses.find((course) => course.slug === 'od-zera-do-hakera') ?? null);
      })
      .catch(() => {
        if (active) setPublicCourse(null);
      });
    return () => { active = false; };
  }, []);

  const LESSONS = publicCourse?.content.lessons ?? FALLBACK_LESSONS;
  const GLOSSARY = publicCourse?.content.glossary ?? FALLBACK_GLOSSARY;
  const LECTURE_MULTI = publicCourse?.content.lectureMulti ?? FALLBACK_LECTURE_MULTI;

  const courseViewFromPath = (pathname: string): CourseView => {
    if (pathname.startsWith('/course/lesson')) return 'lesson';
    if (pathname === '/course/lessons') return 'lessons';
    if (pathname === '/course/flash') return 'flash';
    if (pathname === '/course/glossary') return 'glossary';
    if (pathname === '/course/exam') return 'exam';
    if (pathname === '/course/search') return 'search';
    return 'home';
  };

  const [restoredSession] = useState(() => restoreCourseSession(initialSnapshot, progress));
  const [view, setView] = useState<CourseView>(() => courseViewFromPath(location.pathname));
  const lessonMatch = location.pathname.match(/^\/course\/lesson\/([^/?]+)/);
  const [lessonId, setLessonId] = useState<string | null>(lessonMatch ? decodeURIComponent(lessonMatch[1]) : null);

  useEffect(() => {
    setView(courseViewFromPath(location.pathname));
    const match = location.pathname.match(/^\/course\/lesson\/([^/?]+)/);
    setLessonId(match ? decodeURIComponent(match[1]) : null);
  }, [location.pathname]);

  const [trackFilter, setTrackFilter] = useState<number>(0);
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [hashInput, setHashInput] = useState('Przelej 100 zł');

  const [flashIndex, setFlashIndex] = useState(restoredSession.flashIndex);
  const [flashReveal, setFlashReveal] = useState(false);

  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>(restoredSession.quiz.answers);
  const [quizShown, setQuizShown] = useState<Record<string, boolean>>(restoredSession.quiz.shown);

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

  const [isSpeaking, setIsSpeaking] = useState(false);
  const TOTAL = FALLBACK_LESSONS.length;
  const currentLesson = FALLBACK_LESSONS.find((l) => l.id === lessonId) || null;
  const percentDone = Math.round((progress.done.length / TOTAL) * 100);

  const calculateDemoHash = (txt: string) => {
    let x = 2166136261 >>> 0;
    for (const ch of new TextEncoder().encode(txt)) {
      x ^= ch;
      x = Math.imul(x, 16777619) >>> 0;
    }
    return x.toString(16).padStart(8, '0').toUpperCase() + ' (odcisk demonstracyjny)';
  };

  const gotoPage = (newPage: CourseView, newLessonId: string | null = null) => {
    const route = newPage === 'lesson' && newLessonId
      ? `/course/lesson/${encodeURIComponent(newLessonId)}`
      : newPage === 'home'
        ? '/course'
        : `/course/${newPage}`;
    navigate(route);
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
    showToast(isDone ? 'Lekcja przeniesiona do powtórki' : 'Lekcja oznaczona jako opanowana 🎉');
  };

  const handleReadLesson = (lesson: typeof FALLBACK_LESSONS[0]) => {
    if (!('speechSynthesis' in window)) {
      showToast('Twoja przeglądarka nie obsługuje syntezatora mowy');
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
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
    u.rate = 0.95;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const handleMiniAnswer = (quizKey: string, answerIdx: number) => {
    setQuizAnswers((prev) => ({ ...prev, [quizKey]: answerIdx }));
  };

  const handleMiniCheck = (quizKey: string, q: QuizQuestion, lId: string) => {
    setQuizShown((prev) => ({ ...prev, [quizKey]: true }));
    const a = quizAnswers[quizKey];
    const prevStats = progress.quizScores[lId] || { correct: 0, total: 0 };
    onUpdateProgress({
      ...progress,
      quizScores: {
        ...progress.quizScores,
        [lId]: {
          total: prevStats.total + 1,
          correct: prevStats.correct + (a === q.answer ? 1 : 0),
        },
      },
    });
  };

  const handleToggleFlashKnown = () => {
    const term = FALLBACK_GLOSSARY[flashIndex][0];
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
        ...FALLBACK_LESSONS.filter(
          (l) => selectedExamType === 'all' || String(l.track) === selectedExamType
        ).flatMap((l) =>
          l.quiz.map((q) => ({ ...q, lesson: l.id, lessonTitle: l.title }))
        ),
        ...FALLBACK_LECTURE_MULTI.filter(
          (q) => selectedExamType === 'all' || String(q.track) === selectedExamType
        ),
      ];
      const shuffled = [...lecturePool].sort(() => 0.5 - Math.random());
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
    if (typeof a?.answer === 'number') return [a.answer];
    return [];
  };

  const isExamQCorrect = (q: QuizQuestion, a?: ExamAnswer): boolean => {
    const sel = selectedChoices(a);
    const corr = correctChoices(q);
    return sel.length === corr.length && corr.every((i) => sel.includes(i));
  };

  const handleExamOptionClick = (optIdx: number) => {
    const curA = examAnswers[examIndex];
    if (curA?.shown) return;
    const q = examQs[examIndex];
    const prevSel = selectedChoices(curA);
    const newAnswer = q.answers
      ? prevSel.includes(optIdx)
        ? prevSel.filter((x) => x !== optIdx)
        : [...prevSel, optIdx]
      : optIdx;

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
      const correct = examQs.filter((q, i) => isExamQCorrect(q, examAnswers[i])).length;
      const pct = Math.round((correct / examQs.length) * 100);
      onUpdateProgress({
        ...progress,
        examCount: progress.examCount + 1,
        examBest: Math.max(progress.examBest, pct),
      });
      setLatestScore({ correct, total: examQs.length, pct });
      setView('exam-done');
      window.scrollTo(0, 0);
    } else {
      setExamIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
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

      <div className="flex-1 flex flex-col min-w-0">
        <CourseHeader
          query={query}
          percentDone={percentDone}
          onQueryChange={(nextQuery) => {
            setQuery(nextQuery);
            if (nextQuery.trim()) setView('search');
            else if (view === 'search') setView('home');
          }}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNavigate={gotoPage}
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pb-20">
          {/* WIDOK: HOME */}
          {view === 'home' && (
            <div className="space-y-10">
              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sidebar via-sidebar/95 to-primary/80 text-white p-8 sm:p-12 shadow-xl">
                <div className="max-w-xl space-y-4">
                  <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                    ✦ Opracowane z Twoich wykładów
                  </Badge>
                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                    Bezpieczeństwo IT<br />nareszcie po ludzku.
                  </h1>
                  <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                    Zero wiedzy na wejściu? Tłumaczymy od podstaw: proste historie, schematy, fiszki i pytania jak na zejściówce.
                  </p>
                  <div className="pt-2">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="font-bold shadow-md"
                      onClick={() => {
                        const next = FALLBACK_LESSONS.find((l) => !progress.done.includes(l.id)) || FALLBACK_LESSONS[0];
                        gotoPage('lesson', next.id);
                      }}
                    >
                      {progress.done.length ? 'Kontynuuj naukę →' : 'Zacznij pierwszą lekcję →'}
                    </Button>
                  </div>
                </div>
              </section>

              {/* Statystyki */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Ukończone lekcje</CardDescription>
                    <CardTitle className="text-2xl font-bold">
                      {progress.done.length} <span className="text-xs font-normal text-muted-foreground">/ {TOTAL}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={percentDone} className="h-1.5" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Opanowane fiszki</CardDescription>
                    <CardTitle className="text-2xl font-bold">
                      {progress.flashKnown.length} <span className="text-xs font-normal text-muted-foreground">/ {FALLBACK_GLOSSARY.length}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Opanowane definicje i pojęcia</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Najlepszy wynik testu</CardDescription>
                    <CardTitle className="text-2xl font-bold">
                      {progress.examBest}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Rozwiązane testy: {progress.examCount}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Bloki wykładów */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">Twoje cztery wykłady</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { id: 1, title: 'Wykład 1 · Podstawy bezpieczeństwa', desc: 'CIA, NIST CSF, kontrola dostępu AAA, kategorie i typy zabezpieczeń.' },
                    { id: 2, title: 'Wykład 2 · Kryptografia', desc: 'Klucze, szyfry symetryczne i asymetryczne, hashowanie, certyfikaty PKI.' },
                    { id: 3, title: 'Wykład 3 · Aktorzy zagrożeń', desc: 'Motywacje, APT, insiderzy, wektory ataku, socjotechnika i phishing.' },
                    { id: 4, title: 'Wykład 4 · Malware i techniki ataków', desc: 'Ransomware, robaki, Wi-Fi on-path, spraying haseł, RCE i replay.' },
                  ].map((track) => (
                    <Card key={track.id} className="hover:border-primary/40 transition-colors flex flex-col justify-between">
                      <CardHeader>
                        <CardTitle className="text-base font-bold">{track.title}</CardTitle>
                        <CardDescription className="text-xs leading-relaxed">{track.desc}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex justify-between items-center text-xs text-muted-foreground">
                        <span>{FALLBACK_LESSONS.filter((l) => l.track === track.id).length} lekcji</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary gap-1"
                          onClick={() => {
                            setTrackFilter(track.id);
                            gotoPage('lessons');
                          }}
                        >
                          Zobacz lekcje <ArrowRight className="size-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* WIDOK: WSZYSTKIE LEKCJE */}
          {view === 'lessons' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge variant="outline">PROGRAM NAUKI</Badge>
                <h1 className="text-3xl font-extrabold tracking-tight">Lekcje kursu</h1>
              </div>

              <div className="flex flex-wrap gap-2 pb-2">
                {[0, 1, 2, 3, 4].map((t) => (
                  <Button
                    key={t}
                    variant={trackFilter === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTrackFilter(t)}
                  >
                    {t === 0 ? `Wszystkie (${TOTAL})` : `Wykład ${t}`}
                  </Button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {FALLBACK_LESSONS.filter((lesson) => !trackFilter || lesson.track === trackFilter).map((lesson) => (
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

          {/* WIDOK: POJEDYNCZA LEKCJA */}
          {view === 'lesson' && currentLesson && (
            <div className="space-y-6">
              <Button variant="ghost" size="sm" onClick={() => gotoPage('lessons')} className="gap-1.5 -ml-2">
                <ArrowLeft className="size-4" /> Wszystkie lekcje
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
                <div className="space-y-1">
                  <Badge variant="secondary">Wykład {currentLesson.track}</Badge>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{currentLesson.title}</h1>
                  <p className="text-xs text-muted-foreground">{currentLesson.slides}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={progress.done.includes(currentLesson.id) ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => handleToggleDone(currentLesson.id)}
                    className="gap-1.5"
                  >
                    <Check className="size-4" />
                    {progress.done.includes(currentLesson.id) ? 'Ukończona' : 'Oznacz jako opanowaną'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleReadLesson(currentLesson)}>
                    {isSpeaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
                <div className="space-y-8">
                  <Card className="p-6 sm:p-8 space-y-6 bg-card text-foreground">
                    {currentLesson.sections.map((sec, idx) => (
                      <div key={idx} className="space-y-3 pb-6 border-b last:border-b-0 last:pb-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          KROK {idx + 1}
                        </span>
                        <h3 className="text-lg font-bold">{sec.title}</h3>
                        {sec.paragraphs.map((p, pIdx) => (
                          <p key={pIdx} className="text-sm leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: p }} />
                        ))}
                      </div>
                    ))}
                  </Card>

                  {/* Quiz lekcji */}
                  <Card className="p-6 border-primary/20 bg-primary/5 space-y-6">
                    <div>
                      <Badge variant="outline" className="text-primary border-primary/30">ZEJŚCIÓWKA</Badge>
                      <h3 className="text-lg font-bold mt-1">Sprawdź, czy rozumiesz</h3>
                    </div>

                    {currentLesson.quiz.map((q, qIdx) => {
                      const qKey = `${currentLesson.id}-${qIdx}`;
                      const ans = quizAnswers[qKey];
                      const shown = quizShown[qKey];

                      return (
                        <div key={qIdx} className="space-y-3 pt-4 border-t border-primary/10">
                          <p className="text-sm font-semibold">{qIdx + 1}. {q.q}</p>
                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={shown}
                                onClick={() => handleMiniAnswer(qKey, optIdx)}
                                className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between ${
                                  ans === optIdx ? 'border-primary bg-primary/10 font-medium' : 'border-border bg-card hover:bg-muted/40'
                                } ${shown && optIdx === q.answer ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : ''}`}
                              >
                                <span>{opt}</span>
                                {shown && optIdx === q.answer && <Check className="size-4 text-emerald-600 shrink-0" />}
                              </button>
                            ))}
                          </div>

                          {shown ? (
                            <p className="text-xs p-3 rounded-lg bg-card border text-muted-foreground leading-relaxed">
                              💡 <strong>Wyjaśnienie:</strong> {q.why}
                            </p>
                          ) : (
                            <Button
                              size="sm"
                              disabled={ans === undefined}
                              onClick={() => handleMiniCheck(qKey, q, currentLesson.id)}
                            >
                              Sprawdź odpowiedź
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </Card>
                </div>

                {/* Boczne wskazówki */}
                <aside className="space-y-4 sticky top-20">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1.5">
                    <span className="font-bold text-primary flex items-center gap-1.5">
                      <Lightbulb className="size-3.5" /> Zapamiętaj
                    </span>
                    <p className="text-foreground/80 leading-relaxed">{currentLesson.remember}</p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-1.5">
                    <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                      <Sparkles className="size-3.5" /> Przykład z życia
                    </span>
                    <p className="text-foreground/80 leading-relaxed">{currentLesson.example}</p>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs space-y-1.5">
                    <span className="font-bold text-amber-600 flex items-center gap-1.5">
                      <ShieldAlert className="size-3.5" /> Częsta pomyłka
                    </span>
                    <p className="text-foreground/80 leading-relaxed">{currentLesson.pitfalls}</p>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {/* WIDOK: FISZKI */}
          {view === 'flash' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <Badge variant="outline">POWTÓRKI</Badge>
                <h1 className="text-3xl font-extrabold tracking-tight">Fiszki ze słownika</h1>
                <p className="text-xs text-muted-foreground">Karta {flashIndex + 1} z {FALLBACK_GLOSSARY.length}</p>
              </div>

              {(() => {
                const term = FALLBACK_GLOSSARY[flashIndex];
                const known = progress.flashKnown.includes(term[0]);

                return (
                  <div className="space-y-6">
                    <Card
                      className="min-h-[280px] p-8 flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all hover:shadow-lg border-primary/30 bg-card"
                      onClick={() => setFlashReveal(!flashReveal)}
                    >
                      <Badge variant="secondary" className="mb-4 text-[10px]">
                        {flashReveal ? 'ZNACZENIE' : 'POJĘCIE (KLIKNIJ ABY ODKRYĆ)'}
                      </Badge>
                      <h2 className="text-2xl font-bold tracking-tight">
                        {flashReveal ? term[1] : term[0]}
                      </h2>
                    </Card>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFlashIndex((flashIndex - 1 + FALLBACK_GLOSSARY.length) % FALLBACK_GLOSSARY.length);
                          setFlashReveal(false);
                        }}
                      >
                        ← Wstecz
                      </Button>
                      <Button
                        variant={known ? 'secondary' : 'default'}
                        size="sm"
                        onClick={handleToggleFlashKnown}
                        className="gap-1.5"
                      >
                        <Check className="size-4" /> {known ? 'Znam (cofnij)' : 'Oznacz: Znam'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFlashIndex((flashIndex + 1) % FALLBACK_GLOSSARY.length);
                          setFlashReveal(false);
                        }}
                      >
                        Dalej →
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* WIDOK: TEST W TOKU */}
          {view === 'exam-active' && examQs[examIndex] && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Pytanie {examIndex + 1} z {examQs.length}</span>
                  <span>{Math.round((examIndex / examQs.length) * 100)}%</span>
                </div>
                <Progress value={(examIndex / examQs.length) * 100} className="h-2" />
              </div>

              <Card className="p-6 sm:p-8 space-y-6">
                <div>
                  <Badge variant="outline" className="text-xs mb-2">
                    {examQs[examIndex].lessonTitle || 'Pytanie testowe'}
                  </Badge>
                  <h2 className="text-lg font-bold">{examQs[examIndex].q}</h2>
                </div>

                <div className="space-y-2">
                  {examQs[examIndex].options.map((opt, optIdx) => {
                    const curA = examAnswers[examIndex];
                    const sel = selectedChoices(curA).includes(optIdx);
                    const shown = Boolean(curA?.shown);

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={shown}
                        onClick={() => handleExamOptionClick(optIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${
                          sel ? 'border-primary bg-primary/10 font-medium' : 'border-border bg-card hover:bg-muted/30'
                        }`}
                      >
                        <span>{opt}</span>
                        {sel && <Check className="size-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setView('exam')}>
                    Przerwij
                  </Button>
                  {examAnswers[examIndex]?.shown ? (
                    <Button size="sm" onClick={handleExamNext}>
                      {examIndex === examQs.length - 1 ? 'Zobacz wynik 🏆' : 'Następne pytanie →'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!selectedChoices(examAnswers[examIndex]).length}
                      onClick={handleExamCheck}
                    >
                      Sprawdź
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* WIDOK: KONFIGURACJA TESTU */}
          {view === 'exam' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="space-y-2">
                <Badge variant="outline">TRENING</Badge>
                <h1 className="text-3xl font-extrabold tracking-tight">Próbny test wiedzy</h1>
              </div>

              <Card className="p-6 space-y-4">
                <label className="text-xs font-semibold text-foreground/80 block">Wybierz zakres pytań:</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="all">Wszystkie 4 wykłady (20 pytań)</option>
                  <option value="1">Wykład 1 · Podstawy (10 pytań)</option>
                  <option value="2">Wykład 2 · Kryptografia (10 pytań)</option>
                  <option value="3">Wykład 3 · Aktorzy (10 pytań)</option>
                  <option value="4">Wykład 4 · Malware (10 pytań)</option>
                  <option value="sec10">Security+ SY0-701 (10 pytań)</option>
                  <option value="sec20">Security+ SY0-701 (20 pytań)</option>
                  <option value="sec30">Security+ SY0-701 (30 pytań)</option>
                </select>

                <Button className="w-full" size="lg" onClick={() => handleStartExam(examType)}>
                  Rozpocznij test →
                </Button>
              </Card>
            </div>
          )}

          {/* WIDOK: WYNIK TESTU */}
          {view === 'exam-done' && (
            <div className="max-w-md mx-auto text-center space-y-6 py-10">
              <Card className="p-8 space-y-4">
                <Trophy className="size-16 text-primary mx-auto" />
                <h2 className="text-3xl font-black">{latestScore?.pct}%</h2>
                <p className="text-sm text-muted-foreground">
                  Poprawne odpowiedzi: {latestScore?.correct} z {latestScore?.total}
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <Button size="sm" onClick={() => handleStartExam(examType)}>
                    Spróbuj ponownie
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => gotoPage('lessons')}>
                    Do lekcji
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* WIDOK: SŁOWNIK */}
          {view === 'glossary' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge variant="outline">LEKSYKON</Badge>
                <h1 className="text-3xl font-extrabold tracking-tight">Słownik cyberpojęć ({FALLBACK_GLOSSARY.length})</h1>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {FALLBACK_GLOSSARY.map(([term, def], idx) => (
                  <Card key={idx} className="p-4 space-y-1">
                    <h3 className="font-bold text-sm text-primary">{term}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{def}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};