// src/features/student/lib/ocr-model.ts
import type { MaterialPage, StudentEntry } from '@/types';

export const OCR_BATCH = 5;

export function ocrCandidates(entry: StudentEntry): MaterialPage[] {
  const pages = entry.payload.pages || [];
  const ocrPages = entry.payload.ocr?.pages || {};

  // Strony, które mają mało tekstu i nie były jeszcze odczytane przez OCR
  return pages.filter((p) => {
    if (ocrPages[p.page]) return false;
    return p.text.trim().length < 80;
  });
}

export function applyOcrPage(
  entry: StudentEntry,
  pageNumber: number,
  result: { text: string; uncertain: boolean }
): StudentEntry {
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
    throw new Error('Niepoprawny numer strony OCR.');
  }
  if (typeof result.text !== 'string' || result.text.length > 16_000 || typeof result.uncertain !== 'boolean') {
    throw new Error('Niepoprawny wynik OCR.');
  }

  const pages = [...(entry.payload.pages || [])];
  const targetIdx = pages.findIndex((p) => p.page === pageNumber);
  if (targetIdx < 0) throw new Error('Brak strony w materiale.');

  const source = pages[targetIdx];
  const text = result.text.trim();
  const retainedText = text || source.text;
  if (pages.reduce((total, page, index) => total + (index === targetIdx ? retainedText.length : page.text.length), 0) > 120_000) {
    throw new Error('Odczyt przekracza 120 tys. znaków. Podziel PDF na części.');
  }

  pages[targetIdx] = { ...source, text: retainedText };

  const ocr = {
    ...(entry.payload.ocr || {}),
    pages: {
      ...(entry.payload.ocr?.pages || {}),
      [pageNumber]: {
        at: new Date().toISOString(),
        uncertain: result.uncertain || !text,
        empty: !text,
        originalText: entry.payload.ocr?.pages?.[pageNumber]?.originalText ?? source.text,
      },
    },
  };

  return {
    ...entry,
    payload: {
      ...entry.payload,
      pages,
      ocr,
    },
  };
}