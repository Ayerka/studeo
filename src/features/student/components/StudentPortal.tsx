import React, { useEffect, useRef, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  completeTask,
  makeStudy,
  parseManualCards,
  reviewCard,
  validateEvent,
} from '../lib/student-model';
import type { ProgressState, StudentEntry, StudentSubject } from '../../../types';
import { useStudentData } from '../hooks/useStudentData';
import { useStudentNavigation } from '../hooks/useStudentNavigation';
import { Button } from '@/components/ui/button';
import { StudentDashboard } from './StudentDashboard';
import { StudentSubjectsView } from './StudentSubjectsView';
import { StudentTasksView, type StudentTaskStatus } from './StudentTasksView';
import {
  StudentEditor,
  type StudentEditorKind,
  type StudentEditorValues,
} from './StudentEditor';
import {
  StudentPortalShell,
} from '@/features/student/components/layout/StudentPortalShell';
import type { StudentView } from '../types';
import { StudentSubjectWorkspace, type StudentSubjectSection } from './StudentSubjectWorkspace';
import { uploadStudentFile } from '../lib/student-storage';
import { createStudentBackup, readStudentBackup } from '../lib/student-backup';
import { StudentEntryView } from './StudentEntryView';
import { StudentMaterialViewer } from './StudentMaterialViewer';
import { StudentReviewsView } from './StudentReviewsView';
import { StudentCalendarView } from './StudentCalendarView';
import { StudentNotesView } from './StudentNotesView';
import { StudentArchiveView } from './StudentArchiveView';
import { AvailableCoursesView } from './AvailableCoursesView';
import { StudentCourseLibraryView } from './StudentCourseLibraryView';
import type { PublicCourse } from '@/types';

