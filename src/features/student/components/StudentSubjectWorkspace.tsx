import type { SupabaseClient, User } from '@supabase/supabase-js';
import { BookOpen, CalendarDays, FileText, NotebookPen, RotateCcw, SquareCheckBig, Pencil, Plus } from 'lucide-react';

import type { StudentEntry, StudentSubject } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentCalendarView } from './StudentCalendarView';
import { StudentCourseWorkspace } from './StudentCourseWorkspace';
import { StudentNotesView } from './StudentNotesView';
import { StudentReviewsView } from './StudentReviewsView';
import { StudentSubjectMaterialsView } from './StudentSubjectMaterialsView';
import { StudentTasksView, type StudentTaskStatus } from './StudentTasksView';
import type { StudentEditorKind } from './StudentEditor';

export type StudentSubjectSection = 'course' | 'materials' | 'notes' | 'study' | 'events' | 'tasks';
type CreateEntryKind = Exclude<StudentEditorKind, 'subject'>;

interface StudentSubjectWorkspaceProps {
  client: SupabaseClient;
  user: User;
  subject: StudentSubject;
  entries: StudentEntry[];
  busy: boolean;
  section: StudentSubjectSection;
  onSectionChange: (section: StudentSubjectSection) => void;
  onBack: () => void;
  onCreateEntry: (kind: CreateEntryKind) => void;
  onEditSubject: () => void;
  onOpenEntry: (entry: StudentEntry, cardId?: string) => void;
  onUpdateTaskStatus: (entry: StudentEntry, status: StudentTaskStatus) => void;
  saveEntry: (entry: Partial<StudentEntry>) => Promise<StudentEntry>;
  refresh: () => Promise<StudentEntry[]>;
  notify: (message: string, error?: boolean) => void;
  autoBuild: boolean;
  onAutoBuildComplete: () => void;
}

const sections: { id: StudentSubjectSection; label: string; icon: typeof BookOpen }[] = [
  { id: 'course', label: 'Mój kurs', icon: BookOpen },
  { id: 'materials', label: 'Materiały', icon: FileText },
  { id: 'notes', label: 'Notatki', icon: NotebookPen },
  { id: 'study', label: 'Nauka', icon: RotateCcw },
  { id: 'events', label: 'Zajęcia', icon: CalendarDays },
  { id: 'tasks', label: 'Zadania', icon: SquareCheckBig },
];

export function StudentSubjectWorkspace({
  client,
  user,
  subject,
  entries,
  busy,
  section,
  onSectionChange,
  onBack,
  onCreateEntry,
  onEditSubject,
  onOpenEntry,
  onUpdateTaskStatus,
  saveEntry,
  refresh,
  notify,
  autoBuild,
  onAutoBuildComplete,
}: StudentSubjectWorkspaceProps) {
  const notes = entries.filter((entry) => entry.kind === 'note' || entry.kind === 'audio');
  const events = entries.filter((entry) => entry.kind === 'event');
  const tasks = entries.filter((entry) => entry.kind === 'task');
  const decks = entries.filter((entry) => entry.kind === 'deck');
  const materialCount = entries.filter((entry) => entry.kind === 'material' && !entry.payload.courseSnapshot).length;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={onBack} type="button">← Moje przedmioty</Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Przedmiot</Badge>
            <span className="text-xs text-muted-foreground">{entries.length} wpisów</span>
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold">{subject.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kurs, materiały i organizacja nauki w jednym miejscu.</p>
        </div>
        <Button variant="outline" onClick={onEditSubject} type="button"><Pencil /> Zmień nazwę</Button>
      </header>

      <Tabs value={section} onValueChange={(value) => onSectionChange(value as StudentSubjectSection)} orientation="horizontal" className="w-full min-w-0 flex-col gap-5">
        <TabsList variant="line" className="grid h-auto w-full grid-cols-2 justify-stretch gap-1 rounded-none border-b bg-transparent p-0 sm:grid-cols-3 xl:grid-cols-6">
          {sections.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="min-h-11 min-w-0 w-full flex-1 justify-center gap-2 px-2 text-center text-sm">
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 truncate">{label}</span>
              {id === 'materials' && <span className="text-xs text-muted-foreground">{materialCount}</span>}
              {id === 'notes' && <span className="text-xs text-muted-foreground">{notes.length}</span>}
              {id === 'study' && <span className="text-xs text-muted-foreground">{decks.length}</span>}
              {id === 'events' && <span className="text-xs text-muted-foreground">{events.length}</span>}
              {id === 'tasks' && <span className="text-xs text-muted-foreground">{tasks.length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0 w-full pt-1">
        <TabsContent value="course" className="mt-0">
          <StudentCourseWorkspace
            key={subject.id}
            client={client}
            user={user}
            subject={subject}
            entries={entries}
            saveEntry={saveEntry}
            refresh={refresh}
            notify={notify}
            autoBuild={autoBuild}
            onAutoBuildComplete={onAutoBuildComplete}
            onOpenEntry={onOpenEntry}
            onBack={onBack}
          />
        </TabsContent>

        <TabsContent value="materials" className="mt-0">
          <StudentSubjectMaterialsView entries={entries} onCreateMaterial={() => onCreateEntry('material')} onOpenEntry={onOpenEntry} />
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <StudentNotesView
            entries={notes}
            subjects={[subject]}
            onOpenEntry={onOpenEntry}
            onOpenSubjects={onBack}
            onCreateNote={() => onCreateEntry('note')}
            onCreateAudio={() => onCreateEntry('audio')}
          />
        </TabsContent>

        <TabsContent value="study" className="mt-0 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => onCreateEntry('deck')} type="button"><Plus /> Dodaj fiszki</Button>
          </div>
          <StudentReviewsView entries={decks} subjects={[subject]} onOpenEntry={onOpenEntry} onOpenSubjects={onBack} />
        </TabsContent>

        <TabsContent value="events" className="mt-0 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => onCreateEntry('event')} type="button"><Plus /> Dodaj zajęcia</Button>
          </div>
          <StudentCalendarView entries={events} subjects={[subject]} onOpenEntry={onOpenEntry} onOpenSubjects={onBack} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-0">
          <StudentTasksView entries={tasks} busy={busy} onCreateTask={() => onCreateEntry('task')} onUpdateStatus={onUpdateTaskStatus} onOpenEntry={onOpenEntry} />
        </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
