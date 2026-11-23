import type { StudentEntry } from '@/types';


export function gb(bytes: number = 0): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function fileReferences(entries: StudentEntry[], path: string): StudentEntry[] {
  return entries.filter((entry) => {
    if (entry.payload.path === path) return true;
    return entry.payload.attachments?.some((att) => att.path === path);
  });
}