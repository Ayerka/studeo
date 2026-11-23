import React from 'react';
import { ArrowRight, BookOpenCheck, CalendarClock, Layers, RotateCcw } from 'lucide-react';
import type { StudentEntry, StudentSubject } from '../../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dueCards } from '../lib/student-model.js';

interface StudentReviewsViewProps {
  entries: StudentEntry[];
  subjects: StudentSubject[];
  onOpenEntry: (entry: StudentEntry, cardId?: string) => void;
  onOpenSubjects: () => void;
}

const formatDueDate = (value: string) => new Date(value).toLocaleString('pl-PL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const StudentReviewsView: React.FC<StudentReviewsViewProps> = ({
  entries,
  subjects,
  onOpenEntry,
  onOpenSubjects,
}) => {
  const due = dueCards(entries);
  const dueCardKeys = new Set(due.map(({ deck, index }) => `${deck.id}:${index}`));
  const dueByDeck = new Map<string, typeof due>();

  due.forEach((item) => {
    const group = dueByDeck.get(item.deck.id) || [];
    group.push(item);
    dueByDeck.set(item.deck.id, group);
  });

  const upcomingByDeck = new Map<string, { deck: StudentEntry; count: number; nextAt: string }>();
  entries.filter((entry) => entry.kind === 'deck').forEach((deck) => {
    (deck.payload.cards || []).forEach((card, index) => {
      const dueAt = card.review?.dueAt;
      if (!dueAt || dueCardKeys.has(`${deck.id}:${index}`)) return;
      const group = upcomingByDeck.get(deck.id) || { deck, count: 0, nextAt: dueAt };
      group.count += 1;
      if (dueAt < group.nextAt) group.nextAt = dueAt;
      upcomingByDeck.set(deck.id, group);
    });
  });

  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.title]));
  const dueGroups = [...dueByDeck.values()].sort((a, b) => a[0].deck.title.localeCompare(b[0].deck.title, 'pl'));
  const upcomingGroups = [...upcomingByDeck.values()].sort((a, b) => a.nextAt.localeCompare(b.nextAt));
  const cardCount = entries.filter((entry) => entry.kind === 'deck').reduce((total, entry) => total + (entry.payload.cards?.length || 0), 0);

  return (
    <section className="student-view-shell">
      <header className="student-view-header">
        <Badge variant="outline" className="gap-1.5"><RotateCcw className="size-3" /> Nauka SRS</Badge>
        <h1 className="student-view-title">Powtórki</h1>
        <p className="student-view-copy">
          Wróć do fiszek, które czekają na utrwalenie. Po każdej odpowiedzi wybierzesz ocenę, a kolejny termin ustali się automatycznie.
        </p>
      </header>

      <div className="student-view-stats">
        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Do powtórki teraz</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{due.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="size-4 text-primary" /> {dueGroups.length} {dueGroups.length === 1 ? 'zestaw' : 'zestawy'}
          </CardContent>
        </Card>
        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Zaplanowane później</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{[...upcomingByDeck.values()].reduce((total, group) => total + group.count, 0)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="size-4 text-primary" /> Kolejne terminy w algorytmie SRS
          </CardContent>
        </Card>
        <Card className="gap-2 shadow-none">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">Wszystkie fiszki</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{cardCount}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpenCheck className="size-4 text-primary" /> Ze wszystkich aktywnych zestawów
          </CardContent>
        </Card>
      </div>

      {dueGroups.length ? (
        <section className="space-y-3" aria-labelledby="due-reviews-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="due-reviews-heading" className="text-lg font-semibold">Czekają na Ciebie</h2>
              <p className="text-sm text-muted-foreground">Zestaw rozpocznie się od pierwszej zaległej fiszki.</p>
            </div>
            <Badge variant="secondary">{due.length} {due.length === 1 ? 'fiszka' : 'fiszek'}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {dueGroups.map((group) => {
              const { deck } = group[0];
              return (
                <Card className="gap-4 shadow-none" key={deck.id}>
                  <CardHeader className="pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="truncate text-base">{deck.title}</CardTitle>
                        <CardDescription>{subjectNames.get(deck.subject_id) || 'Bez przedmiotu'}</CardDescription>
                      </div>
                      <Badge variant="outline" className="shrink-0">{group.length} do powtórki</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full justify-between" onClick={() => onOpenEntry(deck, group[0].card.id)} type="button">
                      Rozpocznij powtórkę <ArrowRight className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : cardCount ? (
        <Card className="gap-3 border-dashed py-8 text-center shadow-none">
          <CardContent className="space-y-2">
            <BookOpenCheck className="mx-auto size-7 text-emerald-600" />
            <h2 className="font-semibold">Wszystko powtórzone</h2>
            <p className="text-sm text-muted-foreground">Nie masz teraz zaległych fiszek. Następne terminy pojawią się tutaj automatycznie.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-3 border-dashed py-8 text-center shadow-none">
          <CardContent className="space-y-3">
            <Layers className="mx-auto size-7 text-muted-foreground" />
            <h2 className="font-semibold">Nie masz jeszcze fiszek</h2>
            <p className="text-sm text-muted-foreground">Dodaj przedmiot i utwórz pierwszy zestaw, aby rozpocząć powtórki.</p>
            <Button variant="outline" onClick={onOpenSubjects} type="button">Przejdź do przedmiotów</Button>
          </CardContent>
        </Card>
      )}

      {upcomingGroups.length > 0 && (
        <section className="space-y-3" aria-labelledby="upcoming-reviews-heading">
          <div>
            <h2 id="upcoming-reviews-heading" className="text-lg font-semibold">Następne terminy</h2>
            <p className="text-sm text-muted-foreground">Fiszki wrócą do puli, gdy nadejdzie ich czas.</p>
          </div>
          <div className="divide-y rounded-lg border">
            {upcomingGroups.map(({ deck, count, nextAt }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={deck.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{deck.title}</p>
                  <p className="text-xs text-muted-foreground">{subjectNames.get(deck.subject_id) || 'Bez przedmiotu'} · {count} {count === 1 ? 'fiszka' : 'fiszek'}</p>
                </div>
                <Badge variant="secondary">{formatDueDate(nextAt)}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
};