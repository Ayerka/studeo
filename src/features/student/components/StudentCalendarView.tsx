import React from 'react';
import { ArrowRight, CalendarDays, Clock3, MapPin, Repeat2 } from 'lucide-react';
import type { StudentEntry, StudentSubject } from '../../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dateKey } from '../lib/student-model';

interface StudentCalendarViewProps {
  entries: StudentEntry[];
  subjects: StudentSubject[];
  onOpenEntry: (entry: StudentEntry) => void;
  onOpenSubjects: () => void;
}

const formatDateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const formatShortDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('pl-PL', {
  day: 'numeric',
  month: 'short',
});

const getDateGapInDays = (value: string, from: Date) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const target = new Date(`${value}T00:00:00`);
  const diff = target.getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

export const StudentCalendarView: React.FC<StudentCalendarViewProps> = ({
  entries,
  subjects,
  onOpenEntry,
  onOpenSubjects,
}) => {
  const today = new Date();
  const todayKey = dateKey(today);
  const events = entries
    .filter((entry) => entry.kind === 'event' && !entry.archived)
    .sort((a, b) => (a.payload.date || '').localeCompare(b.payload.date || '') || (a.payload.start || '').localeCompare(b.payload.start || ''));

  const grouped = new Map<string, StudentEntry[]>();
  events.forEach((entry) => {
    const key = entry.payload.date || todayKey;
    const group = grouped.get(key) || [];
    group.push(entry);
    grouped.set(key, group);
  });

  const upcomingGroups = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  const todayCount = events.filter((entry) => entry.payload.date === todayKey).length;
  const nextSevenCount = events.filter((entry) => {
    const value = entry.payload.date;
    return value && getDateGapInDays(value, today) >= 0 && getDateGapInDays(value, today) <= 7;
  }).length;
  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.title]));

  return (
    <section className="student-view-shell">
      <header className="student-view-header">
        <Badge variant="outline" className="gap-1.5">
          <CalendarDays className="size-3" /> Kalendarz
        </Badge>
        <h1 className="student-view-title">Kalendarz zajęć</h1>
        <p className="student-view-copy">
          Przeglądaj plan zajęć, terminy i powtarzalne wydarzenia w jednym miejscu. Kliknij wpis, aby otworzyć szczegóły.
        </p>
      </header>

      <div className="student-view-stats">
        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Wszystkie wydarzenia</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{events.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-4 text-primary" /> Planowane w semestrze
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Dziś</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{todayCount}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4 text-primary" /> W Twoim dzisiejszym planie
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Nadchodzące</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{nextSevenCount}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight className="size-4 text-primary" /> W kolejnych 7 dniach
          </CardContent>
        </Card>
      </div>

      {upcomingGroups.length ? (
        <div className="space-y-4">
          {upcomingGroups.map(([date, group]) => (
            <section key={date} className="rounded-xl border bg-muted/20 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {date === todayKey ? 'Dziś' : 'Termin'}
                  </p>
                  <h2 className="text-lg font-semibold">{formatDateLabel(date)}</h2>
                </div>
                <Badge variant="secondary">{group.length} {group.length === 1 ? 'wpis' : 'wpisy'}</Badge>
              </div>

              <div className="space-y-3">
                {group.map((entry) => {
                  const time = entry.payload.start && entry.payload.end
                    ? `${entry.payload.start}–${entry.payload.end}`
                    : entry.payload.start || 'Bez godziny';
                  const location = [entry.payload.address, entry.payload.room, entry.payload.building].filter(Boolean).join(', ') || 'Brak lokalizacji';

                  return (
                    <div key={entry.id} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-sm leading-5">{entry.title}</p>
                          <p className="text-xs text-muted-foreground">{subjectNames.get(entry.subject_id) || 'Bez przedmiotu'}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => onOpenEntry(entry)} type="button">Otwórz</Button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-1">
                          <Clock3 className="size-3.5" /> {time}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-1">
                          <CalendarDays className="size-3.5" /> {formatShortDate(date)}
                        </span>
                        {location && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-1">
                            <MapPin className="size-3.5" /> {location}
                          </span>
                        )}
                        {entry.payload.weekly && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-1">
                            <Repeat2 className="size-3.5" /> Co tydzień
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="gap-3 border-dashed py-8 text-center shadow-none">
          <CardContent className="space-y-3">
            <CalendarDays className="mx-auto size-7 text-muted-foreground" />
            <h2 className="font-semibold">Brak zapisanych zajęć</h2>
            <p className="text-sm text-muted-foreground">Dodaj nowy przedmiot lub utwórz pierwsze wydarzenie, aby uzupełnić kalendarz.</p>
            <Button variant="outline" onClick={onOpenSubjects} type="button">Przejdź do przedmiotów</Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
};
