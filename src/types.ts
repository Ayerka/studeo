export interface QuizQuestion {
  q: string;
  options: string[];
  answer?: number;
  answers?: number[];
  why: string;
  id?: string;
  track?: number;
  lesson?: string;
  lessonTitle?: string;
  moduleId?: string;
  sourceTitle?: string;
}

export interface LessonSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface Lesson {
  id: string;
  track: number;
  title: string;
  subtitle: string;
  slides: string;
  icon: string;
  sections: LessonSection[];
  remember: string;
  example: string;
  pitfalls: string;
  quiz: QuizQuestion[];
  visual: string | null;
}

export type GlossaryItem = [string, string];

export interface ProgressState {
  done: string[];
  flashKnown: string[];
  examBest: number;
  examCount: number;
  quizScores: Record<string, { total: number; correct: number }>;
}

export interface ExamAnswer {
  answer: number | number[];
  shown?: boolean;
}

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  quote?: string;
  page?: number;
  known?: boolean;
  review?: {
    grade?: string;
    intervalDays?: number;
    dueAt?: string;
    lastAt?: string;
    count?: number;
  };
}

export interface StudentSubject {
  id: string;
  user_id?: string;
  title: string;
  archived?: boolean;
  revision?: number;
  created_at?: string;
  color?: string;
}

export interface TaskAttachment {
  id: string;
  role: 'source' | 'submission';
  name: string;
  path: string;
  at: string;
}

export interface TaskCompletion {
  due: string;
  at: string;
}

export interface MaterialPage {
  page: number;
  text: string;
}

export interface CourseSnapshotMeta {
  version: number;
  key: string;
  sourceId: string;
  sourceRevision: number;
  sourceTitle: string;
  part: number;
  parts: number;
  startedAt?: string | null;
}

export interface StudentEntryPayload {
  text?: string;
  description?: string;
  workNotes?: string;
  workNotesUpdatedAt?: string | null;
  due?: string;
  status?: 'todo' | 'doing' | 'done';
  repeat?: 'none' | 'daily' | 'weekly';
  completedAt?: string | null;
  completions?: TaskCompletion[];
  attachments?: TaskAttachment[];
  date?: string;
  start?: string;
  end?: string;
  until?: string;
  weekly?: boolean;
  address?: string;
  room?: string;
  building?: string;
  pages?: MaterialPage[];
  fileName?: string;
  path?: string;
  fileRemoved?: boolean;
  cards?: FlashCard[];
  sections?: { title?: string; page?: number; text: string; quote?: string }[];
  questions?: QuizQuestion[];
  method?: string;
  sourceId?: string;
  courseSnapshot?: CourseSnapshotMeta;
  ocr?: {
    pages?: Record<number, { at: string; uncertain: boolean; empty: boolean; originalText?: string }>;
  };
  ai?: boolean;
  taskId?: string;
  question?: string;
  lessonDone?: Record<number, boolean>;
}

export interface StudentEntry {
  id: string;
  subject_id: string;
  user_id?: string;
  kind: 'material' | 'note' | 'event' | 'task' | 'deck' | 'audio';
  title: string;
  payload: StudentEntryPayload;
  archived?: boolean;
  revision?: number;
  created_at?: string;
}

export interface AccountPlan {
  key: string;
  name: string;
  limits: {
    subjects: number | null;
    storage_bytes: number;
    file_bytes: number;
    ai_per_day: number;
  };
}

export interface AccountUsageData {
  plan: {
    plan_key: string;
    plan_name: string;
    limits: {
      storage_bytes: number;
      ai_per_day: number;
      file_bytes: number;
    };
  };
  storage_bytes: number;
  reserved_bytes?: number;
  ai_used: number;
  ai_resets_at: string;
  files: {
    path: string;
    size: number;
    created_at: string;
  }[];
}
