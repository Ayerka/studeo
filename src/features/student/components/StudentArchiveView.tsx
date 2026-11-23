import React from 'react';
import { Archive, ArrowUpRight, FileText, FolderArchive, Layers3, NotebookPen, Mic } from 'lucide-react';
import type { StudentEntry, StudentSubject } from '../../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StudentArchiveViewProps {
  entries: StudentEntry[];
  subjects: StudentSubject[];
  onOpenEntry: (entry: StudentEntry) => void;
  onOpenSubjects: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return 'Brak daty';
  return new Date(value).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getEntryTypeLabel = (kind: StudentEntry['kind']) => {
  switch (kind) {
    case 'material': return 'Materiał';
    case 'note': return 'Notatka';
    case 'task': return 'Zadanie';
    case 'event': return 'Zajęcia';
    case 'deck': return 'Fiszki';
    case 'audio': return 'Nagranie';
    default: return 'Wpis';
  }
};

const getEntryTypeIcon = (kind: StudentEntry['kind']) => {
  switch (kind) {
    case 'material': return FileText;
    case 'note': return NotebookPen;
    case 'audio': return Mic;
    case 'deck': return Layers3;
    default: return FolderArchive;
  }
};

export const StudentArchiveView: React.FC<StudentArchiveViewProps> = ({
  entries,
  subjects,
  onOpenEntry,
  onOpenSubjects,
}) => {
  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.title]));
  const archivedByType = {
    total: entries.length,
    materials: entries.filter((entry) => entry.kind === 'material').length,
    notes: entries.filter((entry) => entry.kind === 'note').length,
    tasks: entries.filter((entry) => entry.kind === 'task').length,
    decks: entries.filter((entry) => entry.kind === 'deck').length,
    audio: entries.filter((entry) => entry.kind === 'audio').length,
  };

  return (
    <section className="student-view-shell">
      <header className="student-view-header">
        <Badge variant="outline" className="gap-1.5">
          <Archive className="size-3" /> Archiwum
        </Badge>
        <h1 className="student-view-title">Archiwum wpisów</h1>
        <p className="student-view-copy">
          Zarchiwizowane treści pozostają w systemie, ale są oddzielone od bieżących materiałów i zadań. W każdej chwili możesz je przywrócić.
        </p>
      </header>

      <div className="student-view-stats">
        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Wszystkie wpisy</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{archivedByType.total}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Archive className="size-4 text-primary" /> Zarchiwizowane treści
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Materiały</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{archivedByType.materials}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-4 text-primary" /> Zapisane artefakty
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Notatki i nagrania</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{archivedByType.notes + archivedByType.audio}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <NotebookPen className="size-4 text-primary" /> Zawartość wspomagająca
          </CardContent>
        </Card>
      </div>

      {entries.length === 0 ? (
        <Card className="gap-3 border-dashed py-8 text-center shadow-none">
          <CardContent className="space-y-3">
            <Archive className="mx-auto size-7 text-muted-foreground" />
            <h2 className="font-semibold">Brak zarchiwizowanych wpisów</h2>
            <p className="text-sm text-muted-foreground">Tutaj pojawią się materiały, zadania i notatki, które przeniesiesz do archiwum.</p>
            <Button variant="outline" onClick={onOpenSubjects} type="button">Przejdź do przedmiotów</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const Icon = getEntryTypeIcon(entry.kind);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpenEntry(entry)}
                className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {getEntryTypeLabel(entry.kind)}
                      </span>
                    </div>
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{subjectNames.get(entry.subject_id) || 'Bez przedmiotu'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{formatDate(entry.created_at)}</Badge>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
