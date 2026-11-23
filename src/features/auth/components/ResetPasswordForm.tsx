
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

export const ResetPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setMessage('');
    setIsError(false);

    if (!supabase) {
      setMessage('Brak konfiguracji Supabase.');
      setIsError(true);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/?recovery=1`,
        }
      );

      if (error) {
        throw error;
      }

      setMessage(
        'Jeśli konto istnieje, wysłaliśmy wiadomość z linkiem do resetowania hasła.'
      );
    } catch {
      setMessage('Nie udało się wysłać linku. Spróbuj ponownie.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <p
          className={`text-sm font-medium ${
            isError ? 'text-destructive' : 'text-emerald-600'
          }`}
          role={isError ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground/80"
          htmlFor="resetEmail"
        >
          E-mail
        </label>

        <Input
          id="resetEmail"
          type="email"
          placeholder="twoj.email@student.pl"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Wysyłanie linku…' : 'Wyślij link'}
      </Button>
    </form>
  );
};
