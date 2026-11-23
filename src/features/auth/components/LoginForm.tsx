
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface LoginFormProps {
  onSuccess: () => void;
}

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    if (!supabase) {
      setErrorMsg('Brak konfiguracji Supabase.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg('Nieprawidłowy e-mail lub hasło.');
        return;
      }

      onSuccess();
    } catch {
      setErrorMsg('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit}
      aria-label="Formularz logowania"
    >
      {errorMsg && (
        <p
          className="text-sm font-medium text-destructive"
          role="alert"
        >
          {errorMsg}
        </p>
      )}

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground/80"
          htmlFor="loginEmail"
        >
          E-mail
        </label>

        <Input
          id="loginEmail"
          type="email"
          placeholder="twoj.email@student.pl"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground/80"
          htmlFor="loginPassword"
        >
          Hasło
        </label>

        <Input
          id="loginPassword"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Logowanie…' : 'Zaloguj się'}
      </Button>
    </form>
  );
};
