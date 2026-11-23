import type { StudentEntry, StudentSubject } from '@/types';

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export interface StudentBackup {
  app: 'Studeo';
  version: 1;
  exportedAt: string;
  state?: Record<string, unknown>;
  subjects: StudentSubject[];
  entries: StudentEntry[];
}

function portableEntry(entry: StudentEntry): StudentEntry {
  const payload = { ...entry.payload };
  const hadFile = Boolean(payload.path);
  delete payload.path;
  if (hadFile && entry.kind === 'material') payload.fileRemoved = true;
  if (Array.isArray(payload.attachments)) payload.attachments = [];
  return { ...entry, payload };
}

export function createStudentBackup(
  subjects: StudentSubject[],
  entries: StudentEntry[],
  state?: Record<string, unknown>,
): StudentBackup {
  return {
    app: 'Studeo',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...(state ? { state } : {}),
    subjects: subjects.map(({ user_id: _userId, ...subject }) => subject),
    entries: entries.map(({ user_id: _userId, ...entry }) => portableEntry(entry as StudentEntry)),
  };
}

export async function readStudentBackup(file: File): Promise<StudentBackup> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('Plik kopii jest większy niż 20 MB.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Plik nie zawiera poprawnego JSON-u.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Nieprawidłowy plik kopii zapasowej.');
  }
  const backup = parsed as Record<string, unknown>;
  if (backup.app !== 'Studeo' || ![1, 2].includes(Number(backup.version))) {
    throw new Error('Ta kopia nie jest obsługiwaną kopią Studeo.');
  }
  const subjects = Array.isArray(backup.subjects) ? backup.subjects : [];
  const entries = Array.isArray(backup.entries) ? backup.entries : [];
  if (subjects.length > 500 || entries.length > 10_000) {
    throw new Error('Kopia zawiera zbyt wiele rekordów.');
  }
  if (backup.state !== undefined && (!backup.state || typeof backup.state !== 'object' || Array.isArray(backup.state))) {
    throw new Error('Nieprawidłowy stan kursu w kopii.');
  }

  return {
    app: 'Studeo',
    version: 1,
    exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : new Date().toISOString(),
    ...(backup.state ? { state: backup.state as Record<string, unknown> } : {}),
    subjects: subjects as StudentSubject[],
    entries: entries as StudentEntry[],
  };
}
