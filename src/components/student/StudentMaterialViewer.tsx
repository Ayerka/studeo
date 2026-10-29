import React, { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { applyOcrPage, OCR_BATCH, ocrCandidates } from '../../ocr-model.js';
import type { StudentEntry } from '../../types';

interface StudentMaterialViewerProps {
  client: SupabaseClient;
  entry: StudentEntry;
  onSave: (entry: Partial<StudentEntry>) => Promise<StudentEntry>;
  onDownload: () => void;
  onBuildCourse: () => void;
}

export const StudentMaterialViewer: React.FC<StudentMaterialViewerProps> = ({
  client,
  entry,
  onSave,
  onDownload,
  onBuildCourse,
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
        const { getDocument } = await import('../../student-files.js');
        if (cancelled || !isCurrent.current) return;
        task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
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
      const { openOcrPdf } = await import('../../student-files.js');
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

  return <section className="student-material-viewer">
    <div className="student-hero"><span className="student-eyebrow">Materiał źródłowy</span><h2>{entry.title}</h2><div className="student-actions"><button className="student-quiet" onClick={onDownload} type="button" disabled={!entry.payload.path}>Pobierz oryginał</button><button className="student-primary" onClick={onBuildCourse} type="button" disabled={!pages.some((page) => page.text.trim())}>Opracuj / aktualizuj kurs</button></div></div>
    {entry.payload.fileRemoved && <p className="student-muted">Oryginalny plik został usunięty. Zapisany tekst i kurs są nadal dostępne.</p>}
    {isPdf && <div className="student-actions" aria-label="Widok materiału"><button className="student-quiet" aria-pressed={view === 'pdf'} onClick={() => setView('pdf')} type="button">Podgląd PDF</button><button className="student-quiet" aria-pressed={view === 'text'} onClick={() => setView('text')} type="button">Tekst źródłowy</button></div>}
    {isPdf && <section className="student-card"><h3>Odczyt skanu (OCR)</h3><p>{candidates.length} stron czeka na odczyt. Odczytujemy do {OCR_BATCH} stron na partię.</p><p className="student-muted">Obrazy stron są przesyłane do OCR. Jedna strona zużywa jedno użycie AI. Sprawdź wynik; OCR może się pomylić. Oryginalny PDF pozostaje bez zmian.</p><div className="student-actions"><button className="student-quiet" disabled={ocrBusy || !candidates.length} onClick={() => void runOcr()} type="button">Odczytaj następne strony</button><label>Wybrana strona<select value={ocrPage} onChange={(event) => setOcrPage(Number(event.target.value))}>{pages.map((page) => <option value={page.page} key={page.page}>{page.page}</option>)}</select></label><button className="student-quiet" disabled={ocrBusy} onClick={() => void runOcr(ocrPage)} type="button">Odczytaj wybraną stronę</button>{ocrBusy && <button className="student-quiet" disabled={stopAfterPage} onClick={() => { stopRef.current = true; setStopAfterPage(true); }} type="button">{stopAfterPage ? 'Zatrzymuję po bieżącej stronie…' : 'Zatrzymaj po tej stronie'}</button>}</div></section>}
    {status && <p className="student-status" role="status">{status}</p>}
    {isPdf && view === 'pdf' && <section className="student-pdf"><div className="student-actions pdf-toolbar"><button className="student-quiet" onClick={() => setPageNumber((page) => Math.max(1, page - 1))} disabled={pageNumber <= 1} type="button">← Poprzednia</button><label>Strona <input type="number" min="1" max={pageCount || undefined} value={pageNumber} onChange={(event) => setPageNumber(Math.max(1, Number(event.target.value)))} /></label><span>{pageCount ? `z ${pageCount}` : ''}</span><button className="student-quiet" onClick={() => setPageNumber((page) => Math.min(pageCount || page + 1, page + 1))} disabled={!pageCount || pageNumber >= pageCount} type="button">Następna →</button><label>Powiększenie<select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value={1}>Dopasuj</option><option value={1.5}>150%</option><option value={2}>200%</option></select></label></div><p className="student-muted" role="status">{status}</p><div className="pdf-canvas-wrap"><canvas ref={canvasRef} role="img" aria-label={`Podgląd strony ${pageNumber} z PDF`} /></div></section>}
    {view === 'text' && <div className="student-list">{pages.map((page) => <details className="student-item" key={page.page} open={pages.length < 4}><summary>Strona {page.page} — tekst źródłowy</summary><p className="student-pre">{page.text}</p>{entry.payload.ocr?.pages?.[page.page] && <form onSubmit={(event) => { event.preventDefault(); void saveCorrection(page.page); }}><label>Popraw odczyt<textarea value={corrections[page.page] ?? page.text} onChange={(event) => setCorrections((current) => ({ ...current, [page.page]: event.target.value }))} maxLength={16000} /></label><button className="student-quiet" type="submit">Zapisz poprawiony tekst</button></form>}</details>)}</div>}
  </section>;
};