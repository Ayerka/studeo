import React, { useEffect, useRef, useState } from 'react';
import { MAX_FILE } from '../../student-model';
import type { StudentEntry, StudentSubject } from '../../types';

export type StudentEditorKind = 'subject' | 'note' | 'event' | 'material' | 'audio' | 'task' | 'deck';

export interface StudentEditorValues {
  title: string;
  subjectId: string;
  text: string;
  description: string;
  workNotes: string;
  due: string;
  status: string;
  repeat: string;
  date: string;
  until: string;
  start: string;
  end: string;
  weekly: boolean;
  address: string;
  room: string;
  building: string;
  pdfPageRange: string;
  makeCourse: boolean;
  cards: string;
  sourceFiles: File[];
  submissionFiles: File[];
  file?: File;
  audio?: File;
}

interface StudentEditorProps {
  kind: StudentEditorKind;
  subjects: StudentSubject[];
  subjectId: string;
  entry?: StudentEntry | null;
  subject?: StudentSubject | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: StudentEditorValues) => Promise<void>;
}

const emptyValues = (subjectId: string, entry?: StudentEntry | null): StudentEditorValues => ({
  title: entry?.title || '',
  subjectId: entry?.subject_id || subjectId,
  text: entry?.payload.text || '',
  description: entry?.payload.description || '',
  workNotes: entry?.payload.workNotes || '',
  due: entry?.payload.due || '',
  status: entry?.payload.status || 'todo',
  repeat: entry?.payload.repeat || 'none',
  date: entry?.payload.date || new Date().toISOString().slice(0, 10),
  until: entry?.payload.until || '',
  start: entry?.payload.start || '09:00',
  end: entry?.payload.end || '10:30',
  weekly: Boolean(entry?.payload.weekly),
  address: entry?.payload.address || '',
  room: entry?.payload.room || '',
  building: entry?.payload.building || '',
  pdfPageRange: entry?.payload.pdfPageRange || '',
  makeCourse: false,
  cards: '',
  sourceFiles: [],
  submissionFiles: [],
});

const labels: Record<StudentEditorKind, string> = {
  subject: 'Przedmiot', note: 'Notatka', event: 'Zajęcia w kalendarzu', material: 'Materiał do nauki',
  audio: 'Notatka głosowa', task: 'Zadanie', deck: 'Własne fiszki',
};

