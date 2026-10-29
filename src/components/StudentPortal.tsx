import React, { useEffect, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  completeTask,
  dateKey,
  dueCards,
  fileLimitText,
  makeStudy,
  MAX_FILE,
  occursOn,
  parseManualCards,
  reviewCard,
  validateEvent,
} from '../student-model';
import { coursePlan } from '../subject-course.js';
import type { ProgressState, StudentEntry, StudentSubject } from '../types';
import { useStudentData } from '../hooks/useStudentData';
import { StudentDashboard } from './student/StudentDashboard';
import { StudentEditor, type StudentEditorKind, type StudentEditorValues } from './student/StudentEditor';
import { StudentPortalShell, type StudentView } from './student/StudentPortalShell';
import { StudentCourseWorkspace } from './student/StudentCourseWorkspace';
import { StudentMaterialViewer } from './student/StudentMaterialViewer';
import { StudentEntryView } from './student/StudentEntryView';
import '../student.css';

type SubjectTab = 'course' | 'materials' | 'notes' | 'study' | 'events' | 'tasks' | 'settings';

interface StudentPortalProps {
  client: SupabaseClient;
  user: User;
  builtinProgress: ProgressState;
  onOpenCourse: () => void;
  onOpenProfile: () => void;
  onLogout: () => Promise<void>;
  onEntriesChange?: (entries: StudentEntry[]) => void;
}

