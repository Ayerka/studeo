import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { MaterialPage } from '@/types';

GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_SOURCE_CHARS = 120_000;
const MAX_PDF_PAGES = 100;

export function selectPdfPages(range: string, count: number): number[] {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error('Nie udało się ustalić liczby stron PDF.');
  }

  const input = range.trim().replace(/[–—]/g, '-');
  if (!input) {
    if (count > MAX_PDF_PAGES) {
      throw new Error(`PDF ma ${count} stron. Wpisz strony do nauki, np. 1-50 (maksymalnie ${MAX_PDF_PAGES} stron naraz).`);
    }
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  const selected = new Set<number>();
  for (const part of input.split(',')) {
    const match = part.trim().match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!match) {
      throw new Error('Wpisz strony w formacie 1-50 lub 1-10, 25, 40-50.');
    }

    const first = Number(match[1]);
    const last = Number(match[2] || match[1]);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last > count || first > last) {
      throw new Error(`Zakres stron musi mieścić się między 1 a ${count}, od mniejszej do większej liczby.`);
    }
    if (last - first + 1 > MAX_PDF_PAGES) {
      throw new Error(`Wybierz maksymalnie ${MAX_PDF_PAGES} stron naraz.`);
    }
    for (let page = first; page <= last; page += 1) {
      selected.add(page);
      if (selected.size > MAX_PDF_PAGES) {
        throw new Error(`Wybierz maksymalnie ${MAX_PDF_PAGES} stron naraz.`);
      }
    }
  }

  return [...selected].sort((a, b) => a - b);
}

export async function readMaterial(file: File, range = ''): Promise<MaterialPage[]> {
  if (/\.(txt|md)$/i.test(file.name)) {
    const text = await file.text();
    if (text.length > MAX_SOURCE_CHARS) {
      throw new Error('Tekst jest za długi. Podziel go na części do 120 tys. znaków.');
    }
    return [{ page: 1, text }];
  }

  if (!/\.pdf$/i.test(file.name)) return [];

  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    const pages: MaterialPage[] = [];
    let total = 0;
    for (const pageNumber of selectPdfPages(range, pdf.numPages)) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const text = content.items.map((item) => {
          if (!('str' in item)) return '';
          return item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ');
        }).join('');
        total += text.length;
        if (total > MAX_SOURCE_CHARS) {
          throw new Error('Wybrane strony zawierają ponad 120 tys. znaków. Wybierz mniejszy zakres.');
        }
        pages.push({ page: pageNumber, text });
      } finally {
        page.cleanup();
      }
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

export { getDocument };

export async function openOcrPdf(file: Blob) {
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    return {
      count: pdf.numPages,
      async image(pageNumber: number) {
        if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > pdf.numPages) {
          throw new Error('Wybrana strona PDF nie istnieje.');
        }
        const page = await pdf.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2.5, 2000 / Math.max(base.width, base.height)) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        try {
          await page.render({ canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff' }).promise;
          const image = canvas.toDataURL('image/jpeg', 0.85);
          if (image.length > 2_800_000) throw new Error('Obraz strony jest za duży do OCR.');
          return image;
        } finally {
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
        }
      },
      close: () => task.destroy(),
    };
  } catch (error) {
    await task.destroy();
    throw error;
  }
}