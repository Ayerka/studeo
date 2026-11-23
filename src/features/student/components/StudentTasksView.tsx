import React from 'react';
import type { StudentEntry } from '../../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCheck, CircleDashed, Clock3, Plus } from 'lucide-react';

export type StudentTaskStatus = 'todo' | 'doing' | 'done';

interface StudentTasksViewProps {
  entries: StudentEntry[];
  busy: boolean;
  onCreateTask: () => void;
  onUpdateStatus: (entry: StudentEntry, status: StudentTaskStatus) => void;
  onOpenEntry: (entry: StudentEntry) => void;
}

const columnLabels: Record<StudentTaskStatus, string> = {
  todo: 'Do zrobienia',
  doing: 'W trakcie',
  done: 'Gotowe',
};

const statusIcons = {
  todo: CircleDashed,
  doing: Clock3,
  done: CheckCheck,
};

const formatDueDate = (value?: string) => {
  if (!value) return 'Bez terminu';
  return new Date(`${value}T00:00:00`).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
  });
};

export const StudentTasksView: React.FC<StudentTasksViewProps> = ({
  entries,
  busy,
  onCreateTask,
  onUpdateStatus,
  onOpenEntry,
}) => {
  const tasks = entries.filter((entry) => entry.kind === 'task');
  const todo = tasks.filter((entry) => (entry.payload.status || 'todo') === 'todo');
  const doing = tasks.filter((entry) => entry.payload.status === 'doing');
  const done = tasks.filter((entry) => entry.payload.status === 'done');
  const overdue = todo.filter((task) => task.payload.due && task.payload.due < new Date().toISOString().slice(0, 10)).length;

  return (
    <section className="student-view-shell">
      <header className="student-view-header">
        <Badge variant="outline" className="gap-1.5">
          <CheckCheck className="size-3" /> Do zrobienia
        </Badge>
        <h1 className="student-view-title">Zadania i terminy</h1>
        <p className="student-view-copy">
          Śledź priorytety, miej pod ręką najbliższe terminy i przechodź między etapami wprost z tablicy zadań.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onCreateTask} type="button" className="gap-2">
          <Plus className="size-4" /> Dodaj zadanie
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Do zrobienia</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{todo.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <CircleDashed className="size-4 text-primary" /> Priorytet na dziś
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">W trakcie</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{doing.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4 text-primary" /> Aktywne zadania
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Po terminie</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{overdue}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight className="size-4 text-primary" /> Wymagają uwagi
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {(['todo', 'doing', 'done'] as const).map((column) => {
          const Icon = statusIcons[column];
          const columnTasks = tasks.filter((entry) => (entry.payload.status || 'todo') === column);

          return (
            <div key={column} className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Icon className="size-3.5" />
                  {columnLabels[column]}
                </span>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </div>

              {columnTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-background/50 px-3 py-6 text-center text-xs text-muted-foreground">
                  Brak zadań w tej kolumnie.
                </div>
              ) : (
                columnTasks.map((task) => (
                  <Card key={task.id} className="space-y-3 p-3 shadow-none">
                    <div className="space-y-2">
                      <CardTitle className="text-sm font-semibold leading-snug">{task.title}</CardTitle>
                      {task.payload.due && (
                        <p className={`text-[11px] ${task.payload.due < new Date().toISOString().slice(0, 10) && column === 'todo' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          Termin: {formatDueDate(task.payload.due)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Button variant="ghost" size="sm" className="h-8 px-0" onClick={() => onOpenEntry(task)} type="button">
                        Otwórz
                      </Button>

                      {column !== 'done' && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => onUpdateStatus(task, column === 'todo' ? 'doing' : 'done')}
                          disabled={busy}
                        >
                          {column === 'todo' ? 'W trakcie' : 'Zakończ'}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};