interface StudentPortalProps {
  client: SupabaseClient;
  user: User;
  builtinProgress: ProgressState;
  onOpenCourse: () => void;
  onOpenProfile: () => void;
  onLogout: () => Promise<void>;
  onEntriesChange?: (entries: StudentEntry[]) => void;
  courseState?: Record<string, unknown>;
  onImportCourse?: (backup: Record<string, any>) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  client,
  user,
  builtinProgress,
  onOpenCourse,
  onOpenProfile,
  onLogout,
  onEntriesChange,
  courseState,
  onImportCourse,
}) => {
  const data = useStudentData(client, user);
  const navigation = useStudentNavigation();

  const view = navigation.view;
  const setView = navigation.setView;

  const subjectId = navigation.subjectId;
  const selectedEntryId = navigation.entryId;
  const [subjectSection, setSubjectSection] = useState<StudentSubjectSection>('course');
  const [reviewStartCardId, setReviewStartCardId] = useState<string | null>(null);
  const [entryReturnView, setEntryReturnView] = useState<StudentView>('subject');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [editorKind, setEditorKind] = useState<StudentEditorKind | null>(null);
  const [editingEntry, setEditingEntry] = useState<StudentEntry | null>(null);
  const [editingSubject, setEditingSubject] = useState<StudentSubject | null>(null);
  const [editorReturnView, setEditorReturnView] = useState<StudentView>('home');

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [autoBuildCourse, setAutoBuildCourse] = useState(false);
  const backupFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onEntriesChange?.(data.entries);
  }, [data.entries, onEntriesChange]);

  const activeSubjects = data.subjects.filter((subject) => !subject.archived);
  const activeSubjectIds = new Set(activeSubjects.map((subject) => subject.id));

  const activeEntries = data.entries.filter(
    (entry) =>
      !entry.archived &&
      !entry.payload.courseSnapshot &&
      activeSubjectIds.has(entry.subject_id),
  );

  const currentSubject =
    activeSubjects.find((subject) => subject.id === subjectId) ?? null;
  const selectedEntry = data.entries.find((entry) => entry.id === selectedEntryId) ?? null;

  useEffect(() => {
    let active = true;
    setAudioUrl(null);
    if (view === 'entry' && selectedEntry?.kind === 'audio' && selectedEntry.payload.path) {
      void client.storage.from('student-private')
        .createSignedUrl(selectedEntry.payload.path, 60 * 60)
        .then(({ data: signed, error }) => {
          if (active && !error) setAudioUrl(signed.signedUrl);
        });
    }
    return () => { active = false; };
  }, [client, selectedEntry?.id, selectedEntry?.kind, selectedEntry?.payload.path, view]);

  const notify = (text: string, isError = false) => {
    setMessage(text);
    setMessageError(isError);
  };

  const run = async (operation: () => Promise<void>) => {
    if (busy) return;

    setBusy(true);
    notify('Przetwarzam…');

    try {
      await operation();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Wystąpił nieznany błąd.';

      notify(errorMessage, true);
    } finally {
      setBusy(false);
    }
  };

  const clearEditor = () => {
    setEditorKind(null);
    setEditingEntry(null);
    setEditingSubject(null);
  };

  const openSubject = (id: string) => {
    setSubjectSection('course');
    clearEditor();
    navigation.openSubject(id);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const beginEditor = (
    kind: StudentEditorKind,
    entry: StudentEntry | null = null,
    subject: StudentSubject | null = null,
  ) => {
    if (kind !== 'subject' && activeSubjects.length === 0) {
      notify('Najpierw dodaj przedmiot.', true);
      return;
    }

    setEditingEntry(entry);
    setEditingSubject(subject);
    setEditorReturnView(view);
    setEditorKind(kind);
    navigation.openEditor();
  };

  const cancelEditor = () => {
    clearEditor();
    setView(editorReturnView);
  };

  const updateTaskStatus = (
    entry: StudentEntry,
    status: StudentTaskStatus,
  ) => {
    void run(async () => {
      const payload =
        status === 'done'
          ? completeTask({ ...entry.payload, status })
          : { ...entry.payload, status, completedAt: null };

      await data.saveEntry({
        ...entry,
        payload,
      });

      notify('Status zadania został zaktualizowany.');
    });
  };

  const handleEditorSubmit = async (values: StudentEditorValues) => {
    if (!editorKind) {
      notify('Nie wybrano typu wpisu.', true);
      return;
    }

    await run(async () => {
      if (editorKind === 'subject') {
        const saved = await data.saveSubject({
          id: editingSubject?.id || undefined,
          title: values.title.trim(),
        });

        if (!editingSubject) setSubjectSection('course');
        clearEditor();
        navigation.openSubject(saved.id);
        notify('Przedmiot został zapisany.');
        return;
      }

      if (!values.subjectId) {
        throw new Error('Wybierz przedmiot.');
      }

      let payload: StudentEntry['payload'] = { ...(editingEntry?.payload ?? {}) };

      if (editorKind === 'note') {
        payload = { ...payload, text: values.text, workNotes: values.workNotes };
      } else if (editorKind === 'event') {
        payload = validateEvent({
          date: values.date,
          until: values.until,
          start: values.start,
          end: values.end,
          weekly: values.weekly,
          address: values.address,
          room: values.room,
          building: values.building,
        });
      } else if (editorKind === 'task') {
        const pending = [
          ...values.sourceFiles.map((file) => ({ file, role: 'source' as const })),
          ...values.submissionFiles.map((file) => ({ file, role: 'submission' as const })),
        ];
        const attachments = [...(editingEntry?.payload.attachments ?? [])];
        if (attachments.length + pending.length > 20) {
          throw new Error('Zadanie może mieć maksymalnie 20 załączników.');
        }
        for (const { file, role } of pending) {
          if (!/\.(pdf|docx?|pptx?|xlsx?|txt|md|csv|png|jpe?g)$/i.test(file.name)) {
            throw new Error('Nieobsługiwany format załącznika.');
          }
          attachments.push({
            id: crypto.randomUUID(),
            role,
            name: file.name,
            path: await uploadStudentFile(client, file, data.plan),
            at: new Date().toISOString(),
          });
        }
        payload = {
          ...payload,
          description: values.description,
          workNotes: values.workNotes,
          workNotesUpdatedAt: values.workNotes !== editingEntry?.payload.workNotes
            ? new Date().toISOString()
            : editingEntry?.payload.workNotesUpdatedAt,
          due: values.due,
          repeat: values.repeat as 'none' | 'daily' | 'weekly',
          status: values.status as 'todo' | 'doing' | 'done',
          completedAt: values.status === 'done'
            ? editingEntry?.payload.completedAt || new Date().toISOString()
            : null,
          attachments,
        };
        if (values.status === 'done' && editingEntry?.payload.status !== 'done') {
          payload = completeTask(payload);
        }
      } else if (editorKind === 'deck') {
        payload = { cards: parseManualCards(values.cards), sections: [], method: 'manual' };
      } else if (editorKind === 'material') {
        const { readMaterial } = await import('../lib/student-files.js');
        if (values.pdfPageRange && (!values.file || !/\.pdf$/i.test(values.file.name) || values.text.trim())) {
          throw new Error('Zakres stron wymaga wybranego pliku PDF.');
        }
        const pages = values.text.trim()
          ? [{ page: 1, text: values.text.trim() }]
          : values.file
            ? await readMaterial(values.file, values.pdfPageRange)
            : editingEntry?.payload.pages ?? [];
        if (!pages.some((page) => page.text.trim()) && !values.file && !editingEntry?.payload.path) {
          throw new Error('Dodaj tekst albo plik PDF, TXT lub MD.');
        }
        const path = values.file
          ? await uploadStudentFile(client, values.file, data.plan)
          : editingEntry?.payload.path;
        payload = {
          ...payload,
          pages,
          path,
          fileName: values.file?.name ?? editingEntry?.payload.fileName ?? '',
          fileRemoved: values.file ? false : editingEntry?.payload.fileRemoved,
          ...(values.pdfPageRange ? { pdfPageRange: values.pdfPageRange } : {}),
        };
      } else if (editorKind === 'audio') {
        if (!values.audio?.size || !values.audio.type.startsWith('audio/')) {
          throw new Error('Nagraj lub wybierz plik audio.');
        }
        payload = {
          ...payload,
          path: await uploadStudentFile(client, values.audio, data.plan),
          fileName: values.audio.name,
        };
      }

      await data.saveEntry({
        id: editingEntry?.id,
        subject_id: values.subjectId,
        kind: editorKind,
        title: values.title.trim() || 'Wpis',
        payload,
      });

      clearEditor();
      navigation.openSubject(values.subjectId);
    });
  };

  const handleNavigate = (nextView: StudentView) => {
    clearEditor();
    setView(nextView);
  };

  const openEntry = (entry: StudentEntry, cardId?: string, returnView: StudentView = 'subject') => {
    setReviewStartCardId(cardId || null);
    setEntryReturnView(returnView);
    navigation.openEntry(entry.id);
  };

  const downloadFile = async (path: string, name: string) => {
    const { data: file, error } = await client.storage.from('student-private').download(path);
    if (error) throw error;
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const saveEntryAndNotify = async (input: Partial<StudentEntry>) => {
    const saved = await data.saveEntry(input);
    notify('Zmiany zostały zapisane.');
    return saved;
  };

  const generateStudy = async (entry: StudentEntry) => {
    const pages = entry.payload.pages?.length
      ? entry.payload.pages
      : entry.payload.text ? [{ page: 1, text: entry.payload.text }] : [];
    const study = makeStudy(pages);
    if (!study.cards.length) throw new Error('Dodaj więcej treści, aby utworzyć ćwiczenia.');
    const deck = await data.saveEntry({
      subject_id: entry.subject_id,
      kind: 'deck',
      title: `${entry.title.slice(0, 100)} — nauka`,
      payload: { ...study, sourceId: entry.id },
    });
    openEntry(deck);
  };

  const archiveEntry = async () => {
    if (!selectedEntry) return;
    await run(async () => {
      const restore = Boolean(selectedEntry.archived);
      await data.saveEntry({ ...selectedEntry, archived: !restore });
      setView(restore ? 'subjects' : 'archive');
      notify(restore ? 'Wpis przywrócono z archiwum.' : 'Wpis przeniesiono do archiwum.');
    });
  };

  const askTaskAI = async (question: string) => {
    if (!selectedEntry || selectedEntry.kind !== 'task') return '';
    let answer = '';
    await run(async () => {
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) throw new Error('Zaloguj się ponownie.');
      const response = await fetch('/api/task-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ taskId: selectedEntry.id, question }),
        signal: AbortSignal.timeout(95_000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nie udało się uzyskać pomocy AI.');
      answer = String(result.answer || '');
      if (result.saved) {
        await data.refresh();
        notify('Odpowiedź zapisana jako notatka w przedmiocie.');
      } else {
        notify(result.warning || 'Odpowiedź powstała, ale nie została zapisana. Skopiuj ją przed zamknięciem.', true);
      }
    });
    return answer;
  };

  const exportBackup = () => {
    const backup = createStudentBackup(data.subjects, data.entries, courseState);
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `studeo-kopia-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    notify('Kopia danych została pobrana. Oryginalne pliki pobierz osobno z profilu.');
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    await run(async () => {
      const backup = await readStudentBackup(file);
      if (backup.subjects.length || backup.entries.length) {
        const result = await data.importStudentData(backup.subjects, backup.entries);
        notify(`Przywrócono ${result.subjects} przedmiotów i ${result.entries} wpisów. Załączniki binarne nie są częścią kopii.`);
      }
      if (backup.state) onImportCourse?.({ state: backup.state, progress: backup.state.progress });
      if (!backup.subjects.length && !backup.entries.length && !backup.state) {
        throw new Error('Kopia nie zawiera danych do przywrócenia.');
      }
    });
  };

  const addPublicCourse = async (course: PublicCourse) => {
    await run(async () => {
      const existing = data.subjects.find((subject) =>
        subject.title === course.title ||
        data.entries.some((entry) => entry.subject_id === subject.id && entry.payload.publicCourseSlug === course.slug)
      );

      const subject = existing ?? await data.saveSubject({ title: course.title });

      for (const lesson of course.content.lessons) {
        const alreadyAdded = data.entries.some((entry) =>
          entry.subject_id === subject.id && entry.kind === 'deck' && entry.payload.publicCourseLessonId === lesson.id
        );
        if (alreadyAdded) continue;

        await data.saveEntry({
          subject_id: subject.id,
          kind: 'deck',
          title: lesson.title,
          payload: {
            publicCourseSlug: course.slug,
            publicCourseLessonId: lesson.id,
            cards: lesson.quiz.map((question, index) => ({
              id: question.id || `${lesson.id}-${index}`,
              front: question.q,
              back: question.why,
            })),
            sections: lesson.sections.map((section) => ({
              title: section.title,
              text: section.paragraphs.join('\n'),
              quote: section.bullets?.join('\n'),
            })),
            questions: lesson.quiz,
          },
        });
      }

      await data.refresh();
      openSubject(subject.id);
      notify('Kurs został dodany do biblioteki.');
    });
  };

  return (
    <StudentPortalShell
      user={user}
      plan={data.plan}
      view={view}
      status={message || data.status}
      onNavigate={handleNavigate}
      onRefresh={() =>
        void run(async () => {
          await data.refresh();
          notify('Dane zostały zsynchronizowane.');
        })
      }
      onOpenProfile={onOpenProfile}
      onLogout={() => void run(onLogout)}
    >
      {view === 'edit' && editorKind && (
        <StudentEditor
          key={`${editorKind}-${editingEntry?.id ?? editingSubject?.id ?? 'new'}`}
          kind={editorKind}
          subjects={activeSubjects}
          subjectId={subjectId}
          entry={editingEntry}
          subject={editingSubject}
          busy={busy}
          onCancel={cancelEditor}
          onSubmit={handleEditorSubmit}
        />
      )}

      {view === 'home' && (
        <StudentDashboard
          user={user}
          subjects={data.subjects}
          entries={data.entries}
          builtinProgress={builtinProgress}
          onNavigate={handleNavigate}
          onOpenSubject={openSubject}
          onCreateSubject={() => beginEditor('subject')}
          onOpenBuiltinCourse={onOpenCourse}
        />
      )}

      {view === 'subjects' && (
        <StudentSubjectsView
          subjects={activeSubjects}
          entries={activeEntries}
          onCreateSubject={() => beginEditor('subject')}
          onOpenSubject={openSubject}
        />
      )}

      {view === 'tasks' && (
        <StudentTasksView
          entries={activeEntries}
          busy={busy}
          onCreateTask={() => beginEditor('task')}
          onUpdateStatus={updateTaskStatus}
          onOpenEntry={openEntry}
        />
      )}

      {view === 'entry' && selectedEntry && (
        selectedEntry.kind === 'material' ? (
          <StudentMaterialViewer
            client={client}
            entry={selectedEntry}
            onSave={saveEntryAndNotify}
            onDownload={() => void run(() => downloadFile(selectedEntry.payload.path!, selectedEntry.payload.fileName || selectedEntry.title))}
            onBuildCourse={() => { openSubject(selectedEntry.subject_id); setAutoBuildCourse(true); }}
            onArchive={() => void archiveEntry()}
          />
        ) : (
          <StudentEntryView
            key={selectedEntry.id}
            entry={selectedEntry}
            initialCardId={reviewStartCardId}
            subject={data.subjects.find((item) => item.id === selectedEntry.subject_id) ?? null}
            audioUrl={audioUrl}
            busy={busy}
            onBack={() => setView(entryReturnView)}
            onEdit={() => beginEditor(selectedEntry.kind, selectedEntry)}
            onDownload={() => void run(() => downloadFile(selectedEntry.payload.path!, selectedEntry.payload.fileName || selectedEntry.title))}
            onDownloadAttachment={(path, name) => void run(() => downloadFile(path, name))}
            onGenerate={() => void run(() => generateStudy(selectedEntry))}
            onGenerateAI={() => { openSubject(selectedEntry.subject_id); setAutoBuildCourse(true); }}
            onSave={data.saveEntry}
            onRate={(entry, cardId, grade) => {
              const card = entry.payload.cards?.find((item) => item.id === cardId);
              if (!card) return;
              void run(async () => {
                await data.saveEntry({ ...entry, payload: { ...entry.payload, cards: entry.payload.cards?.map((item) => item.id === cardId ? reviewCard(card, grade) : item) } });
              });
            }}
            onTaskAI={askTaskAI}
            onArchive={() => void archiveEntry()}
            notify={notify}
          />
        )
      )}

      {view === 'reviews' && <StudentReviewsView
        entries={activeEntries}
        subjects={activeSubjects}
        onOpenEntry={(entry, cardId) => openEntry(entry, cardId, 'reviews')}
        onOpenSubjects={() => handleNavigate('subjects')}
      />}
      {view === 'calendar' && <StudentCalendarView
        entries={activeEntries}
        subjects={activeSubjects}
        onOpenEntry={(entry) => openEntry(entry, undefined, 'calendar')}
        onOpenSubjects={() => handleNavigate('subjects')}
      />}
      {view === 'notes' && <StudentNotesView
        entries={activeEntries.filter((entry) => entry.kind === 'note' || entry.kind === 'audio')}
        subjects={activeSubjects}
        onOpenEntry={(entry) => openEntry(entry, undefined, 'notes')}
        onOpenSubjects={() => handleNavigate('subjects')}
        onCreateNote={() => beginEditor('note')}
        onCreateAudio={() => beginEditor('audio')}
      />}
      {view === 'archive' && <StudentArchiveView
        entries={data.entries.filter((entry) => entry.archived)}
        subjects={activeSubjects}
        onOpenEntry={(entry) => openEntry(entry, undefined, 'archive')}
        onOpenSubjects={() => handleNavigate('subjects')}
      />}
      {view === 'plan' && <section className="max-w-xl space-y-5"><h1 className="text-2xl font-semibold">Plan konta</h1><p className="text-lg">{data.plan.name}</p><dl className="grid grid-cols-2 gap-3 border-y py-4 text-sm"><dt>Miejsce na pliki</dt><dd>{data.plan.limits.storage_bytes > 0 ? `${(data.plan.limits.storage_bytes / 1e9).toLocaleString('pl-PL')} GB` : 'Niedostępne'}</dd><dt>Limit na plik</dt><dd>{data.plan.limits.file_bytes > 0 ? `${Math.round(data.plan.limits.file_bytes / (1024 * 1024))} MB` : 'Niedostępny'}</dd><dt>Operacje AI dziennie</dt><dd>{data.plan.limits.ai_per_day || 'Niedostępne'}</dd></dl><Button variant="outline" onClick={onOpenProfile} type="button">Użycie i pliki</Button><div className="space-y-2 border-t pt-4"><h2 className="font-semibold">Kopia zapasowa</h2><p className="text-sm text-muted-foreground">Kopia zawiera postępy, przedmioty i wpisy. Oryginalne pliki pobierz osobno z profilu.</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportBackup} type="button">Pobierz kopię</Button><Button onClick={() => backupFileRef.current?.click()} type="button">Przywróć kopię</Button><input ref={backupFileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { void importBackup(event.target.files?.[0]); event.target.value = ''; }} /></div></div></section>}

      {view === 'subject' && currentSubject && (
        <StudentSubjectWorkspace
          client={client}
          user={user}
          subject={currentSubject}
          entries={data.entries.filter((entry) => entry.subject_id === currentSubject.id && !entry.archived)}
          busy={busy}
          section={subjectSection}
          onSectionChange={setSubjectSection}
          onBack={() => setView('subjects')}
          onCreateEntry={(kind) => beginEditor(kind)}
          onEditSubject={() => beginEditor('subject', null, currentSubject)}
          onOpenEntry={openEntry}
          onUpdateTaskStatus={updateTaskStatus}
          saveEntry={data.saveEntry}
          refresh={data.refresh}
          notify={notify}
          autoBuild={autoBuildCourse}
          onAutoBuildComplete={() => setAutoBuildCourse(false)}
        />
      )}

      {view === 'courses' && (
        <AvailableCoursesView
          client={client}
          subjects={activeSubjects}
          entries={data.entries}
          busy={busy}
          onAddCourse={addPublicCourse}
          onOpenSubject={openSubject}
        />
      )}

      {view === 'library' && (
        <StudentCourseLibraryView
          subjects={activeSubjects}
          entries={data.entries}
          builtinProgress={builtinProgress}
          onOpenBuiltinCourse={onOpenCourse}
          onOpenSubject={openSubject}
          onBrowseCourses={() => handleNavigate('courses')}
        />
      )}
    </StudentPortalShell>
  );
};