import React, { useState } from 'react';
import { normalizeAnswer } from '../../student-model';
import type { FlashCard, StudentEntry, StudentSubject } from '../../types';

interface StudentEntryViewProps {
  entry: StudentEntry;
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
  onTaskAI: (question: string) => void;
  onArchive: () => void;
  notify: (message: string, error?: boolean) => void;
}

export const StudentEntryView: React.FC<StudentEntryViewProps> = ({
  entry,
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
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const payload = entry.payload;
  const cards = payload.cards || [];
  const currentCard = cards[cardIndex];

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
    <div className="student-hero"><button className="student-quiet" onClick={onBack} type="button">← Wróć</button><span className="student-eyebrow">Zadanie · {subject?.title}</span><h1>{entry.title}</h1><p>{payload.due ? `Termin ${payload.due}` : 'Bez terminu'} · {payload.status || 'todo'}</p><div className="student-actions"><button className="student-primary" onClick={onEdit} type="button">Edytuj zadanie</button><button className="student-quiet" onClick={onArchive} type="button">Archiwizuj</button></div></div>
    <section className="student-workspace"><h2>Polecenie</h2><p className="student-pre">{payload.description || 'Brak opisu zadania.'}</p><h2>Moje notatki i rozwiązanie</h2><p className="student-pre">{payload.workNotes || 'Nie dodano jeszcze notatek.'}</p><h2>Załączniki</h2>{(payload.attachments || []).map((file) => <p className="student-task-file" key={file.id}>📎 {file.name} <button className="student-quiet" onClick={() => onDownloadAttachment(file.path, file.name)} type="button">Pobierz</button></p>)}</section>
    <section className="student-workspace"><h2>Pomoc AI</h2><p className="student-muted">Pytanie oraz zapisane polecenie i notatki zostaną przekazane do AI. Załączniki nie są odczytywane.</p><label>O co chcesz zapytać?<textarea maxLength={2000} onChange={(event) => setAnswers((current) => ({ ...current, taskQuestion: event.target.value }))} value={answers.taskQuestion || ''} /></label><div className="student-actions">{['Wyjaśnij polecenie', 'Zaplanuj kroki', 'Sprawdź moje notatki'].map((prompt) => <button className="student-quiet" type="button" key={prompt} onClick={() => setAnswers((current) => ({ ...current, taskQuestion: prompt }))}>{prompt}</button>)}</div><button className="student-primary" disabled={busy} onClick={() => onTaskAI(answers.taskQuestion || '')} type="button">Zapytaj AI</button></section>
  </>;

  if (entry.kind === 'deck') return <>
    <div className="student-hero"><button className="student-quiet" onClick={onBack} type="button">← Wróć</button><span className="student-eyebrow">{payload.method === 'ai' ? 'Opracowanie AI — sprawdzaj ze źródłem' : payload.method === 'manual' ? 'Twoje własne fiszki' : 'Ćwiczenia z materiału'}</span><h1>{entry.title}</h1><p className="student-muted">{cards.filter((card) => card.known).length} / {cards.length} fiszek opanowanych.</p><div className="student-actions"><button className="student-quiet" aria-pressed={tab === 'cards'} onClick={() => setTab('cards')} type="button">Fiszki</button><button className="student-quiet" aria-pressed={tab === 'quiz'} onClick={() => setTab('quiz')} type="button">Ćwiczenie</button>{payload.sections?.length ? <button className="student-quiet" aria-pressed={tab === 'read'} onClick={() => setTab('read')} type="button">Czytaj materiał</button> : null}{tab === 'quiz' && <button className="student-quiet" onClick={() => void resetQuiz()} type="button">Rozwiąż ponownie</button>}</div></div>
    {tab === 'read' ? <div className="student-list">{(payload.sections || []).map((section, index) => <article className="student-item" key={index}><h2>{section.title || `Strona ${section.page}`}</h2><p className="student-pre">{section.text}</p>{section.quote && <p className="student-source">{section.quote} · strona {section.page}</p>}</article>)}</div> : null}
    {tab === 'quiz' && payload.questions?.length ? <section className="student-list"><p className="student-muted">Zaznacz wszystkie poprawne odpowiedzi. Wynik zapisuje się na Twoim koncie.</p>{payload.questions.map((question: any) => {const result = payload.testAnswers?.[question.id];return <form className="student-item" key={question.id} onSubmit={(event) => void submitAiAnswer(question, event)}><h2>{question.q}</h2>{question.options.map((option: string, index: number) => <label key={index}><input type="checkbox" name="choice" value={index} disabled={Boolean(result)} defaultChecked={Boolean(result?.selected?.includes(index))} /> {option}</label>)}<button className="student-primary" disabled={Boolean(result)} type="submit">Sprawdź zestaw</button>{result && <><p>{result.correct ? '✓ Poprawnie' : 'Do powtórki'} · {question.answers.map((index: number) => question.options[index]).join('; ')}</p><p>{question.why}</p>{question.quote && <p className="student-source">{question.quote} · strona {question.page}</p>}</>}</form>;})}</section> : null}
    {tab === 'quiz' && !payload.questions?.length && <section className="student-list">{cards.map((card) => {const result = payload.practice?.[card.id];return <form className="student-item" key={card.id} onSubmit={(event) => void submitPractice(card, event)}><p>{card.front}</p><label>Twoja odpowiedź<input name="answer" required disabled={Boolean(result)} defaultValue={answers[card.id] || ''} /></label><button className="student-primary" disabled={Boolean(result)} type="submit">Sprawdź</button>{result && <p>{result.correct ? '✓ Odpowiedź zgodna' : 'Do powtórki'} · {card.back}</p>}</form>;})}</section>}
    {tab === 'cards' && currentCard && <article className="student-card"><span className="student-pill">Fiszka {cardIndex + 1} / {cards.length}</span>{currentCard.review?.dueAt && <p className="student-muted">Następna powtórka: {new Date(currentCard.review.dueAt).toLocaleString('pl-PL')}</p>}<div className="student-flash">{currentCard.front}</div>{revealed ? <><h2>{currentCard.back}</h2><p className="student-source">{currentCard.quote || 'Fiszka własna'} {currentCard.page && `· strona ${currentCard.page}`}</p><p className="student-muted">Oceń, jak dobrze pamiętasz odpowiedź.</p><div className="student-actions">{(['again', 'hard', 'good', 'easy'] as const).map((grade) => <button className="student-quiet" key={grade} onClick={() => { onRate(entry, currentCard.id, grade); setRevealed(false); }} type="button">{{ again: 'Jeszcze raz · 10 min', hard: 'Trudne', good: 'Pamiętam', easy: 'Łatwe' }[grade]}</button>)}</div></> : <button className="student-primary" onClick={() => setRevealed(true)} type="button">Pokaż odpowiedź</button>}<div className="student-actions"><button className="student-quiet" onClick={() => { setCardIndex((cardIndex + cards.length - 1) % cards.length); setRevealed(false); }} type="button">← Poprzednia</button><button className="student-quiet" onClick={() => { setCardIndex((cardIndex + 1) % cards.length); setRevealed(false); }} type="button">Następna →</button><button className="student-quiet" onClick={() => void toggleKnown(currentCard)} type="button">{currentCard.known ? 'Cofnij opanowanie' : 'Oznacz jako opanowaną'}</button><button className="student-quiet" onClick={() => setEditingCard(currentCard)} type="button">Edytuj fiszkę</button></div>{editingCard && <form className="student-form" onSubmit={(event) => void saveCard(event)}><label>Pytanie<input name="front" defaultValue={editingCard.front} maxLength={1500} required /></label><label>Odpowiedź<textarea name="back" defaultValue={editingCard.back} maxLength={1500} required /></label><div className="student-actions"><button className="student-primary" type="submit">Zapisz fiszkę</button><button className="student-quiet" type="button" onClick={() => setEditingCard(null)}>Anuluj</button></div></form>}</article>}
    {!cards.length && !payload.questions?.length && <p className="student-muted">Ten zestaw nie ma jeszcze ćwiczeń.</p>}
    {payload.testHistory?.length ? <details className="student-item"><summary>Poprzednie próby ({payload.testHistory.length})</summary>{payload.testHistory.map((attempt, index) => <p key={index}>{new Date(attempt.at).toLocaleString('pl-PL')}</p>)}</details> : null}
  </>;

  return <>
    <div className="student-hero">
      <button className="student-quiet" onClick={onBack} type="button">← Wróć</button>
      <span className="student-eyebrow">{entry.kind === 'audio' ? 'Notatka głosowa' : entry.kind === 'material' ? 'Materiał źródłowy' : 'Notatka'} · {subject?.title}</span>
      <h1>{entry.title}</h1>
      <div className="student-actions">
        {payload.path && <button className="student-quiet" onClick={onDownload} type="button">{entry.kind === 'audio' ? 'Odtwórz nagranie' : 'Pobierz plik'}</button>}
        {entry.kind === 'material' && payload.pages?.some((page) => page.text.trim()) && <><button className="student-primary" onClick={onGenerate} type="button">Utwórz fiszki i ćwiczenie</button><button className="student-quiet" onClick={onGenerateAI} type="button">Opracuj z AI</button></>}
        {entry.kind === 'note' && <button className="student-quiet" onClick={onGenerate} type="button">Utwórz ćwiczenia z notatki</button>}
        <button className="student-quiet" onClick={onEdit} type="button">Edytuj wpis</button>
        <button className="student-quiet" onClick={onArchive} type="button">Archiwizuj</button>
      </div>
    </div>
    {entry.kind === 'audio' && payload.path && (audioUrl ? <audio controls className="student-audio" src={audioUrl} /> : <p className="student-muted">Pobierz nagranie, aby je odtworzyć.</p>)}
    {payload.text && <article className="student-item"><p className="student-pre">{payload.text}</p></article>}
    {payload.pages?.map((page) => <details className="student-item" key={page.page}><summary>Strona {page.page} — tekst źródłowy</summary><p className="student-pre">{page.text}</p>{payload.ocr?.pages?.[page.page]?.uncertain && <p className="student-muted">Odczyt OCR wymaga sprawdzenia.</p>}</details>)}
  </>;
};