import type { User } from '@supabase/supabase-js';
import type { AccountPlan } from '@/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  RefreshCw,
  Sparkles,
  User as UserIcon,
  LogOut,
} from 'lucide-react';

import type { StudentView } from '../../types';

interface StudentPortalHeaderProps {
  user: User;
  plan: AccountPlan;
  onNavigate: (view: StudentView) => void;
  onRefresh: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const StudentPortalHeader = ({
  user,
  plan,
  onNavigate,
  onRefresh,
  onOpenProfile,
  onLogout,
}: StudentPortalHeaderProps) => {
  const planLabel =
    plan.key === 'unknown'
      ? 'Plan niedostępny'
      : plan.key === 'free'
        ? 'Basic · Zobacz Premium'
        : '✦ Masz Premium';

  return (
    <header className="border-b bg-card sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo i nazwa aplikacji */}
        <button
          onClick={() => onNavigate('home')}
          type="button"
          className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity"
        >
          <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
            ✦
          </div>

          <div>
            <div className="flex items-center gap-2 leading-none">
              <span className="font-extrabold text-base tracking-tight text-foreground">
                Studeo
              </span>

              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 font-semibold"
              >
                BETA
              </Badge>
            </div>

            <span className="text-[11px] text-muted-foreground block truncate max-w-[200px] sm:max-w-[280px] mt-0.5 font-normal">
              {user.email || 'Twoja prywatna przestrzeń nauki'}
            </span>
          </div>
        </button>

        {/* Akcje użytkownika */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Odśwież dane"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Odśwież</span>
          </Button>

          <Button
            variant={plan.key === 'free' ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => onNavigate('plan')}
            className="gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="size-3.5 text-primary" />

            <span className="hidden md:inline">
              {planLabel}
            </span>

            <span className="md:hidden">Plan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenProfile}
            className="gap-1.5 text-xs"
          >
            <UserIcon className="size-3.5" />
            <span>Profil</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Wyloguj się"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Wyloguj</span>
          </Button>

        </div>
      </div>
    </header>
  );
};