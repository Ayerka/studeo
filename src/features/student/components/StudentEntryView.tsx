import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { normalizeAnswer } from '../lib/student-model.js';
import type { FlashCard, StudentEntry, StudentSubject } from '../../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StudentEntryViewProps {
  entry: StudentEntry;
  initialCardId?: string | null;
  subject: StudentSubject | null;
  audioUrl: string | null;
  busy: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onDownloadAttachment: (path: string, name: string) => void;
  onGenerate: () => void;
  onGenerateAI: () => void;
  onSave: (entry: Partial<StudentEntry>) => Promise<StudentEntry>;
  onRate: (entry: StudentEntry, cardId: string, grade: 'again' | 'hard' | 'good' | 'easy') => void;
  onTaskAI: (question: string) => Promise<string>;
  onArchive: () => void;
  notify: (message: string, error?: boolean) => void;
}

export const StudentEntryView: React.FC<StudentEntryViewProps> = ({
  entry,
  initialCardId,
  subject,
  audioUrl,
  busy,
  onBack,
  onEdit,
  onDownload,
  onDownloadAttachment,
  onGenerate,
  onGenerateAI,
  onSave,
  onRate,
  onTaskAI,
  onArchive,
  notify,
}) => {
  const [tab, setTab] = useState<'cards' | 'quiz' | 'read'>('cards');
  const [cardIndex, setCardIndex] = useState(() => {
    const index = (entry.payload.cards || []).findIndex((card) => card.id === initialCardId);
    return index >= 0 ? index : 0;
  });
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const payload = entry.payload;
  const cards = payload.cards || [];
  const currentCard = cards[cardIndex];

  const askTaskAi = async () => {
    const answer = await onTaskAI(answers.taskQuestion || '');
    if (answer) setAnswers((current) => ({ ...current, taskAnswer: answer }));
  };

  const submitPractice = async (card: FlashCard, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const answer = new FormData(form).get('answer');
    const correct = normalizeAnswer(answer) === normalizeAnswer(card.back);
    setAnswers((current) => ({ ...current, [card.id]: String(answer || '') }));
    try {
      await onSave({
        ...entry,
        payload: {
          ...payload,
          practice: { ...(payload.practice || {}), [card.id]: { correct, at: new Date().toISOString() } },
        },
      });
    } catch (error: any) {
      notify(error.message || 'Nie udało się zapisać odpowiedzi.', true);
    }
  };

  const submitAiAnswer = async (question: any, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = new FormData(event.currentTarget).getAll('choice').map(Number);
    if (!selected.length) {
      notify('Zaznacz co najmniej jedną odpowiedź.', true);
      return;
    }
    const correct = selected.length === question.answers.length && question.answers.every((index: number) => selected.includes(index));
    try {
      await onSave({
        ...entry,
        payload: {
          ...payload,
          testAnswers: {
            ...(payload.testAnswers || {}),
            [question.id]: { selected, correct, at: new Date().toISOString() },
          },
        },
      });
      notify('Odpowiedź zapisana.');
    } catch (error: any) {
      notify(error.message || 'Nie udało się zapisać odpowiedzi.', true);
    }
  };

  const saveCard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const front = String(form.get('front') || '').trim();
    const back = String(form.get('back') || '').trim();
    if (!front || !back) return;
    try {
      await onSave({
        ...entry,
        payload: { ...payload, cards: cards.map((card) => card.id === editingCard?.id ? { ...card, front, back } : card) },
      });
      setEditingCard(null);
      notify('Fiszka zapisana.');
    } catch (error: any) {
      notify(error.message || 'Nie udało się zapisać fiszki.', true);
    }
  };

  const toggleKnown = async (card: FlashCard) => {
    try {
      await onSave({
        ...entry,
        payload: { ...payload, cards: cards.map((item) => item.id === card.id ? { ...item, known: !item.known } : item) },
      });
      notify(card.known ? 'Fiszka wróciła do powtórek.' : 'Fiszka oznaczona jako opanowana.');
    } catch (error: any) {
      notify(error.message || 'Nie udało się zapisać fiszki.', true);
    }
  };

  const resetQuiz = async () => {
    if (!window.confirm('Rozpocząć test ponownie? Poprzedni wynik pozostanie w historii zestawu.')) return;
    try {
      await onSave({
        ...entry,
        payload: {
          ...payload,
          testHistory: [...(payload.testHistory || []), {
            at: new Date().toISOString(),
            testAnswers: payload.testAnswers || {},
            practice: payload.practice || {},
          }].slice(-20),
          testAnswers: {},
          practice: {},
        },
      });
      notify('Poprzednia próba została zachowana.');
    } catch (error: any) {
      notify(error.message || 'Nie udało się rozpocząć nowej próby.', true);
    }
  };

  if (entry.kind === 'task') return <>
    <div className="student-hero space-y-3 border-b pb-5"><Button variant="ghost" onClick={onBack} type="button">← Wróć</Button><span className="student-eyebrow text-xs font-semibold tracking-wide text-primary uppercase">Zadanie · {subject?.title}</span><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{entry.title}</h1><p className="text-sm text-muted-foreground">{payload.due ? `Termin ${payload.due}` : 'Bez terminu'} · {payload.status || 'todo'}</p><div className="student-actions flex flex-wrap gap-2"><Button onClick={onEdit} type="button">Edytuj zadanie</Button><Button variant="outline" onClick={onArchive} type="button">Archiwizuj</Button></div></div>
    <Card className="student-workspace gap-4 p-5 sm:p-6"><h2 className="text-lg font-semibold">Polecenie</h2><p className="student-pre whitespace-pre-wrap break-words leading-7">{payload.description || 'Brak opisu zadania.'}</p><h2 className="text-lg font-semibold">Moje notatki i rozwiązanie</h2><p className="student-pre whitespace-pre-wrap break-words leading-7">{payload.workNotes || 'Nie dodano jeszcze notatek.'}</p><h2 className="text-lg font-semibold">Załączniki</h2>{(payload.attachments || []).map((file) => <div className="student-task-file flex flex-wrap items-center justify-between gap-2 border-t py-3 text-sm" key={file.id}><span className="inline-flex min-w-0 items-center gap-2"><Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="break-all">{file.name}</span></span><Button variant="outline" onClick={() => onDownloadAttachment(file.path, file.name)} type="button">Pobierz</Button></div>)}</Card>
    <Card className="student-workspace gap-4 p-5 sm:p-6"><h2 className="text-lg font-semibold">Pomoc AI</h2><p className="student-muted text-sm leading-6 text-muted-foreground">Pytanie oraz zapisane polecenie i notatki zostaną przekazane do AI. Załączniki nie są odczytywane.</p><label className="grid gap-2 text-sm font-medium">O co chcesz zapytać?<textarea className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" maxLength={2000} onChange={(event) => setAnswers((current) => ({ ...current, taskQuestion: event.target.value }))} value={answers.taskQuestion || ''} /></label><div className="student-actions flex flex-wrap gap-2">{['Wyjaśnij polecenie', 'Zaplanuj kroki', 'Sprawdź moje notatki'].map((prompt) => <Button variant="outline" type="button" key={prompt} onClick={() => setAnswers((current) => ({ ...current, taskQuestion: prompt }))}>{prompt}</Button>)}</div><Button disabled={busy} onClick={() => void askTaskAi()} type="button">Zapytaj AI</Button>{answers.taskAnswer && <div className="whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-4 text-sm leading-6" role="status">{answers.taskAnswer}</div>}</Card>
  </>;

  if (entry.kind === 'deck') return <Tabs className="space-y-5" value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
    <div className="student-hero space-y-3 border-b pb-5"><Button variant="ghost" onClick={onBack} type="button">← Wróć</Button><span className="student-eyebrow text-xs font-semibold tracking-wide text-primary uppercase">{payload.method === 'ai' ? 'Opracowanie AI — sprawdzaj ze źródłem' : payload.method === 'manual' ? 'Twoje własne fiszki' : 'Ćwiczenia z materiału'}</span><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{entry.title}</h1><p className="student-muted text-sm text-muted-foreground">{cards.filter((card) => card.known).length} / {cards.length} fiszek opanowanych.</p><TabsList><TabsTrigger value="cards">Fiszki</TabsTrigger><TabsTrigger value="quiz">Ćwiczenie</TabsTrigger>{payload.sections?.length ? <TabsTrigger value="read">Czytaj materiał</TabsTrigger> : null}</TabsList>{tab === 'quiz' && <Button variant="outline" onClick={() => void resetQuiz()} type="button">Rozwiąż ponownie</Button>}</div>
    {payload.sections?.length ? <TabsContent value="read"><div className="student-list grid gap-4">{payload.sections.map((section, index) => <Card className="student-item gap-3 p-5 sm:p-6" key={index}><h2 className="text-lg font-semibold">{section.title || `Strona ${section.page}`}</h2><p className="student-pre whitespace-pre-wrap break-words leading-7">{section.text}</p>{section.quote && <p className="student-source rounded-md border-l-2 border-primary/50 bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground">{section.quote} · strona {section.page}</p>}</Card>)}</div></TabsContent> : null}
    <TabsContent value="quiz">{payload.questions?.length ? <section className="student-list grid gap-4"><p className="student-muted text-sm text-muted-foreground">Zaznacz wszystkie poprawne odpowiedzi. Wynik zapisuje się na Twoim koncie.</p>{payload.questions.map((question: any) => {const result = payload.testAnswers?.[question.id];return <form className="student-item grid min-w-0 gap-4 rounded-lg border bg-card p-5 shadow-xs sm:p-6" key={question.id} onSubmit={(event) => void submitAiAnswer(question, event)}><h2 className="text-lg font-semibold">{question.q}</h2>{question.options.map((option: string, index: number) => <label className="flex items-start gap-2 text-sm" key={index}><input className="mt-1 accent-primary" type="checkbox" name="choice" value={index} disabled={Boolean(result)} defaultChecked={Boolean(result?.selected?.includes(index))} /> {option}</label>)}<Button className="w-fit" disabled={Boolean(result)} type="submit">Sprawdź zestaw</Button>{result && <><p>{result.correct ? '✓ Poprawnie' : 'Do powtórki'} · {question.answers.map((index: number) => question.options[index]).join('; ')}</p><p>{question.why}</p>{question.quote && <p className="student-source rounded-md border-l-2 border-primary/50 bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground">{question.quote} · strona {question.page}</p>}</>}</form>;})}</section> : cards.length ? <section className="student-list grid gap-4">{cards.map((card) => {const result = payload.practice?.[card.id];return <form className="student-item grid gap-4 rounded-lg border bg-card p-5 shadow-xs sm:p-6" key={card.id} onSubmit={(event) => void submitPractice(card, event)}><p>{card.front}</p><label className="grid gap-2 text-sm font-medium">Twoja odpowiedź<input className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30" name="answer" required disabled={Boolean(result)} defaultValue={answers[card.id] || ''} /></label><Button className="w-fit" disabled={Boolean(result)} type="submit">Sprawdź</Button>{result && <p>{result.correct ? '✓ Odpowiedź zgodna' : 'Do powtórki'} · {card.back}</p>}</form>;})}</section> : <p className="student-muted text-sm text-muted-foreground">Ten zestaw nie ma jeszcze ćwiczeń.</p>}</TabsContent>
    <TabsContent value="cards">{currentCard ? <Card className="student-card gap-4 p-5 sm:p-6"><Badge variant="outline">Fiszka {cardIndex + 1} / {cards.length}</Badge>{currentCard.review?.dueAt && <p className="student-muted text-sm text-muted-foreground">Następna powtórka: {new Date(currentCard.review.dueAt).toLocaleString('pl-PL')}</p>}<div className="student-flash my-6 flex min-h-48 items-center justify-center rounded-lg border bg-muted/40 p-6 text-center text-xl font-medium leading-8">{currentCard.front}</div>{revealed ? <><h2 className="text-xl font-semibold">{currentCard.back}</h2><p className="student-source rounded-md border-l-2 border-primary/50 bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground">{currentCard.quote || 'Fiszka własna'} {currentCard.page && `· strona ${currentCard.page}`}</p><p className="student-muted text-sm text-muted-foreground">Oceń, jak dobrze pamiętasz odpowiedź.</p><div className="student-actions flex flex-wrap gap-2">{(['again', 'hard', 'good', 'easy'] as const).map((grade) => <Button variant="outline" key={grade} onClick={() => { onRate(entry, currentCard.id, grade); setRevealed(false); }} type="button">{{ again: 'Jeszcze raz · 10 min', hard: 'Trudne', good: 'Pamiętam', easy: 'Łatwe' }[grade]}</Button>)}</div></> : <Button onClick={() => setRevealed(true)} type="button">Pokaż odpowiedź</Button>}<div className="student-actions flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setCardIndex((cardIndex + cards.length - 1) % cards.length); setRevealed(false); }} type="button">← Poprzednia</Button><Button variant="outline" onClick={() => { setCardIndex((cardIndex + 1) % cards.length); setRevealed(false); }} type="button">Następna →</Button><Button variant={currentCard.known ? 'secondary' : 'outline'} onClick={() => void toggleKnown(currentCard)} type="button">{currentCard.known ? 'Cofnij opanowanie' : 'Oznacz jako opanowaną'}</Button><Button variant="outline" onClick={() => setEditingCard(currentCard)} type="button">Edytuj fiszkę</Button></div>{editingCard && <form className="student-form grid gap-4" onSubmit={(event) => void saveCard(event)}><label className="grid gap-2 text-sm font-medium">Pytanie<input className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30" name="front" defaultValue={editingCard.front} maxLength={1500} required /></label><label className="grid gap-2 text-sm font-medium">Odpowiedź<textarea className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30" name="back" defaultValue={editingCard.back} maxLength={1500} required /></label><div className="student-actions flex gap-2"><Button type="submit">Zapisz fiszkę</Button><Button variant="outline" type="button" onClick={() => setEditingCard(null)}>Anuluj</Button></div></form>}</Card> : <p className="student-muted text-sm text-muted-foreground">Ten zestaw nie zawiera fiszek.</p>}</TabsContent>
    {payload.testHistory?.length ? <details className="student-item cursor-pointer rounded-lg border bg-card p-5 shadow-xs"><summary className="font-medium">Poprzednie próby ({payload.testHistory.length})</summary>{payload.testHistory.map((attempt, index) => <p className="mt-2 text-sm text-muted-foreground" key={index}>{new Date(attempt.at).toLocaleString('pl-PL')}</p>)}</details> : null}
  </Tabs>;

  return <>
    <div className="student-hero space-y-3 border-b pb-5">
      <Button variant="ghost" onClick={onBack} type="button">← Wróć</Button>
      <span className="student-eyebrow text-xs font-semibold tracking-wide text-primary uppercase">{entry.kind === 'audio' ? 'Notatka głosowa' : entry.kind === 'material' ? 'Materiał źródłowy' : 'Notatka'} · {subject?.title}</span>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{entry.title}</h1>
      <div className="student-actions flex flex-wrap gap-2">
        {payload.path && <Button variant="outline" onClick={onDownload} type="button">{entry.kind === 'audio' ? 'Odtwórz nagranie' : 'Pobierz plik'}</Button>}
        {entry.kind === 'material' && payload.pages?.some((page) => page.text.trim()) && <><Button onClick={onGenerate} type="button">Utwórz fiszki i ćwiczenie</Button><Button variant="outline" onClick={onGenerateAI} type="button">Opracuj z AI</Button></>}
        {entry.kind === 'note' && <Button variant="outline" onClick={onGenerate} type="button">Utwórz ćwiczenia z notatki</Button>}
        <Button variant="outline" onClick={onEdit} type="button">Edytuj wpis</Button>
        <Button variant="outline" onClick={onArchive} type="button">{entry.archived ? 'Przywróć z archiwum' : 'Archiwizuj'}</Button>
      </div>
    </div>
    {entry.kind === 'audio' && payload.path && (audioUrl ? <audio controls className="student-audio w-full" src={audioUrl} /> : <p className="student-muted text-sm text-muted-foreground">Pobierz nagranie, aby je odtworzyć.</p>)}
    {payload.text && <Card className="student-item p-5 sm:p-6"><p className="student-pre whitespace-pre-wrap break-words leading-7">{payload.text}</p></Card>}
    {payload.pages?.map((page) => <details className="student-item cursor-pointer rounded-lg border bg-card p-5 shadow-xs" key={page.page}><summary className="font-medium">Strona {page.page} — tekst źródłowy</summary><p className="student-pre mt-3 whitespace-pre-wrap break-words leading-7">{page.text}</p>{payload.ocr?.pages?.[page.page]?.uncertain && <p className="student-muted mt-2 text-sm text-muted-foreground">Odczyt OCR wymaga sprawdzenia.</p>}</details>)}
  </>;
};