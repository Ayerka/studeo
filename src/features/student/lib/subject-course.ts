// src/features/student/lib/subject-course.ts
import type { QuizQuestion, StudentEntry } from '@/types';

export interface CoursePlanJob {
  key: string;
  source: StudentEntry;
  part: number;
  parts: number;
  pages: { page: number; text: string }[];
  snapshot?: StudentEntry;
}

export const COURSE_CHUNK = 24_000;

function courseSources(entries: StudentEntry[], subjectId: string) {
  return entries.filter((entry) => entry.subject_id === subjectId && !entry.archived && !entry.payload.courseSnapshot &&
    (entry.kind === 'material' || (entry.kind === 'note' && !entry.payload.ai)));
}

function sourcePages(source: StudentEntry) {
  if (source.kind === 'note') return [{ page: 1, text: source.payload.text || '' }];
  return (source.payload.pages || []).filter((page) => Number.isSafeInteger(page.page) && typeof page.text === 'string');
}

function splitCoursePages(pages: { page: number; text: string }[]) {
  const chunks: { page: number; text: string }[][] = [];
  let current: { page: number; text: string }[] = [];
  let size = 0;

  for (const page of pages) {
    let text = page.text.trim();
    while (text) {
      const available = COURSE_CHUNK - size;
      if (available < 100) {
        if (current.length) chunks.push(current);
        current = [];
        size = 0;
        continue;
      }
      let end = Math.min(text.length, available);
      if (end < text.length) {
        const boundary = text.lastIndexOf(' ', end);
        if (boundary > Math.max(0, end - 500)) end = boundary;
      }
      const part = text.slice(0, end).trim();
      text = text.slice(end).trim();
      if (part) {
        current.push({ page: page.page, text: part });
        size += part.length;
      }
      if (text || size >= COURSE_CHUNK - 100) {
        chunks.push(current);
        current = [];
        size = 0;
      }
    }
  }
  if (current.length) chunks.push(current);
  if (chunks.length > 1 && chunks.at(-1)!.reduce((total, page) => total + page.text.length, 0) < 100) {
    chunks[chunks.length - 2].push(...chunks.pop()!);
  }

  return chunks.map((chunk) => {
    const byPage = new Map<number, string>();
    for (const page of chunk) byPage.set(page.page, `${byPage.get(page.page) || ''} ${page.text}`);
    return [...byPage].map(([page, text]) => ({ page, text: text.trim() }));
  });
}

export function coursePlan(entries: StudentEntry[], subjectId: string) {
  const jobs: CoursePlanJob[] = [];
  const skipped: StudentEntry[] = [];
  for (const source of courseSources(entries, subjectId)) {
    const pages = sourcePages(source);
    if (pages.reduce((total, page) => total + page.text.trim().length, 0) < 100) {
      skipped.push(source);
      continue;
    }
    const chunks = splitCoursePages(pages);
    chunks.forEach((chunk, index) => jobs.push({
      source,
      pages: chunk,
      part: index + 1,
      parts: chunks.length,
      key: `${source.id}:${source.revision || 1}:${index + 1}`,
    }));
  }

  const snapshots = entries.filter((entry) => entry.subject_id === subjectId && entry.payload.courseSnapshot?.version === 1);
  const decks = entries.filter((entry) => entry.subject_id === subjectId && entry.kind === 'deck' && !entry.archived &&
    snapshots.some((snapshot) => snapshot.id === entry.payload.sourceId));
  const current: { deck: StudentEntry; job: CoursePlanJob; snapshot?: StudentEntry }[] = [];
  const pending: CoursePlanJob[] = [];

  for (const job of jobs) {
    const snapshot = snapshots.find((entry) => {
      const meta = entry.payload.courseSnapshot!;
      const sameSource = meta.key === job.key || (job.source.payload.fileRemoved === true &&
        meta.sourceId === job.source.id && meta.part === job.part);
      return sameSource && JSON.stringify(entry.payload.pages) === JSON.stringify(job.pages);
    });
    const deck = snapshot && decks.find((entry) => entry.payload.sourceId === snapshot.id);
    if (snapshot) job.snapshot = snapshot;
    if (snapshot && deck) {
      current.push({ deck, job, snapshot });
    } else {
      const legacyDeck = decks.find((entry) => entry.payload.sourceId === job.source.id);
      if (legacyDeck && job.parts === 1) current.push({ deck: legacyDeck, job });
      else pending.push(job);
    }
  }

  const old = decks.filter((deck) => !current.some((item) => item.deck.id === deck.id));
  return { jobs, current, pending, old, skipped };
}

export function courseQuestions(plan: ReturnType<typeof coursePlan>, count: number): QuizQuestion[] {
  const questions = plan.current.flatMap(({ deck, job, snapshot }) =>
    (deck.payload.questions || []).map((question) => ({
      ...question,
      sourceTitle: snapshot?.payload.courseSnapshot?.sourceTitle || job.source.title,
      moduleId: deck.id,
    })));
  const unique = [...new Map(questions.map((question, index) => [question.id || `${question.moduleId}:${index}`, question])).values()];
  for (let index = unique.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [unique[index], unique[other]] = [unique[other], unique[index]];
  }
  return unique.slice(0, count);
}

export async function courseSnapshotId(userId: string, subjectId: string, jobKey: string): Promise<string> {
  const msg = `${userId}:${subjectId}:${jobKey}`;
  const buffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  // Format UUIDv4 z hasha
  return `${hashHex.slice(0, 8)}-${hashHex.slice(8, 12)}-4${hashHex.slice(13, 16)}-8${hashHex.slice(17, 20)}-${hashHex.slice(20, 32)}`;
}