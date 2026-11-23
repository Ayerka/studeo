import React from 'react';
import { AudioLines, FileText, Mic, NotebookPen, Plus } from 'lucide-react';
import type { StudentEntry, StudentSubject } from '../../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StudentNotesViewProps {
  entries: StudentEntry[];
  subjects: StudentSubject[];
  onOpenEntry: (entry: StudentEntry) => void;
  onOpenSubjects: () => void;
  onCreateNote: () => void;
  onCreateAudio: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return 'Brak daty';
  return new Date(value).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPreview = (entry: StudentEntry) => {
  if (entry.kind === 'note') {
    const text = entry.payload.text || entry.payload.pages?.map((page) => page.text).join(' ') || 'Brak treści';
    return text.replace(/\s+/g, ' ').slice(0, 170) || 'Brak treści';
  }

  return entry.payload.fileName || 'Nagranie audio';
};

export const StudentNotesView: React.FC<StudentNotesViewProps> = ({
  entries,
  subjects,
  onOpenEntry,
  onOpenSubjects,
  onCreateNote,
  onCreateAudio,
}) => {
  const notes = entries.filter((entry) => entry.kind === 'note');
  const audio = entries.filter((entry) => entry.kind === 'audio');
  const newest = [...entries].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.title]));

  return (
    <section className="student-view-shell">
      <header className="student-view-header">
        <Badge variant="outline" className="gap-1.5">
          <NotebookPen className="size-3" /> Notatki
        </Badge>
        <h1 className="student-view-title">Notatki i nagrania</h1>
        <p className="student-view-copy">
          Wszystkie Twoje notatki, materiały audio i szybkie podsumowania w jednym miejscu. Kliknij wpis, aby wrócić do treści.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onCreateNote} type="button" className="gap-2">
          <FileText className="size-4" /> Dodaj notatkę
        </Button>
        <Button variant="outline" onClick={onCreateAudio} type="button" className="gap-2">
          <Mic className="size-4" /> Dodaj nagranie
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Notatki</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{notes.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-4 text-primary" /> Tekstowe zapisy
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Nagrania</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{audio.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <AudioLines className="size-4 text-primary" /> Dźwiękowe materiały
          </CardContent>
        </Card>

        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Ostatni wpis</CardDescription>
            <CardTitle className="text-lg font-semibold">{newest ? newest.title : 'Brak'}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {newest ? formatDate(newest.created_at) : 'Dodaj pierwszy wpis'}
          </CardContent>
        </Card>
      </div>

      {!entries.length ? (
        <Card className="gap-3 border-dashed py-8 text-center shadow-none">
          <CardContent className="space-y-3">
            <NotebookPen className="mx-auto size-7 text-muted-foreground" />
            <h2 className="font-semibold">Brak notatek i nagrań</h2>
            <p className="text-sm text-muted-foreground">Zacznij od pierwszej notatki albo nagrania, aby tworzyć własną bazę wiedzy.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={onCreateNote} type="button">Dodaj notatkę</Button>
              <Button onClick={onCreateAudio} type="button">Dodaj nagranie</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {notes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Notatki</h2>
                <Badge variant="secondary">{notes.length}</Badge>
              </div>
              <div className="space-y-3">
                {notes.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onOpenEntry(entry)}
                    className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">{subjectNames.get(entry.subject_id) || 'Bez przedmiotu'}</p>
                      </div>
                      <Badge variant="outline">{formatDate(entry.created_at)}</Badge>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{getPreview(entry)}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {audio.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Nagrania audio</h2>
                <Badge variant="secondary">{audio.length}</Badge>
              </div>
              <div className="space-y-3">
                {audio.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onOpenEntry(entry)}
                    className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">{subjectNames.get(entry.subject_id) || 'Bez przedmiotu'}</p>
                      </div>
                      <Badge variant="outline">{formatDate(entry.created_at)}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Mic className="size-4 text-primary" />
                      <span>{getPreview(entry)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" onClick={onOpenSubjects} type="button">Przejdź do przedmiotów</Button>
      </div>
    </section>
  );
};
