// src/features/student/lib/student-model.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountPlan, FlashCard, StudentEntry, StudentEntryPayload } from '@/types';

export const MAX_FILE = 20 * 1024 * 1024; // 20 MB

export const FALLBACK_PLAN: AccountPlan = {
  key: 'unknown',
  name: 'Plan niedostępny',
  limits: {
    subjects: 0,
    storage_bytes: 0,
    file_bytes: 0,
    ai_per_day: 0,
  },
};

export function normalizePlan(raw: unknown): AccountPlan {
  if (!raw || typeof raw !== 'object') return FALLBACK_PLAN;
  const plan = raw as { plan_key?: unknown; plan_name?: unknown; limits?: Record<string, unknown> };
  if (!plan.limits) return FALLBACK_PLAN;
  const limit = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const storageBytes = limit(plan.limits.storage_bytes);
  const fileBytes = limit(plan.limits.file_bytes);
  const aiPerDay = limit(plan.limits.ai_per_day);
  const subjects = plan.limits.subjects === null ? null : limit(plan.limits.subjects);
  if (typeof plan.plan_key !== 'string' || storageBytes === null || fileBytes === null || aiPerDay === null || subjects === null && plan.limits.subjects !== null) {
    return FALLBACK_PLAN;
  }
  return {
    key: plan.plan_key,
    name: String(plan.plan_name || plan.plan_key),
    limits: {
      subjects,
      storage_bytes: storageBytes,
      file_bytes: Math.min(fileBytes, MAX_FILE),
      ai_per_day: aiPerDay,
    },
  };
}

export function fileLimitText(plan: AccountPlan): string {
  if (plan.limits.file_bytes <= 0) return 'Nie udało się potwierdzić limitu plików. Odśwież plan konta i spróbuj ponownie.';
  const mb = Math.round(plan.limits.file_bytes / (1024 * 1024));
  return `Plik jest za duży. Maksymalny rozmiar w Twoim planie to ${mb} MB.`;
}

export function dateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeAnswer(ans: unknown): string {
  return String(ans ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Algorytm Spaced Repetition (SRS)
export function reviewCard(
  card: FlashCard,
  grade: 'again' | 'hard' | 'good' | 'easy'
): FlashCard {
  const count = (card.review?.count || 0) + 1;
  let intervalDays = 1;

  if (grade === 'again') {
    intervalDays = 0.01; // ~15 minut
  } else if (grade === 'hard') {
    intervalDays = Math.max(1, (card.review?.intervalDays || 1) * 1.2);
  } else if (grade === 'good') {
    intervalDays = Math.max(2, (card.review?.intervalDays || 1) * 2);
  } else if (grade === 'easy') {
    intervalDays = Math.max(4, (card.review?.intervalDays || 1) * 2.8);
  }

  const dueAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    ...card,
    known: grade !== 'again',
    review: {
      grade,
      count,
      intervalDays: Math.round(intervalDays * 10) / 10,
      dueAt,
      lastAt: new Date().toISOString(),
    },
  };
}

export function dueCards(entries: StudentEntry[]) {
  const now = new Date().toISOString();
  const result: { deck: StudentEntry; card: FlashCard; index: number }[] = [];

  entries
    .filter((e) => e.kind === 'deck' && !e.archived)
    .forEach((deck) => {
      (deck.payload.cards || []).forEach((card, index) => {
        if (!card.review?.dueAt || card.review.dueAt <= now) {
          result.push({ deck, card, index });
        }
      });
    });

  return result;
}

export function parseManualCards(raw: string): FlashCard[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [front, ...backParts] = line.split('|');
      return {
        id: crypto.randomUUID(),
        front: front?.trim() || '',
        back: backParts.join('|').trim() || '',
      };
    })
    .filter((c) => c.front && c.back);
}

export function makeStudy(pages: { page: number; text: string }[]) {
  const cards: FlashCard[] = [];
  pages.forEach((p) => {
    const sentences = p.text.split(/(?<=[.?!])\s+/).filter((s) => s.length > 20 && s.length < 200);
    sentences.slice(0, 3).forEach((s) => {
      cards.push({
        id: crypto.randomUUID(),
        front: `Pojęcie ze strony ${p.page}`,
        back: s,
        page: p.page,
        quote: s,
      });
    });
  });
  return { cards, sections: [] };
}

export function occursOn(entry: StudentEntry, date: Date): boolean {
  const payload = entry.payload;
  if (!payload.date) return false;
  const targetKey = dateKey(date);

  if (payload.date === targetKey) return true;
  if (payload.weekly && payload.date <= targetKey) {
    if (payload.until && payload.until < targetKey) return false;
    const startDay = new Date(payload.date).getDay();
    return date.getDay() === startDay;
  }
  return false;
}

export function completeTask(payload: StudentEntryPayload): StudentEntryPayload {
  const completions = payload.completions || [];
  const completedAt = new Date().toISOString();

  if (payload.repeat === 'daily') {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    return {
      ...payload,
      status: 'todo',
      due: dateKey(nextDate),
      completedAt,
      completions: [...completions, { due: payload.due || dateKey(), at: completedAt }].slice(-30),
    };
  }

  if (payload.repeat === 'weekly') {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    return {
      ...payload,
      status: 'todo',
      due: dateKey(nextDate),
      completedAt,
      completions: [...completions, { due: payload.due || dateKey(), at: completedAt }].slice(-30),
    };
  }

  return {
    ...payload,
    status: 'done',
    completedAt,
    completions: [...completions, { due: payload.due || dateKey(), at: completedAt }].slice(-30),
  };
}

export function validateEvent(params: {
  date?: unknown;
  until?: unknown;
  start?: unknown;
  end?: unknown;
  weekly?: unknown;
  address?: unknown;
  room?: unknown;
  building?: unknown;
}): StudentEntryPayload {
  return {
    date: typeof params.date === 'string' ? params.date : '',
    until: typeof params.until === 'string' ? params.until : '',
    start: typeof params.start === 'string' && params.start ? params.start : '09:00',
    end: typeof params.end === 'string' && params.end ? params.end : '10:30',
    weekly: Boolean(params.weekly),
    address: String(params.address || '').trim(),
    room: String(params.room || '').trim(),
    building: String(params.building || '').trim(),
  };
}

// Magazyn klient-chmura dla tabel studenta
export function createStudentStore(client: SupabaseClient) {
  let ownerId: string | null = null;

  return {
    setOwner(id: string | null) {
      ownerId = id;
    },
    async list(table: string) {
      if (!ownerId) return [];
      const { data, error } = await client
        .from(table)
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async save(table: string, record: any) {
      if (!ownerId) throw new Error('Brak zalogowanego użytkownika.');
      const toSave = { ...record, user_id: ownerId, revision: (record.revision || 0) + 1 };
      const { data, error } = await client
        .from(table)
        .upsert(toSave)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  };
}