const activeEntryKinds: Record<Exclude<SubjectTab, 'course' | 'settings'>, StudentEntry['kind'][]> = {
  materials: ['material'], notes: ['note', 'audio'], study: ['deck'], events: ['event'], tasks: ['task'],
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

function saveDownload(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function weekDates(date: Date) {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + index);
    return day;
  });
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  client,
  user,
  builtinProgress,
  onOpenCourse,
  onOpenProfile,
  onLogout,
  onEntriesChange,
}) => {
  const data = useStudentData(client, user);
  const [view, setView] = useState<StudentView>('home');
  const [subjectId, setSubjectId] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [subjectTab, setSubjectTab] = useState<SubjectTab>('course');
  const [editorKind, setEditorKind] = useState<StudentEditorKind | null>(null);
  const [editingEntry, setEditingEntry] = useState<StudentEntry | null>(null);
  const [editingSubject, setEditingSubject] = useState<StudentSubject | null>(null);
  const [week, setWeek] = useState(new Date());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [taskQuestion, setTaskQuestion] = useState('');
  const [taskAnswer, setTaskAnswer] = useState('');
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [autoBuildCourse, setAutoBuildCourse] = useState(false);

  useEffect(() => () => { if (audioSrc) URL.revokeObjectURL(audioSrc); }, [audioSrc]);
  useEffect(() => { onEntriesChange?.(data.entries); }, [data.entries, onEntriesChange]);

  const activeSubjects = data.subjects.filter((subject) => !subject.archived);
  const activeSubjectIds = new Set(activeSubjects.map((subject) => subject.id));
  const activeEntries = data.entries.filter((entry) => !entry.archived && !entry.payload.courseSnapshot && activeSubjectIds.has(entry.subject_id));
  const currentSubject = data.subjects.find((subject) => subject.id === subjectId) || null;
  const selectedEntry = data.entries.find((entry) => entry.id === selectedEntryId) || null;

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
    } catch (error: any) {
      notify(error?.message || 'Nie udało się wykonać operacji. Sprawdź połączenie i spróbuj ponownie.', true);
    } finally {
      setBusy(false);
    }
  };

  const openSubject = (id: string, tab: SubjectTab = 'course') => {
    setSubjectId(id);
    setSubjectTab(tab);
    setView('subject');
    setEditorKind(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEntry = (entry: StudentEntry) => {
    setSelectedEntryId(entry.id);
    setSubjectId(entry.subject_id);
    setView('entry');
  };

  const beginEditor = (kind: StudentEditorKind, entry: StudentEntry | null = null) => {
    if (kind !== 'subject' && !activeSubjects.length) {
      notify('Najpierw dodaj przedmiot.', true);
      return;
    }
    setEditingEntry(entry);
    setEditingSubject(null);
    setEditorKind(kind);
    setView('edit');
  };

  const editSubject = (subject: StudentSubject) => {
    setEditingEntry(null);
    setEditingSubject(subject);
    setEditorKind('subject');
    setView('edit');
  };

  const uploadFile = async (file: File) => {
    if (file.size > data.plan.limits.file_bytes || file.size > MAX_FILE) throw new Error(fileLimitText(data.plan));
    const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'plik';
    const reservation = await client.rpc('student_reserve_upload', { file_name: name });
    if (reservation.error) {
      throw new Error(reservation.error.code === '53400'
        ? 'Brak miejsca na plik. Zwolnij miejsce w profilu i spróbuj ponownie.'
        : 'Nie udało się zarezerwować miejsca na plik.');
    }
    const path = reservation.data as string;
    const { error } = await client.storage.from('student-private').upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
    if (error) throw error;
    const finished = await client.rpc('student_finish_upload', { object_path: path });
    if (finished.error) throw finished.error;
    return path;
  };

  const handleEditorSubmit = async (values: StudentEditorValues) => {
    await run(async () => {
      if (editorKind === 'subject') {
        const saved = await data.saveSubject({ id: editingSubject?.id || undefined, title: values.title });
        setSubjectId(saved.id);
        setEditorKind(null);
        setEditingSubject(null);
        setView('subject');
        notify('Przedmiot zapisany.');
        return;
      }

      if (!values.subjectId) throw new Error('Najpierw dodaj przedmiot.');
      if (editorKind === 'task' && values.repeat !== 'none' && !values.due) throw new Error('Zadanie cykliczne wymaga terminu.');
      let payload: StudentEntry['payload'] = {};
      let kind: StudentEntry['kind'] = editorKind || 'note';
      let created: StudentEntry | null = null;

      if (editorKind === 'note') payload = { ...(editingEntry?.payload || {}), text: values.text };
      if (editorKind === 'event') payload = validateEvent({
        date: values.date, until: values.until, start: values.start, end: values.end,
        weekly: values.weekly, address: values.address, room: values.room, building: values.building,
      });
      if (editorKind === 'task') {
        const pending = [
          ...values.sourceFiles.map((file) => ({ file, role: 'source' as const })),
          ...values.submissionFiles.map((file) => ({ file, role: 'submission' as const })),
        ];
        const oldAttachments = editingEntry?.payload.attachments || [];
        if (oldAttachments.length + pending.length > 20) throw new Error('Zadanie może mieć maksymalnie 20 załączników.');
        const attachments = [...oldAttachments];
        for (const { file, role } of pending) {
          if (!/\.(pdf|docx?|pptx?|xlsx?|txt|md|csv|png|jpe?g)$/i.test(file.name)) throw new Error('Nieobsługiwany format załącznika.');
          attachments.push({ id: crypto.randomUUID(), role, name: file.name, path: await uploadFile(file), at: new Date().toISOString() });
        }
        const previous = editingEntry?.payload || {};
        payload = {
          ...previous, description: values.description, workNotes: values.workNotes,
          workNotesUpdatedAt: values.workNotes !== previous.workNotes ? new Date().toISOString() : previous.workNotesUpdatedAt,
          due: values.due, repeat: values.repeat as 'none' | 'daily' | 'weekly',
          status: values.status as 'todo' | 'doing' | 'done',
          completedAt: values.status === 'done' ? previous.completedAt || new Date().toISOString() : null,
          attachments,
        };
        if (values.status === 'done' && previous.status !== 'done') payload = completeTask(payload);
      }
      if (editorKind === 'deck') payload = { cards: parseManualCards(values.cards), sections: [], method: 'manual' };
      if (editorKind === 'material') {
        const pages = values.text
          ? [{ page: 1, text: values.text }]
          : values.file
            ? await (await import('../student-files.js')).readMaterial(values.file, values.pdfPageRange)
            : [];
        if (values.pdfPageRange && (!values.file || !/\.pdf$/i.test(values.file.name))) throw new Error('Zakres stron wymaga pliku PDF.');
        if (!pages.length && !values.file) throw new Error('Dodaj plik albo wklej tekst materiału.');
        if (values.pdfPageRange && values.text) throw new Error('Wybierz zakres stron PDF albo wklej treść, nie oba naraz.');
        const path = values.file ? await uploadFile(values.file) : '';
        payload = { pages, path, fileName: values.file?.name || '', ...(values.pdfPageRange ? { pdfPageRange: values.pdfPageRange } : {}) };
      }
      if (editorKind === 'audio') {
        if (!values.audio?.size) throw new Error('Nagraj lub wybierz plik audio.');
        if (!values.audio.type.startsWith('audio/')) throw new Error('Wybierz plik dźwiękowy.');
        payload = { path: await uploadFile(values.audio), fileName: values.audio.name };
      }

      created = await data.saveEntry({
        id: editingEntry?.id,
        subject_id: values.subjectId,
        kind,
        title: values.title || values.file?.name || 'Wpis',
        payload,
      });
      setSubjectId(values.subjectId);
      setEditorKind(null);
      setView('subject');
      setSubjectTab(editorKind === 'note' || editorKind === 'audio' ? 'notes' : editorKind === 'task' ? 'tasks' : editorKind === 'deck' ? 'study' : 'materials');
      notify('✓ Zapisano na Twoim koncie.');

      if (editorKind === 'material' && created && payload.pages?.some((page) => page.text.trim())) {
        try {
          const study = makeStudy(payload.pages);
          if (study.cards.length) await data.saveEntry({ subject_id: created.subject_id, kind: 'deck', title: `${created.title.slice(0, 100)} — nauka`, payload: { ...study, sourceId: created.id } });
        } catch (error: any) {
          notify(`Materiał zapisano, ale nie utworzono ćwiczeń: ${error.message}`, true);
        }
      }

      if (values.makeCourse && ['material', 'note'].includes(editorKind || '') && created) {
        setView('subject');
        setSubjectTab('course');
        setSelectedEntryId(created.id);
        setAutoBuildCourse(true);
        notify('Materiał zapisany. Uruchamiam opracowanie kursu…');
      }
    });
  };

  const archiveEntry = (entry: StudentEntry) => run(async () => {
    await data.saveEntry({ ...entry, archived: !entry.archived });
    notify(entry.archived ? 'Wpis przywrócony.' : 'Wpis przeniesiony do archiwum.');
  });

  const archiveSubject = (subject: StudentSubject) => run(async () => {
    await data.saveSubject({ ...subject, archived: !subject.archived });
    setView('subjects');
    notify(subject.archived ? 'Przedmiot przywrócony.' : 'Przedmiot przeniesiony do archiwum.');
  });

  const updateTaskStatus = (entry: StudentEntry, status: 'todo' | 'doing' | 'done') => run(async () => {
    const payload = status === 'done'
      ? completeTask({ ...entry.payload, status })
      : { ...entry.payload, status, completedAt: null };
    await data.saveEntry({ ...entry, payload });
    notify('Status zadania zapisany.');
  });

  const gradeCard = (deck: StudentEntry, cardId: string, grade: 'again' | 'hard' | 'good' | 'easy') => run(async () => {
    const cards = deck.payload.cards || [];
    const card = cards.find((item) => item.id === cardId);
    if (!card) throw new Error('Nie znaleziono fiszki.');
    const rated = reviewCard(card, grade);
    await data.saveEntry({ ...deck, payload: { ...deck.payload, cards: cards.map((item) => item.id === cardId ? rated : item) } });
    notify(`Powtórka zapisana. Kolejny termin: ${new Date(rated.review.dueAt).toLocaleString('pl-PL')}`);
  });

  const createDeckFromEntry = (entry: StudentEntry) => run(async () => {
    const sourcePages = entry.kind === 'note' && entry.payload.text
      ? [{ page: 1, text: entry.payload.text }]
      : entry.payload.pages || [];
    const study = makeStudy(sourcePages);
    if (!study.cards.length) throw new Error('Brak wystarczającego tekstu do utworzenia fiszek.');
    const deck = await data.saveEntry({ subject_id: entry.subject_id, kind: 'deck', title: `${entry.title} — nauka`, payload: { ...study, sourceId: entry.id } });
    openEntry(deck);
    notify('Utworzono ćwiczenia z materiału.');
  });

  const downloadPrivateFile = (entry: StudentEntry) => run(async () => {
    if (!entry.payload.path) throw new Error('Oryginalny plik nie jest dostępny.');
    const { data: file, error } = await client.storage.from('student-private').download(entry.payload.path);
    if (error) throw error;
    if (entry.kind === 'audio') {
      setAudioSrc((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(file); });
    } else {
      saveDownload(entry.payload.fileName || entry.title, file, file.type || 'application/octet-stream');
    }
  });

  const downloadPrivatePath = (path: string, fileName: string) => run(async () => {
    const { data: file, error } = await client.storage.from('student-private').download(path);
    if (error) throw error;
    saveDownload(fileName, file, file.type || 'application/octet-stream');
  });

  const generateAiStudy = async (entry: StudentEntry) => {
    await run(async () => {
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) throw new Error('Zaloguj się ponownie.');
      const response = await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
        body: JSON.stringify({ materialId: entry.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nie udało się przygotować opracowania.');
      const refreshed = await data.refresh();
      const saved = refreshed?.find((item: StudentEntry) => item.id === result.id);
      if (saved) openEntry(saved);
      notify('Opracowanie gotowe. Porównuj odpowiedzi ze źródłem.');
    });
  };

  const activeForSubject = activeEntries.filter((entry) => entry.subject_id === subjectId);
  const setSubject = (subject: StudentSubject) => openSubject(subject.id, 'course');

  const renderSubject = () => {
    if (!currentSubject) return <p className="student-muted">Wybierz przedmiot.</p>;
    const tabs: { id: SubjectTab; label: string }[] = [
      { id: 'course', label: 'Mój kurs' }, { id: 'materials', label: 'Materiały' }, { id: 'notes', label: 'Notatki' },
      { id: 'study', label: 'Nauka' }, { id: 'events', label: 'Zajęcia' }, { id: 'tasks', label: 'Zadania' },
    ];
    const kinds = activeEntryKinds[subjectTab as keyof typeof activeEntryKinds] || [];
    const rows = activeForSubject.filter((entry) => kinds.includes(entry.kind));
    return <>
      <div className="student-hero"><span className="student-eyebrow">Twój przedmiot</span><h1>{currentSubject.title}</h1><div className="student-actions"><button className="student-quiet" onClick={() => editSubject(currentSubject)} type="button">Edytuj nazwę</button><button className="student-quiet" onClick={() => void archiveSubject(currentSubject)} type="button">Archiwizuj</button><button className="student-quiet" onClick={() => printSubject(currentSubject, activeForSubject)} type="button">Eksport do druku / PDF</button></div></div>
      <nav className="student-nav" aria-label="Zakładki przedmiotu">{tabs.map((item) => <button key={item.id} type="button" aria-current={subjectTab === item.id ? 'page' : undefined} onClick={() => setSubjectTab(item.id)}>{item.label}</button>)}</nav>
      {subjectTab === 'course' ? <StudentCourseWorkspace client={client} user={user} subject={currentSubject} entries={data.entries} saveEntry={data.saveEntry} refresh={data.refresh} notify={notify} onOpenEntry={openEntry} onBack={() => setView('subjects')} autoBuild={autoBuildCourse} onAutoBuildComplete={() => setAutoBuildCourse(false)} /> : <>
      <div className="student-actions">{subjectTab === 'materials' && <button className="student-primary" onClick={() => beginEditor('material')} type="button">+ Dodaj plik lub tekst</button>}{subjectTab === 'notes' && <><button className="student-primary" onClick={() => beginEditor('note')} type="button">+ Notatka</button><button className="student-quiet" onClick={() => beginEditor('audio')} type="button">● Notatka głosowa</button></>}{subjectTab === 'events' && <button className="student-primary" onClick={() => beginEditor('event')} type="button">+ Dodaj zajęcia</button>}{subjectTab === 'tasks' && <button className="student-primary" onClick={() => beginEditor('task')} type="button">+ Dodaj zadanie</button>}{subjectTab === 'study' && <button className="student-primary" onClick={() => beginEditor('deck')} type="button">+ Własne fiszki</button>}</div>
      {subjectTab === 'settings' ? <section className="student-card"><h2>Ustawienia przedmiotu</h2><button className="student-quiet" onClick={() => printSubject(currentSubject, activeForSubject)} type="button">Eksportuj do druku</button></section> : <EntryList rows={rows} subjects={data.subjects} onOpen={openEntry} onArchive={(entry) => void archiveEntry(entry)} onTaskStatus={(entry, status) => void updateTaskStatus(entry, status)} />}
      </>}
    </>;
  };

  const renderPage = () => {
    if (data.loading) return <p className="student-card" role="status">Wczytuję Twoje przedmioty i materiały…</p>;
    if (data.error) return <section className="student-card" role="alert"><p>{data.error}</p><button className="student-primary" onClick={() => void data.refresh()} type="button">Spróbuj ponownie</button></section>;
    if (editorKind) return <StudentEditor kind={editorKind} subjects={data.subjects} subjectId={subjectId} entry={editingEntry} subject={editingSubject} busy={busy} onCancel={() => { setEditorKind(null); setEditingSubject(null); setView(subjectId ? 'subject' : 'home'); }} onSubmit={handleEditorSubmit} />;
    if (view === 'home') return <StudentDashboard user={user} subjects={data.subjects} entries={data.entries} builtinProgress={builtinProgress} onNavigate={setView} onOpenSubject={(id) => openSubject(id)} onCreateSubject={() => beginEditor('subject')} onOpenBuiltinCourse={onOpenCourse} />;
    if (view === 'subjects') return <><div className="student-hero"><span className="student-eyebrow">Twoja prywatna biblioteka</span><h1>Moje przedmioty</h1><p className="student-muted">Twoje materiały, kursy i plan zajęć są prywatne dla Twojego konta.</p><button className="student-primary" onClick={() => beginEditor('subject')} type="button">+ Dodaj przedmiot</button></div><div className="student-grid">{activeSubjects.map((subject) => <article className="student-card" key={subject.id}><div className="subject-dot"/><span className="student-pill">{activeEntries.filter((entry) => entry.subject_id === subject.id).length} wpisów</span><h2>{subject.title}</h2><p className="student-muted">Materiały · notatki · nauka</p><button className="student-primary" onClick={() => setSubject(subject)} type="button">Otwórz przedmiot →</button></article>)}{!activeSubjects.length && <p className="student-muted">Dodaj pierwszy przedmiot, aby uporządkować naukę.</p>}</div></>;
    if (view === 'subject') return renderSubject();
    if (view === 'entry') return renderEntry();
    if (view === 'reviews') return renderReviews();
    if (view === 'tasks') return <TaskBoard entries={activeEntries.filter((entry) => entry.kind === 'task')} subjects={data.subjects} onOpen={openEntry} onCreate={() => beginEditor('task')} onStatus={(entry, status) => void updateTaskStatus(entry, status)} />;
    if (view === 'calendar') return <CalendarPage entries={activeEntries} subjects={data.subjects} week={week} onWeek={setWeek} onOpen={openEntry} onCreate={() => beginEditor('event')} />;
    if (view === 'notes') return <><div className="student-hero"><h1>Wszystkie notatki</h1><div className="student-actions"><button className="student-primary" onClick={() => beginEditor('note')} type="button">+ Notatka</button><button className="student-quiet" onClick={() => beginEditor('audio')} type="button">● Notatka głosowa</button></div></div><EntryList rows={activeEntries.filter((entry) => ['note', 'audio'].includes(entry.kind))} subjects={data.subjects} onOpen={openEntry} onArchive={(entry) => void archiveEntry(entry)} /></>;
    if (view === 'archive') return <ArchivePage subjects={data.subjects} entries={data.entries} onRestoreSubject={(subject) => void data.saveSubject({ ...subject, archived: false })} onRestoreEntry={(entry) => void archiveEntry(entry)} />;
    if (view === 'plan') return <PlanPage plan={data.plan} subjects={data.subjects} entries={data.entries} onOpenProfile={onOpenProfile} onExport={() => exportAll()} />;
    if (view === 'course-lesson') return renderCourseLesson();
    return null;
  };

  // Remaining page workflows are implemented below as focused React views.
  const renderEntry = () => selectedEntry ? selectedEntry.kind === 'material' ? <StudentMaterialViewer client={client} entry={selectedEntry} onSave={data.saveEntry} onDownload={() => void downloadPrivateFile(selectedEntry)} onBuildCourse={() => openSubject(selectedEntry.subject_id, 'course')} /> : <StudentEntryView entry={selectedEntry} subject={currentSubject} audioUrl={audioSrc} busy={busy} onBack={() => openSubject(selectedEntry.subject_id, 'materials')} onEdit={() => beginEditor(selectedEntry.kind === 'task' || selectedEntry.kind === 'note' || selectedEntry.kind === 'event' ? selectedEntry.kind : 'material', selectedEntry)} onDownload={() => void downloadPrivateFile(selectedEntry)} onDownloadAttachment={(path, name) => void downloadPrivatePath(path, name)} onGenerate={() => void createDeckFromEntry(selectedEntry)} onGenerateAI={() => void generateAiStudy(selectedEntry)} onSave={data.saveEntry} onRate={gradeCard} onTaskAI={(question) => askTaskAI(selectedEntry, question)} onArchive={() => void archiveEntry(selectedEntry)} notify={notify} /> : <p className="student-muted">Nie znaleziono wpisu.</p>;

  const renderReviews = () => <ReviewPage entries={activeEntries} subjects={data.subjects} onOpen={openEntry} onRate={gradeCard} />;

  const renderCourseLesson = () => <p className="student-muted">Wybierz lekcję kursu z listy przedmiotu.</p>;

  const askTaskAI = async (entry: StudentEntry, question: string) => {
    await run(async () => {
      if (!question.trim()) throw new Error('Wpisz pytanie.');
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) throw new Error('Zaloguj się ponownie.');
      const response = await fetch('/api/task-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
        body: JSON.stringify({ taskId: entry.id, question: question.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nie udało się uzyskać odpowiedzi.');
      setTaskQuestion(question);
      setTaskAnswer(result.answer || result.warning || 'Odpowiedź została zapisana.');
      if (result.saved) await data.refresh();
    });
  };

  const exportAll = () => saveDownload('studeo-moje-dane.json', JSON.stringify({ app: 'Studeo', version: 1, exportedAt: new Date().toISOString(), subjects: data.subjects, entries: data.entries, builtinProgress, attachmentsIncluded: false }, null, 2), 'application/json');

  return (
    <StudentPortalShell user={user} plan={data.plan} view={view} status={message || data.status} onNavigate={(next) => { setView(next); setEditorKind(null); }} onRefresh={() => void run(async () => { await data.refresh(); notify('✓ Aktualne dane z konta.'); })} onOpenProfile={onOpenProfile} onLogout={() => void run(onLogout)}>
      {messageError && <p role="alert" className="student-status error">{message}</p>}
      {renderPage()}
      {taskAnswer && <p className="student-pre" role="status">{taskAnswer}</p>}
      {taskQuestion && <span className="sr-only">Pytanie AI: {taskQuestion}</span>}
    </StudentPortalShell>
  );
};

const EntryList: React.FC<any> = ({ rows, subjects, onOpen, onArchive, onTaskStatus }) => rows.length ? (
  <div className="student-list">{rows.map((entry: StudentEntry) => <article className="student-item" key={entry.id}><span className="student-pill">{subjects.find((subject: StudentSubject) => subject.id === entry.subject_id)?.title}</span><h3>{entry.title}</h3><p className="student-muted">{entry.kind === 'event' ? `${entry.payload.date || ''} · ${entry.payload.start || ''}–${entry.payload.end || ''}` : new Date(entry.created_at || '').toLocaleDateString('pl-PL')}</p>{entry.kind === 'task' && <p className="student-pre">{entry.payload.description}</p>}<div className="student-actions"><button className="student-primary" onClick={() => onOpen(entry)} type="button">Otwórz</button>{entry.kind === 'task' && onTaskStatus && <button className="student-quiet" onClick={() => onTaskStatus(entry, entry.payload.status === 'done' ? 'todo' : 'done')} type="button">{entry.payload.status === 'done' ? 'Cofnij gotowe' : 'Oznacz gotowe'}</button>}<button className="student-quiet" onClick={() => onArchive(entry)} type="button">Archiwizuj</button></div></article>)}</div>
) : <p className="student-muted">Jeszcze nic tutaj nie ma. Dodaj pierwszy wpis.</p>;

const TaskBoard: React.FC<any> = ({ entries, subjects, onOpen, onCreate, onStatus }) => <>
  <div className="student-hero"><span className="student-eyebrow">Krok po kroku, bez chaosu</span><h1>Do zrobienia</h1><button className="student-primary" onClick={onCreate} type="button">+ Dodaj zadanie</button></div>
  <div className="student-task-board">{[['todo', 'Do zrobienia'], ['doing', 'W trakcie'], ['done', 'Gotowe']].map(([status, title]) => <section className="student-task-column" key={status}><h2>{title} <span className="student-pill">{entries.filter((entry: StudentEntry) => (entry.payload.status || 'todo') === status).length}</span></h2>{entries.filter((entry: StudentEntry) => (entry.payload.status || 'todo') === status).map((entry: StudentEntry) => <article className="student-item" key={entry.id}><span className="student-pill">{subjects.find((subject: StudentSubject) => subject.id === entry.subject_id)?.title}</span><h3>{entry.title}</h3>{entry.payload.due && <p className="student-muted">Termin: {entry.payload.due}</p>}<p className="student-pre">{entry.payload.description}</p><div className="student-actions"><button className="student-quiet" onClick={() => onOpen(entry)} type="button">Otwórz / pracuj</button>{status !== 'done' && <button className="student-quiet" onClick={() => onStatus(entry, status === 'todo' ? 'doing' : 'done')} type="button">{status === 'todo' ? 'W trakcie' : 'Gotowe'}</button>}</div></article>)}</section>)}</div>
</>;

const CalendarPage: React.FC<any> = ({ entries, subjects, week, onWeek, onOpen, onCreate }) => {
  const days = weekDates(week);
  return <><div className="student-hero"><span className="student-eyebrow">Plan zajęć · czas lokalny</span><h1>Twój tydzień</h1><p className="student-muted">{days[0].toLocaleDateString('pl-PL')} – {days[6].toLocaleDateString('pl-PL')}</p><div className="student-actions"><button className="student-quiet" onClick={() => onWeek(new Date(week.getTime() - 7 * 86400000))} type="button">← Poprzedni</button><button className="student-quiet" onClick={() => onWeek(new Date())} type="button">Dzisiaj</button><button className="student-quiet" onClick={() => onWeek(new Date(week.getTime() + 7 * 86400000))} type="button">Następny →</button><button className="student-primary" onClick={onCreate} type="button">+ Zajęcia</button></div></div><div className="student-week">{days.map((day) => {const events = entries.filter((entry: StudentEntry) => entry.kind === 'event' && occursOn(entry, day));const tasks = entries.filter((entry: StudentEntry) => entry.kind === 'task' && entry.payload.status !== 'done' && entry.payload.due === dateKey(day));return <section className="student-day" key={dateKey(day)}><h3>{day.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' })}</h3>{[...events, ...tasks].map((entry) => <article className="student-event" key={entry.id}><strong>{entry.kind === 'event' ? `${entry.payload.start}–${entry.payload.end}` : 'Termin zadania'}</strong><h4>{entry.title}</h4><p>{subjects.find((subject: StudentSubject) => subject.id === entry.subject_id)?.title}</p>{entry.kind === 'event' && <p>{entry.payload.address} · sala {entry.payload.room || '—'}</p>}<button className="student-quiet" onClick={() => onOpen(entry)} type="button">Otwórz</button></article>)}</section>;})}</div></>;
};

const ArchivePage: React.FC<any> = ({ subjects, entries, onRestoreSubject, onRestoreEntry }) => <><div className="student-hero"><h1>Archiwum</h1><p className="student-muted">Przywróć przedmioty i wpisy. Pliki binarne nadal zajmują miejsce na koncie.</p></div><section className="student-list">{subjects.filter((subject: StudentSubject) => subject.archived).map((subject: StudentSubject) => <article className="student-item" key={subject.id}><h2>{subject.title}</h2><button className="student-quiet" onClick={() => onRestoreSubject(subject)} type="button">Przywróć przedmiot</button></article>)}{entries.filter((entry: StudentEntry) => entry.archived && !entry.payload.courseSnapshot).map((entry: StudentEntry) => <article className="student-item" key={entry.id}><h2>{entry.title}</h2><button className="student-quiet" onClick={() => onRestoreEntry(entry)} type="button">Przywróć wpis</button></article>)}</section></>;

const PlanPage: React.FC<any> = ({ plan, subjects, entries, onOpenProfile, onExport }) => <><div className="student-hero"><h1>Basic i Premium</h1><p>Twój plan: <strong>{plan.name}</strong></p><p className="student-muted">W czasie bety wszystkie obecne i nowe konta otrzymują Premium bez opłat.</p></div><div className="student-grid"><article className="student-card"><h2>Basic</h2><p>5 GB na pliki · 5 użyć AI dziennie.</p><p>Przedmioty, kursy, fiszki, zadania, notatki i kalendarz.</p></article><article className="student-card"><h2>Premium</h2><p>20 GB na pliki · 100 użyć AI dziennie.</p><p>Obecnie bezpłatne w becie. Płatności nie są jeszcze uruchomione.</p></article></div><section className="student-card"><h2>Twoje zużycie i dane</h2><p>W profilu sprawdzisz miejsce na pliki, użycie AI i zarządzanie plikami.</p><div className="student-actions"><button className="student-primary" onClick={onOpenProfile} type="button">Otwórz profil</button><button className="student-quiet" onClick={onExport} type="button">Pobierz moje dane (JSON)</button></div></section><p className="sr-only">{subjects.length} przedmiotów, {entries.length} wpisów</p></>;

const ReviewPage: React.FC<any> = ({ entries, subjects, onOpen, onRate }) => {
  const due = dueCards(entries);
  const [active, setActive] = useState<{ deck: StudentEntry; card: any; index: number } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const current = active || due[0] || null;
  return <><div className="student-hero"><span className="student-eyebrow">Powtórki w odstępach</span><h1>Małe kroki, regularnie.</h1><p className="student-muted">{due.length} fiszek czeka na powtórkę.</p>{due.length > 0 && !current && <button className="student-primary" onClick={() => setActive(due[0])} type="button">Zacznij powtórkę</button>}</div>{current ? <article className="student-card"><span className="student-pill">{current.deck.title} · {current.index + 1}</span><h2 className="student-flash">{current.card.front}</h2>{showAnswer ? <><p className="student-source">{current.card.back}</p><div className="student-actions">{(['again', 'hard', 'good', 'easy'] as const).map((grade) => <button className="student-quiet" key={grade} onClick={() => { onRate(current.deck, current.card.id, grade); setShowAnswer(false); setActive(null); }} type="button">{{ again: 'Jeszcze raz', hard: 'Trudne', good: 'Pamiętam', easy: 'Łatwe' }[grade]}</button>)}</div></> : <button className="student-primary" onClick={() => setShowAnswer(true)} type="button">Pokaż odpowiedź</button>}</article> : <p className="student-muted">Na tę chwilę wszystko powtórzone.</p>}<h2>Twoje zestawy</h2><EntryList rows={entries.filter((entry: StudentEntry) => entry.kind === 'deck')} subjects={subjects} onOpen={onOpen} onArchive={() => {}} /></>;
};

const printSubject = (subject: StudentSubject, entries: StudentEntry[]) => {
  const sections = entries.map((entry) => `<section><h2>${escapeHtml(entry.title)}</h2>${entry.payload.text ? `<p>${escapeHtml(entry.payload.text)}</p>` : ''}${entry.payload.description ? `<p>${escapeHtml(entry.payload.description)}</p>` : ''}${entry.payload.workNotes ? `<h3>Notatki i rozwiązanie</h3><p>${escapeHtml(entry.payload.workNotes)}</p>` : ''}</section>`).join('');
  saveDownload(`${subject.title.toLowerCase().replace(/\s+/g, '-')}-studeo.html`, `<!doctype html><html lang="pl"><meta charset="utf-8"><title>${escapeHtml(subject.title)}</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:40px auto;padding:20px}p{white-space:pre-wrap}section{border-top:1px solid #aaa;margin-top:24px}</style><h1>${escapeHtml(subject.title)}</h1>${sections}`, 'text/html;charset=utf-8');
};