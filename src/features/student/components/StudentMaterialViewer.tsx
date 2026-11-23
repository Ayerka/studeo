import React, { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { applyOcrPage, OCR_BATCH, ocrCandidates } from '../lib/ocr-model.js';
import type { StudentEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StudentMaterialViewerProps {
  client: SupabaseClient;
  entry: StudentEntry;
  onSave: (entry: Partial<StudentEntry>) => Promise<StudentEntry>;
  onDownload: () => void;
  onBuildCourse: () => void;
  onArchive: () => void;
}

export const StudentMaterialViewer: React.FC<StudentMaterialViewerProps> = ({
  client,
  entry,
  onSave,
  onDownload,
  onBuildCourse,
  onArchive,
}) => {
  const [view, setView] = useState<'pdf' | 'text'>('pdf');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pdf, setPdf] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [ocrPage, setOcrPage] = useState(1);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [stopAfterPage, setStopAfterPage] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef(false);

  const isPdf = Boolean(entry.payload.path && /\.pdf$/i.test(entry.payload.fileName || entry.payload.path));
  const pages = entry.payload.pages || [];
  const candidates = ocrCandidates(entry);
  const isCurrent = useRef(true);

  useEffect(() => {
    isCurrent.current = true;
    if (!isPdf || !entry.payload.path || view !== 'pdf') return () => { isCurrent.current = false; };
    let task: any;
    let cancelled = false;
    void (async () => {
      try {
        setStatus('Pobieram prywatny PDF…');
        const { data: file, error } = await client.storage.from('student-private').download(entry.payload.path!);
        if (error) throw error;
        if (cancelled || !isCurrent.current) return;
        const { getDocument } = await import('../lib/student-files.js');
        if (cancelled || !isCurrent.current) return;
        task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        const document = await task.promise;
        if (cancelled || !isCurrent.current) { await task.destroy(); return; }
        setPdf(document);
        setPageCount(document.numPages);
        setPageNumber(1);
        setStatus('');
      } catch (error: any) {
        if (!cancelled) setStatus(error.message || 'Nie udało się otworzyć PDF.');
      }
    })();
    return () => {
      cancelled = true;
      setPdf(null);
      void task?.destroy?.();
    };
  }, [client, entry.id, entry.payload.path, isPdf, view]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || view !== 'pdf') return;
    let cancelled = false;
    let renderTask: any;
    void (async () => {
      try {
        const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const width = Math.max(240, Math.min(1200, canvasRef.current?.parentElement?.clientWidth || 800));
        const viewport = page.getViewport({ scale: (width / base.width) * zoom });
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        renderTask = page.render({
          canvasContext: canvas.getContext('2d'),
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        await renderTask.promise;
      } catch (error: any) {
        if (!cancelled && error.name !== 'RenderingCancelledException') setStatus('Nie udało się narysować strony PDF.');
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [pdf, pageNumber, zoom, view]);

  const runOcr = async (singlePage?: number) => {
    if (!entry.payload.path || ocrBusy) return;
    const selectedPages = singlePage
      ? pages.filter((page) => page.page === singlePage)
      : candidates.slice(0, OCR_BATCH);
    if (!selectedPages.length) {
      setStatus('Nie znaleziono stron oczekujących na OCR.');
      return;
    }
    setOcrBusy(true);
    setStopAfterPage(false);
    stopRef.current = false;
    let opened: { image: (pageNumber: number) => Promise<string>; close: () => Promise<void> } | null = null;
    let currentMaterial = entry;
    let saved = 0;
    try {
      const { data: file, error } = await client.storage.from('student-private').download(entry.payload.path);
      if (error) throw error;
      const { openOcrPdf } = await import('../lib/student-files.js');
      opened = await openOcrPdf(file);
      for (const page of selectedPages) {
        if (stopRef.current) break;
        setStatus(`OCR: strona ${page.page} · ${saved + 1} z ${selectedPages.length}…`);
        const image = await opened.image(page.page);
        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData.session) throw new Error('Zaloguj się ponownie.');
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
          body: JSON.stringify({ materialId: entry.id, page: page.page, image }),
          signal: AbortSignal.timeout(115000),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Nie udało się odczytać strony.');
        if (result.materialId !== currentMaterial.id || result.page !== page.page || result.revision !== currentMaterial.revision) {
          throw new Error('Materiał zmienił się na innym urządzeniu. Odśwież go przed ponowieniem OCR.');
        }
        currentMaterial = await onSave(applyOcrPage(currentMaterial, page.page, result));
        saved += 1;
      }
      setView('text');
      setStatus(`✓ OCR zapisał ${saved} stron. Sprawdź odczyt przed opracowaniem kursu.`);
    } catch (error: any) {
      setStatus(error.message || 'Nie udało się wykonać OCR.');
    } finally {
      await opened?.close();
      setOcrBusy(false);
      setStopAfterPage(false);
    }
  };

  const saveCorrection = async (page: number) => {
    const result = { text: corrections[page] ?? pages.find((item) => item.page === page)?.text ?? '', uncertain: false };
    try {
      await onSave(applyOcrPage(entry, page, result));
      setStatus(`Poprawiony tekst strony ${page} zapisany.`);
    } catch (error: any) {
      setStatus(error.message || 'Nie udało się zapisać poprawionego tekstu.');
    }
  };

  return <section className="student-material-viewer space-y-5">
    <div className="student-hero space-y-3 border-b pb-5"><span className="student-eyebrow text-xs font-semibold tracking-wide text-primary uppercase">Materiał źródłowy</span><h2 className="text-xl font-semibold tracking-tight">{entry.title}</h2><div className="student-actions flex flex-wrap gap-2"><Button variant="outline" onClick={onDownload} type="button" disabled={!entry.payload.path}>Pobierz oryginał</Button><Button onClick={onBuildCourse} type="button" disabled={!pages.some((page) => page.text.trim())}>Opracuj / aktualizuj kurs</Button><Button variant="outline" onClick={onArchive} type="button">{entry.archived ? 'Przywróć z archiwum' : 'Archiwizuj'}</Button></div></div>
    {entry.payload.fileRemoved && <p className="student-muted text-sm text-muted-foreground">Oryginalny plik został usunięty. Zapisany tekst i kurs są nadal dostępne.</p>}
    {isPdf ? <Tabs className="space-y-5" value={view} onValueChange={(value) => setView(value as typeof view)}>
      <TabsList aria-label="Widok materiału"><TabsTrigger value="pdf">Podgląd PDF</TabsTrigger><TabsTrigger value="text">Tekst źródłowy</TabsTrigger></TabsList>
      <Card className="student-card gap-4 p-5 sm:p-6"><h3 className="text-lg font-semibold">Odczyt skanu (OCR)</h3><p className="text-sm">{candidates.length} stron czeka na odczyt. Odczytujemy do {OCR_BATCH} stron na partię.</p><p className="student-muted text-sm leading-6 text-muted-foreground">Obrazy stron są przesyłane do OCR. Jedna strona zużywa jedno użycie AI. Sprawdź wynik; OCR może się pomylić. Oryginalny PDF pozostaje bez zmian.</p><div className="student-actions flex flex-wrap items-end gap-2"><Button variant="outline" disabled={ocrBusy || !candidates.length} onClick={() => void runOcr()} type="button">Odczytaj następne strony</Button><label className="grid gap-2 text-sm font-medium">Wybrana strona<select className="h-9 min-w-24 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30" value={ocrPage} onChange={(event) => setOcrPage(Number(event.target.value))}>{pages.map((page) => <option value={page.page} key={page.page}>{page.page}</option>)}</select></label><Button variant="outline" disabled={ocrBusy} onClick={() => void runOcr(ocrPage)} type="button">Odczytaj wybraną stronę</Button>{ocrBusy && <Button variant="outline" disabled={stopAfterPage} onClick={() => { stopRef.current = true; setStopAfterPage(true); }} type="button">{stopAfterPage ? 'Zatrzymuję po bieżącej stronie…' : 'Zatrzymaj po tej stronie'}</Button>}</div></Card>
      {status && <p className="student-status rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm" role="status">{status}</p>}
      <TabsContent value="pdf"><section className="student-pdf min-w-0 space-y-4"><div className="student-actions pdf-toolbar flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"><Button variant="outline" onClick={() => setPageNumber((page) => Math.max(1, page - 1))} disabled={pageNumber <= 1} type="button">← Poprzednia</Button><label className="flex items-center gap-2 text-sm font-medium">Strona <input className="h-9 w-20 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30" type="number" min="1" max={pageCount || undefined} value={pageNumber} onChange={(event) => setPageNumber(Math.max(1, Number(event.target.value)))} /></label><span className="text-sm text-muted-foreground">{pageCount ? `z ${pageCount}` : ''}</span><Button variant="outline" onClick={() => setPageNumber((page) => Math.min(pageCount || page + 1, page + 1))} disabled={!pageCount || pageNumber >= pageCount} type="button">Następna →</Button><label className="flex items-center gap-2 text-sm font-medium">Powiększenie<select className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value={1}>Dopasuj</option><option value={1.5}>150%</option><option value={2}>200%</option></select></label></div><div className="pdf-canvas-wrap flex max-h-[75vh] justify-center overflow-auto rounded-lg border bg-muted/40 p-3"><canvas className="h-auto max-w-full shadow-md" ref={canvasRef} role="img" aria-label={`Podgląd strony ${pageNumber} z PDF`} /></div></section></TabsContent>
      <TabsContent value="text"><div className="student-list grid gap-4">{pages.map((page) => <details className="student-item cursor-pointer rounded-lg border bg-card p-5 shadow-xs" key={page.page} open={pages.length < 4}><summary className="font-medium">Strona {page.page} — tekst źródłowy</summary><p className="student-pre mt-3 whitespace-pre-wrap break-words leading-7">{page.text}</p>{entry.payload.ocr?.pages?.[page.page] && <form className="mt-4 grid gap-4" onSubmit={(event) => { event.preventDefault(); void saveCorrection(page.page); }}><label className="grid gap-2 text-sm font-medium">Popraw odczyt<textarea className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30" value={corrections[page.page] ?? page.text} onChange={(event) => setCorrections((current) => ({ ...current, [page.page]: event.target.value }))} maxLength={16000} /></label><Button variant="outline" className="w-fit" type="submit">Zapisz poprawiony tekst</Button></form>}</details>)}</div></TabsContent>
    </Tabs> : <div className="student-list grid gap-4">{pages.map((page) => <Card className="student-item gap-3 p-5 sm:p-6" key={page.page}><h2 className="text-lg font-semibold">Strona {page.page}</h2><p className="student-pre whitespace-pre-wrap break-words leading-7">{page.text}</p>{entry.payload.ocr?.pages?.[page.page]?.uncertain && <p className="student-muted text-sm text-muted-foreground">Odczyt OCR wymaga sprawdzenia.</p>}</Card>)}</div>}
  </section>;
};