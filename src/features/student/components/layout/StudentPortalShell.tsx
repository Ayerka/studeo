import type { User } from '@supabase/supabase-js';
import type { AccountPlan } from '@/types';

import { StudentPortalHeader } from './StudentPortalHeader';
import { StudentPortalNavigation } from './StudentPortalNavigation';
import { StudentPortalStatus } from './StudentPortalStatus';

import type { StudentView } from '../../types';

interface StudentPortalShellProps {
  user: User;
  plan: AccountPlan;
  view: StudentView;
  status: string;
  onNavigate: (view: StudentView) => void;
  onRefresh: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const StudentPortalShell = ({
  user,
  plan,
  view,
  status,
  onNavigate,
  onRefresh,
  onOpenProfile,
  onLogout,
  children,
}: StudentPortalShellProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <StudentPortalHeader
        user={user}
        plan={plan}
        onNavigate={onNavigate}
        onRefresh={onRefresh}
        onOpenProfile={onOpenProfile}
        onLogout={onLogout}
      />

      <StudentPortalNavigation
        view={view}
        onNavigate={onNavigate}
      />

      <StudentPortalStatus status={status} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {children}
      </main>
    </div>
  );
};