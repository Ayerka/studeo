import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '../AuthContext';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'login' | 'register' | 'profile';
  onSuccess: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

const titles: Record<AuthMode, string> = {
  login: 'Dobrze Cię widzieć',
  register: 'Zacznij swoją naukę',
  reset: 'Odzyskaj dostęp',
};

const descriptions: Record<AuthMode, string> = {
  login: 'Zaloguj się, aby zsynchronizować notatki, fiszki i postępy.',
  register: 'Utwórz bezpłatne konto w Otwartej Becie.',
  reset: 'Wpisz swój adres e-mail, a wyślemy Ci link do ustawienia nowego hasła.',
};

export const AuthModal = ({ open, onOpenChange, initialTab = 'login', onSuccess }: AuthModalProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialTab === 'register' ? 'register' : 'login');

  if (user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">✦ STUDEO · BETA</p>
          <DialogTitle className="text-2xl font-bold">{titles[mode]}</DialogTitle>
          <DialogDescription>{descriptions[mode]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {mode === 'login' && <LoginForm onSuccess={onSuccess} />}
          {mode === 'register' && <RegisterForm onSuccess={onSuccess} />}
          {mode === 'reset' && <ResetPasswordForm />}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Utwórz konto' : mode === 'register' ? 'Mam konto — zaloguj się' : 'Wróć do logowania'}
            </Button>
            {mode === 'login' && (
              <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setMode('reset')}>
                Nie pamiętam hasła
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
