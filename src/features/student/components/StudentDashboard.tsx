import React from 'react';
import type { User } from '@supabase/supabase-js';
import { studentStats } from '../lib/student-stats.js';
import { coursePlan } from '../lib/subject-course.js';
import { dateKey, dueCards, occursOn } from '../lib/student-model.js';
import type { ProgressState, StudentEntry, StudentSubject } from '../../../types.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Layers, 
  CheckSquare, 
  Flame, 
  Plus, 
  ArrowRight, 
  Calendar as CalendarIcon, 
  Clock 
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  subjects: StudentSubject[];
  entries: StudentEntry[];
  builtinProgress: ProgressState;
  onNavigate: (view: 'subjects' | 'tasks' | 'calendar' | 'reviews' | 'subject') => void;
  onOpenSubject: (subjectId: string) => void;
  onCreateSubject: () => void;
  onOpenBuiltinCourse: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  subjects,
  entries,
  builtinProgress,
  onNavigate,
  onOpenSubject,
  onCreateSubject,
  onOpenBuiltinCourse,
}) => {
  const today = new Date();
  const activeSubjects = subjects.filter((s) => !s.archived);
  const activeEntries = entries.filter((e) => !e.archived && !e.payload.courseSnapshot);
  const due = dueCards(activeEntries);
  const tasks = activeEntries
    .filter((e) => e.kind === 'task' && e.payload.status !== 'done')
    .sort((a, b) => (a.payload.due || '9999').localeCompare(b.payload.due || '9999'));
  const events = activeEntries
    .filter((e) => e.kind === 'event' && occursOn(e, today))
    .sort((a, b) => (a.payload.start || '').localeCompare(b.payload.start || ''));
  const stats = studentStats(subjects, entries, user.id, { progress: builtinProgress });

  return (
    <div className="student-view-shell">
      <header className="student-view-header">
        <Badge variant="outline" className="gap-1.5">
          <BookOpen className="size-3" /> Pulpit
        </Badge>
        <h1 className="student-view-title">Twoje centrum nauki</h1>
        <p className="student-view-copy">
          Krótkie podsumowanie dnia, najważniejszych zadań i aktywności w jednym miejscu. Wróć do nauki w chwili, gdy pojawi się najlepszy moment.
        </p>
      </header>

      {/* Baner powitalny */}
      <section className="rounded-3xl p-6 sm:p-10 border bg-gradient-to-br from-primary/10 via-card to-background space-y-4">
        <Badge variant="outline" className="text-primary border-primary/30">
          Studeo · niezbędnik studencki
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Mniej chaosu.<br />Więcej zrozumienia.
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
          Materiały, terminy i powtórki w Twojej prywatnej przestrzeni. Dziś:{' '}
          <span className="text-foreground font-medium capitalize">
            {today.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={() => onNavigate(due.length ? 'reviews' : 'subjects')} className="gap-2">
            {due.length ? 'Zacznij powtórkę' : 'Przejdź do przedmiotów'} <ArrowRight className="size-4" />
          </Button>
          <Button variant="outline" onClick={onCreateSubject} className="gap-1.5">
            <Plus className="size-4" /> Dodaj przedmiot
          </Button>
        </div>
      </section>

      {/* Szybkie liczniki */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => onNavigate('subjects')}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Twoje przedmioty</CardDescription>
            <CardTitle className="text-3xl font-extrabold">{activeSubjects.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="size-3.5 text-primary" /> Aktywne w tym semestrze
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => onNavigate('reviews')}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Fiszki do powtórki</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-primary">{due.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Layers className="size-3.5 text-primary" /> Czekają w algorytmie SRS
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => onNavigate('tasks')}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Otwarte zadania</CardDescription>
            <CardTitle className="text-3xl font-extrabold">{tasks.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckSquare className="size-3.5 text-primary" /> Do zrobienia w terminie
          </CardContent>
        </Card>
      </div>

      {/* Twoje statystyki */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between pb-2 border-b">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Postępy</span>
            <h2 className="text-xl font-bold">Twoja aktywność</h2>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Flame className="size-3.5 text-amber-500" /> Seria: {stats.streak} dni
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Ukończone lekcje</span>
              <span className="font-bold">{stats.doneLessons} / {stats.totalLessons}</span>
            </div>
            <Progress value={(stats.doneLessons / Math.max(stats.totalLessons, 1)) * 100} className="h-1.5" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Opanowane fiszki</span>
              <span className="font-bold">{stats.known} / {stats.cards}</span>
            </div>
            <Progress value={(stats.known / Math.max(stats.cards, 1)) * 100} className="h-1.5" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Wykonane zadania</span>
              <span className="font-bold">{stats.doneTasks} / {stats.tasks}</span>
            </div>
            <Progress value={(stats.doneTasks / Math.max(stats.tasks, 1)) * 100} className="h-1.5" />
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground block">Ostatnie 7 dni</span>
            <div className="flex gap-1.5">
              {stats.week.map((day) => (
                <div
                  key={day.date}
                  className={`flex-1 py-1 rounded-md text-center text-[10px] font-semibold ${
                    day.active 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                  title={day.date}
                >
                  {day.date.slice(8)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Zadania i plan na dziś */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Najbliższe zadania
            </h2>
            <Button variant="ghost" size="xs" onClick={() => onNavigate('tasks')}>Wszystkie</Button>
          </div>
          {tasks.length ? (
            <div className="space-y-2">
              {tasks.slice(0, 4).map((entry) => (
                <div key={entry.id} className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-sm">{entry.title}</p>
                    <span className="text-muted-foreground">
                      {subjects.find((s) => s.id === entry.subject_id)?.title}
                    </span>
                  </div>
                  <Badge variant={entry.payload.due && entry.payload.due < dateKey(today) ? 'destructive' : 'outline'}>
                    {entry.payload.due || 'Bez terminu'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Brak zaplanowanych zadań.</p>
          )}
        </Card>

        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="font-bold text-base flex items-center gap-2">
              <CalendarIcon className="size-4 text-primary" /> Dzisiejsze zajęcia
            </h2>
            <Button variant="ghost" size="xs" onClick={() => onNavigate('calendar')}>Kalendarz</Button>
          </div>
          {events.length ? (
            <div className="space-y-2">
              {events.map((entry) => (
                <div key={entry.id} className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-sm">{entry.title}</p>
                    <span className="text-muted-foreground">
                      {subjects.find((s) => s.id === entry.subject_id)?.title} · sala {entry.payload.room || '—'}
                    </span>
                  </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant="secondary">
                        {entry.payload.start}–{entry.payload.end}
                      </Badge>
                      {subjects.some((subject) => subject.id === entry.subject_id && !subject.archived) && (
                        <Button size="xs" variant="ghost" onClick={() => onOpenSubject(entry.subject_id)} type="button">
                          Otwórz przedmiot
                        </Button>
                      )}
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Dziś nie masz zaplanowanych zajęć.</p>
          )}
        </Card>
      </div>

      {/* Twoje kursy */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Biblioteka kursów</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="flex flex-col justify-between hover:border-primary/40 transition-colors">
            <CardHeader>
              <Badge variant="secondary" className="w-fit text-[10px]">KURS SYSTEMOWY</Badge>
              <CardTitle className="text-lg">Od zera do hakera</CardTitle>
              <CardDescription className="text-xs">34 lekcje · fiszki · testy · słownik</CardDescription>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button size="sm" className="w-full" onClick={onOpenBuiltinCourse}>
                Otwórz kurs →
              </Button>
            </div>
          </Card>

          {activeSubjects.map((subject) => {
            const plan = coursePlan(entries, subject.id);
            const lessons = plan.current.flatMap(({ deck }) => deck.payload.sections || []);
            if (!lessons.length && !plan.pending.length) return null;
            const completed = plan.current.reduce(
              (total, { deck }) => total + Object.keys(deck.payload.lessonDone || {}).length,
              0,
            );
            const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
            return (
              <Card key={subject.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
                <CardHeader>
                  <Badge variant="outline" className="w-fit text-[10px]">TWÓJ PRYWATNY KURS</Badge>
                  <CardTitle className="text-lg">{subject.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {plan.current.length} {plan.current.length === 1 ? 'moduł' : 'moduły'} · {lessons.length} lekcji
                  </CardDescription>
                </CardHeader>
                <div className="p-6 pt-0">
                  {lessons.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Postęp kursu</span><span>{progress}%</span>
                      </div>
                      <Progress value={progress} aria-label={`Postęp kursu ${subject.title}`} />
                    </div>
                  )}
                  {plan.pending.length > 0 && (
                    <p className="mb-3 text-xs font-medium text-primary">
                      {plan.pending.length} {plan.pending.length === 1 ? 'nowa część czeka' : 'nowe części czekają'} na opracowanie
                    </p>
                  )}
                  <Button size="sm" variant="outline" className="w-full" onClick={() => onOpenSubject(subject.id)}>
                    Wejdź do kursu →
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};