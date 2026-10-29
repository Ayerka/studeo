import React from 'react';
import type { User } from '@supabase/supabase-js';
import { studentStats } from '../../student-stats.js';
import { coursePlan } from '../../subject-course.js';
import { dateKey, dueCards, occursOn } from '../../student-model';
import type { ProgressState, StudentEntry, StudentSubject } from '../../types';

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
  const activeSubjects = subjects.filter((subject) => !subject.archived);
  const activeEntries = entries.filter((entry) => !entry.archived && !entry.payload.courseSnapshot);
  const due = dueCards(activeEntries);
  const tasks = activeEntries
    .filter((entry) => entry.kind === 'task' && entry.payload.status !== 'done')
    .sort((a, b) => (a.payload.due || '9999').localeCompare(b.payload.due || '9999'));
  const events = activeEntries
    .filter((entry) => entry.kind === 'event' && occursOn(entry, today))
    .sort((a, b) => (a.payload.start || '').localeCompare(b.payload.start || ''));
  const stats = studentStats(subjects, entries, user.id, { progress: builtinProgress });

  return (
    <>
      <section className="student-hero studeo-welcome">
        <span className="student-eyebrow">Studeo · niezbędnik studencki</span>
        <h1>Mniej chaosu.<br />Więcej zrozumienia.</h1>
        <p className="student-muted">
          Materiały, terminy i powtórki w jednej prywatnej przestrzeni. Dziś:{' '}
          {today.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}.
        </p>
        <div className="student-actions">
          <button className="student-primary" onClick={() => onNavigate(due.length ? 'reviews' : 'subjects')} type="button">
            {due.length ? 'Zacznij powtórkę →' : 'Otwórz moje przedmioty →'}
          </button>
          <button className="student-quiet" onClick={onCreateSubject} type="button">+ Dodaj przedmiot</button>
        </div>
      </section>

      <section className="studeo-stats" aria-label="Podsumowanie nauki">
        <button type="button" onClick={() => onNavigate('subjects')}><strong>{activeSubjects.length}</strong><span>Twoje przedmioty</span></button>
        <button type="button" onClick={() => onNavigate('reviews')}><strong>{due.length}</strong><span>Fiszki do powtórki</span></button>
        <button type="button" onClick={() => onNavigate('tasks')}><strong>{tasks.length}</strong><span>Otwarte zadania</span></button>
      </section>

      <section className="student-card student-insights" aria-label="Twoje statystyki">
        <header>
          <div><span className="student-eyebrow">Każdy krok się liczy</span><h2>Twoje statystyki</h2></div>
          <span className="student-pill">Tylko Twoje konto</span>
        </header>
        <div className="student-insights-grid">
          <article><div><span>Ukończone lekcje</span><strong>{stats.doneLessons}<small> / {stats.totalLessons}</small></strong></div><progress value={stats.doneLessons} max={Math.max(stats.totalLessons, 1)} aria-label="Ukończone lekcje" /><p>Aktualne kursy + „Od zera do hakera”.</p></article>
          <article><div><span>Powtórki fiszek</span><strong>{stats.reviews}</strong></div><progress value={stats.known} max={Math.max(stats.cards, 1)} aria-label="Opanowane fiszki" /><p>{stats.known} z {stats.cards} fiszek opanowanych w Twoich przedmiotach.</p></article>
          <article><div><span>Zadania gotowe</span><strong>{stats.doneTasks}<small> / {stats.tasks}</small></strong></div><progress value={stats.doneTasks} max={Math.max(stats.tasks, 1)} aria-label="Zadania gotowe" /><p>{stats.repeated} zapisanych wykonań zadań cyklicznych.</p></article>
          <article><div><span>Seria dni nauki</span><strong>{stats.streak}<small> dni</small></strong></div><div className="student-study-week" aria-label="Ostatnie 7 dni nauki">{stats.week.map((day) => <span key={day.date} className={day.active ? 'is-active' : ''} title={day.date}>{day.active ? '✓' : '·'}<small>{day.date.slice(8)}</small></span>)}</div><p>Jedna lekcja, ocena fiszki lub odpowiedź w teście to krok dalej.</p></article>
        </div>
        <details><summary>Jak liczymy statystyki?</summary><p>Liczniki obejmują aktywne przedmioty i zachowane wyniki. Archiwizacja może je zmniejszyć. Serię liczymy według czasu w Polsce.</p></details>
      </section>

      {!activeSubjects.length && <section className="student-card"><h2>Twój pierwszy krok</h2><p>Dodaj przedmiot, wgraj materiał lub zapisz notatkę, a potem ucz się z fiszek i ćwiczeń.</p><button className="student-primary" onClick={onCreateSubject} type="button">Dodaj pierwszy przedmiot</button></section>}

      <section className="student-grid studeo-dashboard">
        <div><h2>Najbliższe zadania</h2>{tasks.slice(0, 4).map((entry) => <article className="student-item" key={entry.id}><span className={entry.payload.due && entry.payload.due < dateKey(today) ? 'student-overdue' : 'student-muted'}>{entry.payload.due || 'Bez terminu'}</span><h3>{entry.title}</h3><p>{subjects.find((subject) => subject.id === entry.subject_id)?.title}</p><button className="student-quiet" onClick={() => onNavigate('tasks')} type="button">Zobacz zadania</button></article>)}{!tasks.length && <p className="student-muted">Nie masz otwartych zadań.</p>}</div>
        <div><h2>Dzisiejsze zajęcia</h2>{events.map((entry) => <article className="student-item" key={entry.id}><strong>{entry.payload.start}–{entry.payload.end}</strong><h3>{entry.title}</h3><p>{subjects.find((subject) => subject.id === entry.subject_id)?.title} · {entry.payload.address || 'Adres niepodany'}</p><button className="student-quiet" onClick={() => onOpenSubject(entry.subject_id)} type="button">Otwórz przedmiot</button></article>)}{!events.length && <p className="student-muted">Dziś nie masz zaplanowanych zajęć.</p>}</div>
      </section>

      <section className="studeo-library" aria-label="Biblioteka kursów">
        <h2>Twoje kursy</h2>
        <div className="student-grid">
          <article className="student-card"><span className="student-eyebrow">Biblioteka kursów</span><h3>Od zera do hakera</h3><p>34 lekcje · fiszki · testy · słownik</p><button className="student-primary" onClick={onOpenBuiltinCourse} type="button">Wejdź do kursu →</button></article>
          {activeSubjects.map((subject) => {
            const plan = coursePlan(entries, subject.id);
            const lessons = plan.current.flatMap(({ deck }) => deck.payload.sections || []);
            if (!lessons.length && !plan.pending.length) return null;
            const done = plan.current.reduce((sum, { deck }) => sum + Object.keys(deck.payload.lessonDone || {}).length, 0);
            return <article className="student-card" key={subject.id}><span className="student-eyebrow">Twój prywatny kurs</span><h3>{subject.title}</h3><p>{lessons.length} lekcji · {plan.current.length} modułów{plan.pending.length ? ' · nowe materiały czekają' : ''}</p><progress max={Math.max(1, lessons.length)} value={done} aria-label={`Postęp kursu ${subject.title}`} /><button className="student-primary" onClick={() => onOpenSubject(subject.id)} type="button">Wejdź do kursu →</button></article>;
          })}
        </div>
      </section>
    </>
  );
};