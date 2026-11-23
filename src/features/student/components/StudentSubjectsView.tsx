import React from 'react';
import type { StudentEntry, StudentSubject } from '../../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, FolderOpen, NotebookPen, Plus } from 'lucide-react';

interface StudentSubjectsViewProps {
  subjects: StudentSubject[];
  entries: StudentEntry[];
  onCreateSubject: () => void;
  onOpenSubject: (subjectId: string) => void;
}

export const StudentSubjectsView: React.FC<StudentSubjectsViewProps> = ({
  subjects,
  entries,
  onCreateSubject,
  onOpenSubject,
}) => {
  const subjectCounts = new Map<string, { total: number; materials: number; tasks: number; events: number; notes: number }>();

  subjects.forEach((subject) => {
    subjectCounts.set(subject.id, { total: 0, materials: 0, tasks: 0, events: 0, notes: 0 });
  });

  entries.forEach((entry) => {
    const counts = subjectCounts.get(entry.subject_id);
    if (!counts) return;

    counts.total += 1;
    if (entry.kind === 'material') counts.materials += 1;
    if (entry.kind === 'task') counts.tasks += 1;
    if (entry.kind === 'event') counts.events += 1;
    if (entry.kind === 'note' || entry.kind === 'audio') counts.notes += 1;
  });

  const totalItems = entries.length;

  return (
    <section className="student-view-shell">
      <header className="student-view-header">
        <Badge variant="outline" className="gap-1.5">
          <FolderOpen className="size-3" /> Przedmioty
        </Badge>
        <h1 className="student-view-title">Twoje przedmioty</h1>
        <p className="student-view-copy">
          Organizuj materiały, zadania, zajęcia i notatki w jednym miejscu. Kliknij przedmiot, aby wejść do jego przestrzeni pracy.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onCreateSubject} type="button" className="gap-2">
          <Plus className="size-4" /> Dodaj przedmiot
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Przedmioty</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{subjects.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="size-4 text-primary" /> Aktywne profile nauki
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Wpisy</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{totalItems}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <NotebookPen className="size-4 text-primary" /> Materiały i zadania
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Najbardziej aktywny</CardDescription>
            <CardTitle className="text-lg font-semibold">
              {subjects.length ? subjects.reduce((best, current) => {
                  const bestCount = subjectCounts.get(best.id)?.total ?? 0;
                  const currentCount = subjectCounts.get(current.id)?.total ?? 0;
                  return currentCount > bestCount ? current : best;
                }).title : 'Brak'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {subjects.length ? 'Najwięcej wpisów w Twoim planie' : 'Dodaj pierwszy przedmiot'}
          </CardContent>
        </Card>
      </div>

      {subjects.length === 0 ? (
        <Card className="gap-3 border-dashed py-8 text-center shadow-none">
          <CardContent className="space-y-3">
            <FolderOpen className="mx-auto size-7 text-muted-foreground" />
            <h2 className="font-semibold">Nie masz jeszcze żadnych przedmiotów</h2>
            <p className="text-sm text-muted-foreground">Dodaj pierwszy przedmiot, aby rozpocząć organizację materiałów, zadań i zajęć.</p>
            <Button variant="outline" onClick={onCreateSubject} type="button">Utwórz przedmiot</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const counts = subjectCounts.get(subject.id) ?? { total: 0, materials: 0, tasks: 0, events: 0, notes: 0 };

            return (
              <Card key={subject.id} className="group gap-4 shadow-none transition-colors hover:border-primary/40">
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="truncate text-base">{subject.title}</CardTitle>
                      <CardDescription>{counts.total} wpisów</CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{counts.total}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {counts.materials > 0 && (
                      <span className="rounded-full border bg-muted/40 px-2 py-1">{counts.materials} materiałów</span>
                    )}
                    {counts.tasks > 0 && (
                      <span className="rounded-full border bg-muted/40 px-2 py-1">{counts.tasks} zadań</span>
                    )}
                    {counts.events > 0 && (
                      <span className="rounded-full border bg-muted/40 px-2 py-1">{counts.events} zajęć</span>
                    )}
                    {counts.notes > 0 && (
                      <span className="rounded-full border bg-muted/40 px-2 py-1">{counts.notes} notatek</span>
                    )}
                  </div>

                  <Button className="w-full justify-between" onClick={() => onOpenSubject(subject.id)} type="button">
                    Otwórz przedmiot <ArrowRight className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};