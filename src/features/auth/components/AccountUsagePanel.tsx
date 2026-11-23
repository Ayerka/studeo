import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import type { AccountUsageData, StudentEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { fileReferences, gb } from '@/features/student/lib/account-usage';

interface AccountUsagePanelProps {
  client: SupabaseClient | null;
}

function fileName(path: string, entries: StudentEntry[]) {
  const reference = fileReferences(entries, path)[0];
  const attachment = reference?.payload.attachments?.find((item) => item.path === path);
  return attachment?.name || reference?.payload.fileName || path.split('/').pop() || 'Plik';
}

export function AccountUsagePanel({ client }: AccountUsagePanelProps) {
  const [usage, setUsage] = useState<AccountUsageData | null>(null);
  const [entries, setEntries] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingPath, setWorkingPath] = useState('');
  const [status, setStatus] = useState('');
  const alive = useRef(false);

  const loadUsage = useCallback(async () => {
    if (!client) {
      setLoading(false);
      setStatus('Usługa konta nie jest skonfigurowana.');
      return;
    }
    setLoading(true);
    setStatus('');
    try {
      const [usageResult, entriesResult] = await Promise.all([
        client.rpc('student_account_usage'),
        client.from('student_entries').select('id,title,subject_id,payload,archived'),
      ]);
      if (usageResult.error) throw usageResult.error;
      if (entriesResult.error) throw entriesResult.error;
      if (!alive.current) return;
      setUsage(usageResult.data as AccountUsageData);
      setEntries((entriesResult.data || []) as StudentEntry[]);
    } catch {
      if (alive.current) {
        setUsage(null);
        setStatus('Nie udało się odczytać planu i plików. Odśwież widok profilu.');
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    alive.current = true;
    void loadUsage();
    return () => { alive.current = false; };
  }, [loadUsage]);

  const downloadFile = async (path: string) => {
    if (!client || workingPath) return;
    setWorkingPath(path);
    setStatus('');
    try {
      const { data, error } = await client.storage.from('student-private').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName(path, entries);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus('Pobieranie pliku rozpoczęte.');
    } catch {
      setStatus('Nie udało się pobrać pliku. Odśwież dane i spróbuj ponownie.');
    } finally {
      setWorkingPath('');
    }
  };

  const deleteFile = async (path: string) => {
    if (!client || workingPath) return;
    const name = fileName(path, entries);
    if (!window.confirm(`Trwale usunąć plik „${name}”? Zapisany tekst i opracowany kurs pozostaną na koncie.`)) return;
    setWorkingPath(path);
    setStatus('');
    try {
      const { error } = await client.storage.from('student-private').remove([path]);
      if (error) throw error;
      const detached = await client.rpc('student_detach_file', { object_path: path });
      await loadUsage();
      setStatus(detached.error
        ? 'Plik usunięto. Nie udało się odświeżyć jego powiązań; ponownie wczytaj dane.'
        : 'Plik usunięto. Zapisany tekst i opracowany kurs pozostały na koncie.');
    } catch {
      setStatus('Nie udało się usunąć pliku. Odśwież dane i spróbuj ponownie.');
    } finally {
      setWorkingPath('');
    }
  };

  const plan = usage?.plan;
  const storageLimit = plan?.limits.storage_bytes || 0;
  const aiLimit = plan?.limits.ai_per_day || 0;

  return <section className="space-y-5" aria-label="Plan i pliki konta">
    {loading && !usage ? <p className="text-sm text-muted-foreground" role="status">Wczytuję plan i pliki…</p> : null}
    {usage && plan && <>
      <div className="space-y-1 border-b pb-4">
        <h3 className="font-semibold">{plan.plan_name}</h3>
        <p className="text-sm text-muted-foreground">
          {plan.plan_key === 'free' ? 'Plan Basic' : 'Otwarta beta'}
        </p>
      </div>

      <section className="space-y-2" aria-labelledby="account-storage-title">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="account-storage-title" className="text-sm font-semibold">Miejsce na pliki</h3>
          <span className="text-sm tabular-nums">{gb(usage.storage_bytes)} / {gb(storageLimit)}</span>
        </div>
        <progress className="h-2 w-full accent-primary" aria-label="Wykorzystanie miejsca" max={Math.max(storageLimit, 1)} value={Math.min(usage.storage_bytes, storageLimit)} />
        <p className="text-xs text-muted-foreground">{usage.files.length} plików · limit {gb(plan.limits.file_bytes)} na plik</p>
        {(usage.reserved_bytes || 0) > 0 && <p className="text-xs text-muted-foreground">Rezerwacje przesyłania: {gb(usage.reserved_bytes)}.</p>}
      </section>

      <section className="space-y-1" aria-labelledby="account-ai-title">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="account-ai-title" className="text-sm font-semibold">Operacje AI dzisiaj</h3>
          <span className="text-sm tabular-nums">{usage.ai_used} / {aiLimit}</span>
        </div>
        <p className="text-xs text-muted-foreground">Odnowienie {new Date(usage.ai_resets_at).toLocaleString('pl-PL')}.</p>
      </section>

      <section className="space-y-2" aria-labelledby="account-files-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="account-files-title" className="text-sm font-semibold">Przesłane pliki</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => void loadUsage()} disabled={loading || Boolean(workingPath)} aria-label="Odśwież użycie konta">
            <RefreshCw className="size-4" />
          </Button>
        </div>
        {usage.files.length === 0 ? <p className="text-sm text-muted-foreground">Brak przesłanych plików.</p> :
          <ul className="max-h-56 divide-y overflow-y-auto border-y">
            {usage.files.map((file) => <li className="flex min-w-0 items-center gap-2 py-3" key={file.path}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={fileName(file.path, entries)}>{fileName(file.path, entries)}</p>
                <p className="text-xs text-muted-foreground">{gb(file.size)} · {new Date(file.created_at).toLocaleDateString('pl-PL')}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => void downloadFile(file.path)} disabled={Boolean(workingPath)} aria-label={`Pobierz ${fileName(file.path, entries)}`} title="Pobierz">
                <Download className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => void deleteFile(file.path)} disabled={Boolean(workingPath)} aria-label={`Usuń ${fileName(file.path, entries)}`} title="Usuń">
                <Trash2 className="size-4" />
              </Button>
            </li>)}
          </ul>}
      </section>
    </>}
    {status && <p className="text-sm text-muted-foreground" role="status">{status}</p>}
  </section>;
}