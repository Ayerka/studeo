import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

export const RegisterForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMessage('Brak konfiguracji Supabase.');
      setIsError(true);
      return;
    }
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name }, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMessage('Konto utworzone! Jeśli wymagane jest potwierdzenie, sprawdź e-mail.');
      setTimeout(onSuccess, 1500);
    } catch (err: any) {
      setMessage(err.message || 'Nie udało się zarejestrować.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {message && (
        <p className={`text-sm font-medium ${isError ? 'text-destructive' : 'text-emerald-600'}`}>
          {message}
        </p>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground/80" htmlFor="regName">Twoje imię</label>
        <Input
          id="regName"
          placeholder="Imię lub pseudonim"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground/80" htmlFor="regEmail">E-mail</label>
        <Input
          id="regEmail"
          type="email"
          placeholder="twoj.email@student.pl"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground/80" htmlFor="regPassword">Hasło (min. 12 znaków)</label>
        <Input
          id="regPassword"
          type="password"
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Tworzenie konta…' : 'Utwórz konto'}
      </Button>
    </form>
  );
};