export const StudentEditor: React.FC<StudentEditorProps> = ({
  kind,
  subjects,
  subjectId,
  entry,
  subject,
  busy,
  onCancel,
  onSubmit,
}) => {
  const [values, setValues] = useState(() => ({ ...emptyValues(subjectId, entry), title: entry?.title || subject?.title || '' }));
  const [recording, setRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingPreview, setRecordingPreview] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingBytesRef = useRef(0);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingPreview) URL.revokeObjectURL(recordingPreview);
  }, [recordingPreview]);

  const set = (key: keyof StudentEditorValues, value: any) => setValues((current) => ({ ...current, [key]: value }));
  const field = (label: string, name: keyof StudentEditorValues, type = 'text', required = false) => (
    <label>{label}<input name={name} type={type} value={String(values[name] || '')} required={required} maxLength={name === 'title' ? 120 : undefined} onChange={(event) => set(name, event.target.value)} /></label>
  );

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Ta przeglądarka nie obsługuje nagrywania. Wybierz plik audio.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recordingBytesRef.current = 0;
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        recordingBytesRef.current += event.data.size;
        chunksRef.current.push(event.data);
        if (recordingBytesRef.current > MAX_FILE) {
          setRecordingError('Nagranie przekroczyło limit 20 MB. Nagraj krótszą notatkę.');
          recorder.stop();
        }
      };
      recorder.onstop = () => {
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordingBlob(blob);
        setRecordingPreview((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(blob);
        });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
      };
      recorder.start(1000);
      recordingTimerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 5 * 60 * 1000);
      setRecording(true);
    } catch (error: any) {
      setRecordingError(error.message || 'Nie udało się uruchomić mikrofonu.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recording) {
      setValues((current) => ({ ...current, text: 'Najpierw zatrzymaj nagrywanie.' }));
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const file = (form.elements.namedItem('materialFile') as HTMLInputElement | null)?.files?.[0];
    const audio = recordingBlob
      ? new File([recordingBlob], `notatka.${recordingBlob.type.includes('mp4') ? 'm4a' : 'webm'}`, { type: recordingBlob.type })
      : (form.elements.namedItem('audioFile') as HTMLInputElement | null)?.files?.[0];
    if (recordingBlob && recordingBlob.size > MAX_FILE) {
      setRecordingError('Nagranie przekroczyło limit 20 MB. Nagraj krótszą notatkę.');
      return;
    }
    const sourceFiles = Array.from((form.elements.namedItem('sourceFiles') as HTMLInputElement | null)?.files || []);
    const submissionFiles = Array.from((form.elements.namedItem('submissionFiles') as HTMLInputElement | null)?.files || []);
    const next: StudentEditorValues = {
      ...values,
      title: String(data.get('title') || '').trim(),
      subjectId: kind === 'subject' ? '' : String(data.get('subjectId') || subjectId),
      text: String(data.get('text') || '').trim(),
      description: String(data.get('description') || '').trim(),
      workNotes: String(data.get('workNotes') || '').trim(),
      due: String(data.get('due') || ''),
      status: String(data.get('status') || 'todo'),
      repeat: String(data.get('repeat') || 'none'),
      date: String(data.get('date') || ''),
      until: String(data.get('until') || ''),
      start: String(data.get('start') || ''),
      end: String(data.get('end') || ''),
      weekly: data.get('weekly') === 'on',
      address: String(data.get('address') || ''),
      room: String(data.get('room') || ''),
      building: String(data.get('building') || ''),
      pdfPageRange: String(data.get('pdfPageRange') || '').trim(),
      makeCourse: data.get('makeCourse') === 'on',
      cards: String(data.get('cards') || ''),
      sourceFiles,
      submissionFiles,
      file,
      audio,
    };
    await onSubmit(next);
  };

  return (
    <section className="student-editor-page">
      <div className="student-hero"><span className="student-eyebrow">Prywatne dane konta</span><h1>{entry ? `Edytuj: ${labels[kind]}` : labels[kind]}</h1></div>
      <form className="student-form" onSubmit={handleSubmit}>
        {kind !== 'subject' && <label>Przedmiot<select name="subjectId" value={values.subjectId} required onChange={(event) => set('subjectId', event.target.value)}>{subjects.filter((subject) => !subject.archived).map((subject) => <option value={subject.id} key={subject.id}>{subject.title}</option>)}</select></label>}
        {field(kind === 'subject' ? 'Nazwa przedmiotu' : 'Tytuł', 'title', 'text', true)}

        {kind === 'note' && <label>Treść notatki<textarea name="text" maxLength={100000} required value={values.text} onChange={(event) => set('text', event.target.value)} /></label>}

        {kind === 'material' && <>
          <label>Plik PDF, TXT, MD, PNG lub JPG<input ref={fileRef} name="materialFile" type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg" /></label>
          <label>Zakres stron PDF (opcjonalnie)<input name="pdfPageRange" value={values.pdfPageRange} placeholder="np. 1-4, 8, 10-12" onChange={(event) => set('pdfPageRange', event.target.value)} /></label>
          <label>Lub wklej tekst<textarea name="text" maxLength={120000} value={values.text} onChange={(event) => set('text', event.target.value)} /></label>
          <label className="student-check"><input name="makeCourse" type="checkbox" checked={values.makeCourse} onChange={(event) => set('makeCourse', event.target.checked)} /> Zapisz i utwórz lub zaktualizuj kurs AI</label>
          <p className="student-muted">Maksymalnie 20 MB na plik i 120 tys. znaków do nauki. Wybór stron dotyczy tylko odczytu; oryginalny PDF pozostaje dostępny w całości.</p>
        </>}

        {kind === 'audio' && <>
          <div className="student-actions"><button type="button" className="student-quiet" disabled={recording} onClick={() => void startRecording()}>● Nagraj</button><button type="button" className="student-quiet" disabled={!recording} onClick={() => recorderRef.current?.stop()}>Zatrzymaj</button></div>
          {recording && <p className="student-status" role="status">Nagrywanie trwa. Maksymalny czas: 5 minut.</p>}
          {recordingError && <p className="student-status error" role="alert">{recordingError}</p>}
          {recordingPreview && <audio controls src={recordingPreview} />}
          <label>Lub wybierz plik audio<input name="audioFile" type="file" accept="audio/*" /></label>
          <p className="student-muted">Nagranie zostanie zapisane prywatnie na Twoim koncie.</p>
        </>}

        {kind === 'event' && <>
          <div className="student-row">{field('Pierwsze zajęcia', 'date', 'date', true)}{field('Powtarzaj do (opcjonalnie)', 'until', 'date')}</div>
          <div className="student-row">{field('Od', 'start', 'time', true)}{field('Do', 'end', 'time', true)}</div>
          <label className="student-check"><input name="weekly" type="checkbox" checked={values.weekly} onChange={(event) => set('weekly', event.target.checked)} /> Powtarzaj co tydzień</label>
          {field('Adres', 'address')}
          <div className="student-row">{field('Sala', 'room')}{field('Budynek', 'building')}</div>
        </>}

        {kind === 'task' && <>
          <div className="student-row"><label>Status<select name="status" value={values.status} onChange={(event) => set('status', event.target.value)}><option value="todo">Do zrobienia</option><option value="doing">W trakcie</option><option value="done">Gotowe</option></select></label>{field('Termin', 'due', 'date')}</div>
          <label>Powtarzanie<select name="repeat" value={values.repeat} onChange={(event) => set('repeat', event.target.value)}><option value="none">Nie powtarzaj</option><option value="daily">Codziennie</option><option value="weekly">Co tydzień</option></select></label>
          <label>Co trzeba zrobić?<textarea name="description" maxLength={20000} value={values.description} onChange={(event) => set('description', event.target.value)} /></label>
          <section className="student-workspace"><h2>Moje notatki i rozwiązanie</h2><label>Moja przestrzeń do pracy<textarea className="student-work-notes" name="workNotes" maxLength={80000} value={values.workNotes} onChange={(event) => set('workNotes', event.target.value)} /></label></section>
          <label>Pliki z poleceniem<input name="sourceFiles" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg" /></label>
          <label>Moje rozwiązania i załączniki<input name="submissionFiles" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg" /></label>
        </>}

        {kind === 'deck' && <>
          <label>Fiszki, jedna w wierszu: pytanie | odpowiedź<textarea name="cards" required maxLength={150000} placeholder="Co oznacza CIA? | Poufność, integralność, dostępność" /></label>
          <p className="student-muted">Do 100 fiszek. Własne fiszki nie zużywają limitu AI.</p>
        </>}

        <div className="student-actions"><button className="student-primary" type="submit" disabled={busy}>{busy ? 'Zapisuję…' : 'Zapisz na moim koncie'}</button><button className="student-quiet" type="button" disabled={busy} onClick={onCancel}>Anuluj</button></div>
      </form>
    </section>
  );
};