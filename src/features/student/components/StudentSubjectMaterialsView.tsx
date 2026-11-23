import { FileText, Plus } from 'lucide-react';

import type { StudentEntry } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StudentSubjectMaterialsViewProps {
  entries: StudentEntry[];
  onCreateMaterial: () => void;
  onOpenEntry: (entry: StudentEntry) => void;
}

export function StudentSubjectMaterialsView({ entries, onCreateMaterial, onOpenEntry }: StudentSubjectMaterialsViewProps) {
  const materials = entries
    .filter((entry) => entry.kind === 'material' && !entry.payload.courseSnapshot)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div>
          <Badge variant="outline" className="mb-2 gap-1.5"><FileText className="size-3" /> Materiały</Badge>
          <h2 className="text-xl font-semibold">Materiały przedmiotu</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pliki i teksty źródłowe, z których powstaje Twój kurs.</p>
        </div>
        <Button onClick={onCreateMaterial} type="button"><Plus /> Dodaj materiał</Button>
      </header>

      {materials.length ? (
        <div className="divide-y rounded-lg border">
          {materials.map((entry) => {
            const pages = entry.payload.pages || [];
            const characterCount = pages.reduce((total, page) => total + page.text.length, 0);
            const hasFile = Boolean(entry.payload.fileName || entry.payload.path);
            return (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-primary"><FileText className="size-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {hasFile ? entry.payload.fileName || 'Plik materiału' : 'Tekst źródłowy'}
                      {' · '}{pages.length} {pages.length === 1 ? 'strona' : 'stron'}
                      {' · '}{characterCount.toLocaleString('pl-PL')} znaków
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onOpenEntry(entry)} type="button">Otwórz materiał</Button>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto grid size-10 place-items-center rounded-full bg-muted text-primary"><FileText className="size-5" /></div>
            <CardTitle className="text-base">Tu pojawią się materiały</CardTitle>
            <CardDescription>Dodaj PDF, dokument tekstowy lub własne notatki. Potem otwórz „Mój kurs”, aby opracować je do nauki.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={onCreateMaterial} type="button"><Plus /> Dodaj pierwszy materiał</Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
