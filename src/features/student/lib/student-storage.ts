import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountPlan } from '@/types';
import { MAX_FILE, fileLimitText } from './student-model';

const STORAGE_BUCKET = 'student-private';

export async function uploadStudentFile(
  client: SupabaseClient,
  file: File,
  plan: AccountPlan,
): Promise<string> {
  if (plan.limits.file_bytes <= 0 || plan.limits.storage_bytes <= 0) {
    throw new Error('Nie udało się potwierdzić limitu plików. Odśwież plan konta i spróbuj ponownie.');
  }
  if (file.size > plan.limits.file_bytes || file.size > MAX_FILE) {
    throw new Error(fileLimitText(plan));
  }

  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'plik';
  const reservation = await client.rpc('student_reserve_upload', { file_name: fileName });
  if (reservation.error) {
    throw new Error(reservation.error.code === '53400'
      ? 'Brak miejsca na plik. Zwolnij miejsce w profilu i spróbuj ponownie.'
      : 'Nie udało się zarezerwować miejsca na plik.');
  }

  const path = reservation.data as string;
  try {
    const result = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
    if (result.error) throw result.error;
    const finished = await client.rpc('student_finish_upload', { object_path: path });
    if (finished.error) throw finished.error;
    return path;
  } catch (error) {
    const removed = await client.storage.from(STORAGE_BUCKET).remove([path]);
    if (!removed.error) await client.rpc('student_cancel_upload', { object_path: path });
    throw error;
  }
}