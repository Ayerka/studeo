import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon } from 'lucide-react';

interface SyncRecoveryBannerProps {
  hasConflict: boolean;
  syncStatus: string;
  onDownloadBackup: () => void;
  onRetrySync: () => void;
  onReloadCloud: () => void;
}

export const SyncRecoveryBanner: React.FC<SyncRecoveryBannerProps> = ({
  hasConflict,
  syncStatus,
  onDownloadBackup,
  onRetrySync,
  onReloadCloud,
}) => {
  if (syncStatus !== 'Nie zapisano postępu' && syncStatus !== 'Konflikt zapisu na innym urządzeniu') {
    return null;
  }

  return (
    <div 
      role="alert" 
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 z-50 flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/80 dark:border-amber-800 text-amber-950 dark:text-amber-200 shadow-xl"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          {syncStatus === 'Nie zapisano postępu'
            ? 'Postęp nie został zsynchronizowany z chmurą.'
            : 'Wykryto nowsze postępy zapisane na innym urządzeniu.'}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={onDownloadBackup}>
          Kopia zmian (JSON)
        </Button>
        {syncStatus === 'Nie zapisano postępu' ? (
          <Button size="sm" onClick={onRetrySync}>
            Ponów zapis
          </Button>
        ) : (
          <Button variant="destructive" size="sm" onClick={onReloadCloud}>
            Wczytaj z chmury
          </Button>
        )}
      </div>
    </div>
  );
};