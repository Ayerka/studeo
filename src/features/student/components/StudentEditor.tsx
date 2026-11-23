import React, { useEffect, useRef, useState } from 'react';
import type { StudentEntry, StudentSubject } from '../../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, ArrowLeft } from 'lucide-react';

export type StudentEditorKind =
  | 'subject'
  | 'note'
  | 'event'
  | 'material'
  | 'audio'
  | 'task'
  | 'deck';

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

const labels: Record<StudentEditorKind, string> = {
  subject: 'Przedmiot',
  note: 'Notatka',
  event: 'Zajęcia w kalendarzu',
  material: 'Materiał do nauki',
  audio: 'Notatka głosowa',
  task: 'Zadanie',
  deck: 'Własne fiszki',
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
  const [title, setTitle] = useState(
    entry?.title || subject?.title || '',
  );

  const [selectedSubject, setSelectedSubject] = useState(
    entry?.subject_id || subjectId || subjects[0]?.id || '',
  );

  const [text, setText] = useState(entry?.payload.text || (
    entry?.payload.pages?.length === 1 && !entry.payload.path ? entry.payload.pages[0].text : ''
  ));
  const [description, setDescription] = useState(
    entry?.payload.description || '',
  );
  const [workNotes, setWorkNotes] = useState(
    entry?.payload.workNotes || '',
  );

  const [due, setDue] = useState(entry?.payload.due || '');
  const [status, setStatus] = useState<string>(
    entry?.payload.status || 'todo',
  );

  const [date, setDate] = useState(
    entry?.payload.date || new Date().toISOString().slice(0, 10),
  );

  const [until, setUntil] = useState(entry?.payload.until || '');
  const [start, setStart] = useState(
    entry?.payload.start || '09:00',
  );
  const [end, setEnd] = useState(
    entry?.payload.end || '10:30',
  );

  const [repeat, setRepeat] = useState<string>(
    entry?.payload.repeat || 'none',
  );

  const [weekly, setWeekly] = useState(
    Boolean(entry?.payload.weekly),
  );

  const [address, setAddress] = useState(
    entry?.payload.address || '',
  );
  const [room, setRoom] = useState(entry?.payload.room || '');
  const [building, setBuilding] = useState(
    entry?.payload.building || '',
  );

  const [cards, setCards] = useState(
    typeof entry?.payload.cards === 'string'
      ? entry.payload.cards
      : '',
  );

  const [makeCourse, setMakeCourse] = useState(
    Boolean(entry?.payload.makeCourse),
  );

  const [pdfPageRange, setPdfPageRange] = useState(
    entry?.payload.pdfPageRange || '',
  );

  const [recording, setRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sourceFilesRef = useRef<HTMLInputElement>(null);
  const submissionFilesRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const stopRecording = () => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const startRecording = async () => {
    setRecordingError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError(
        'Ta przeglądarka nie obsługuje nagrywania audio.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || 'audio/webm',
        });

        setRecordingBlob(blob);
        setRecording(false);

        stream.getTracks().forEach((track) => track.stop());

        if (streamRef.current === stream) {
          streamRef.current = null;
        }
      };

      recorder.onerror = () => {
        setRecordingError('Wystąpił błąd podczas nagrywania.');
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingBlob(null);
    } catch {
      setRecordingError(
        'Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.',
      );
      setRecording(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    if (kind !== 'subject' && !selectedSubject) {
      return;
    }

    if (recording) {
      setRecordingError('Najpierw zatrzymaj nagrywanie.');
      return;
    }

    const file = fileRef.current?.files?.[0];

    const audio = recordingBlob
      ? new File(
          [recordingBlob],
          `nagranie-${Date.now()}.webm`,
          {
            type: recordingBlob.type || 'audio/webm',
          },
        )
      : audioFileRef.current?.files?.[0];

    await onSubmit({
      title: title.trim(),
      subjectId: selectedSubject,
      text,
      description,
      workNotes,
      due,
      status,
      repeat,
      date,
      until,
      start,
      end,
      weekly,
      address,
      room,
      building,
      pdfPageRange,
      makeCourse,
      cards,
      sourceFiles: Array.from(sourceFilesRef.current?.files ?? []),
      submissionFiles: Array.from(submissionFilesRef.current?.files ?? []),
      file,
      audio,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={busy}
        className="-ml-2 gap-1.5"
      >
        <ArrowLeft className="size-4" />
        Anuluj i wróć
      </Button>

      <Card>
        <CardHeader>
          <Badge variant="outline" className="mb-1 w-fit">
            {labels[kind]}
          </Badge>

          <CardTitle className="text-2xl font-bold">
            {entry
              ? `Edytuj: ${entry.title}`
              : `Nowy: ${labels[kind]}`}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {kind !== 'subject' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">
                  Przedmiot
                </label>

                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={selectedSubject}
                  onChange={(event) =>
                    setSelectedSubject(event.target.value)
                  }
                  required
                  disabled={busy}
                >
                  {subjects
                    .filter((item) => !item.archived)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                {kind === 'subject' ? 'Nazwa przedmiotu' : 'Tytuł'}
              </label>

              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Wpisz nazwę…"
                required
                disabled={busy}
              />
            </div>

            {kind === 'note' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    Treść notatki
                  </label>

                  <textarea
                    className="min-h-[160px] w-full rounded-lg border border-input bg-background p-3 text-sm"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    required
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    Dodatkowe uwagi
                  </label>

                  <textarea
                    className="min-h-[90px] w-full rounded-lg border border-input bg-background p-3 text-sm"
                    value={workNotes}
                    onChange={(event) => setWorkNotes(event.target.value)}
                    disabled={busy}
                  />
                </div>
              </>
            )}

            {kind === 'material' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    Tekst źródłowy (opcjonalnie)
                  </label>
                  <textarea
                    className="min-h-[140px] w-full rounded-lg border border-input bg-background p-3 text-sm"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Wklej tekst materiału albo wybierz plik poniżej."
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    Plik (PDF, TXT, MD lub grafika)
                  </label>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
                    className="block w-full text-xs"
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    Zakres stron PDF (opcjonalnie)
                  </label>

                  <Input
                    value={pdfPageRange}
                    onChange={(event) =>
                      setPdfPageRange(event.target.value)
                    }
                    placeholder="np. 1-4, 8"
                    disabled={busy}
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 pt-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={makeCourse}
                    onChange={(event) =>
                      setMakeCourse(event.target.checked)
                    }
                    disabled={busy}
                  />
                  Zapisz i utwórz kurs AI
                </label>
              </div>
            )}

            {kind === 'task' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Termin
                    </label>

                    <Input
                      type="date"
                      value={due}
                      onChange={(event) => setDue(event.target.value)}
                      disabled={busy}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Status
                    </label>

                    <select
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      disabled={busy}
                    >
                      <option value="todo">Do zrobienia</option>
                      <option value="doing">W trakcie</option>
                      <option value="done">Gotowe</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    Opis zadania
                  </label>

                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-input bg-background p-3 text-sm"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    disabled={busy}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-semibold text-foreground/80">
                    Materiały do zadania
                    <input
                      ref={sourceFilesRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg"
                      className="block w-full pt-1 text-xs font-normal"
                      disabled={busy}
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-foreground/80">
                    Rozwiązane pliki
                    <input
                      ref={submissionFilesRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg"
                      className="block w-full pt-1 text-xs font-normal"
                      disabled={busy}
                    />
                  </label>
                </div>
              </div>
            )}

            {kind === 'event' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Data rozpoczęcia
                    </label>

                    <Input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      required
                      disabled={busy}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Powtarzaj do
                    </label>

                    <Input
                      type="date"
                      value={until}
                      onChange={(event) => setUntil(event.target.value)}
                      disabled={busy}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Początek
                    </label>

                    <Input
                      type="time"
                      value={start}
                      onChange={(event) => setStart(event.target.value)}
                      required
                      disabled={busy}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Koniec
                    </label>

                    <Input
                      type="time"
                      value={end}
                      onChange={(event) => setEnd(event.target.value)}
                      required
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    Powtarzanie
                  </label>

                  <select
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={repeat}
                    onChange={(event) => setRepeat(event.target.value)}
                    disabled={busy}
                  >
                    <option value="none">Bez powtarzania</option>
                    <option value="daily">Codziennie</option>
                    <option value="weekly">Co tydzień</option>
                    <option value="monthly">Co miesiąc</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={weekly}
                    onChange={(event) => setWeekly(event.target.checked)}
                    disabled={busy}
                  />
                  Zajęcia odbywają się co tydzień
                </label>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    Budynek
                  </label>

                  <Input
                    value={building}
                    onChange={(event) => setBuilding(event.target.value)}
                    disabled={busy}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Sala
                    </label>

                    <Input
                      value={room}
                      onChange={(event) => setRoom(event.target.value)}
                      disabled={busy}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Adres
                    </label>

                    <Input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    Opis
                  </label>

                  <textarea
                    className="min-h-[90px] w-full rounded-lg border border-input bg-background p-3 text-sm"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    disabled={busy}
                  />
                </div>
              </div>
            )}

            {kind === 'audio' && (
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Nagraj notatkę głosową.
                </p>

                <div className="flex justify-center gap-2">
                  {recording ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={stopRecording}
                      className="gap-1.5"
                    >
                      <Square className="size-4" />
                      Zatrzymaj
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={startRecording}
                      disabled={busy}
                      className="gap-1.5"
                    >
                      <Mic className="size-4" />
                      Rozpocznij nagrywanie
                    </Button>
                  )}
                </div>

                {recordingBlob && (
                  <p className="text-xs font-medium text-emerald-600">
                    Nagranie gotowe do przesłania
                  </p>
                )}

                <label className="block text-left text-xs font-medium">
                  Lub wybierz plik audio
                  <input
                    ref={audioFileRef}
                    type="file"
                    accept="audio/*"
                    className="mt-1 block w-full text-xs"
                    disabled={busy || recording}
                  />
                </label>

                {recordingError && (
                  <p className="text-xs text-destructive">
                    {recordingError}
                  </p>
                )}
              </div>
            )}

            {kind === 'deck' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">
                  Fiszki (pytanie | odpowiedź, jedna para w wierszu)
                </label>

                <textarea
                  className="min-h-[160px] w-full rounded-lg border border-input bg-background p-3 font-mono text-sm"
                  placeholder="Co oznacza CIA? | Poufność, integralność, dostępność"
                  value={cards}
                  onChange={(event) => setCards(event.target.value)}
                  required
                  disabled={busy}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={busy}
              >
                Anuluj
              </Button>

              <Button type="submit" disabled={busy || recording}>
                {busy ? 'Zapisuję…' : 'Zapisz na koncie'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};