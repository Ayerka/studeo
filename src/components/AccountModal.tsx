import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../lib/supabase';
import { fileReferences, gb } from '../account-usage.js';
import type { StudentEntry, AccountUsageData } from '../types';
import '../account.css';

interface AccountModalProps {
  mode: 'login' | 'register' | 'reset' | 'change' | 'profile';
  user: User | null;
  entries: StudentEntry[];
  onClose: () => void;
  onOpenLanding: () => void;
  onAuthSuccess: (user: User) => void;
  onLogout: () => void;
  onImportProgress: (data: any) => void;
  onExportProgress: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  mode,
  user,
  entries,
  onClose,
  onOpenLanding,
  onAuthSuccess,
  onLogout,
  onImportProgress,
  onExportProgress,
}) => {
  const [currentMode, setCurrentMode] = useState(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(user?.user_metadata?.display_name || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<AccountUsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageStatus, setUsageStatus] = useState('');

  useEffect(() => {
    setCurrentMode(mode);
    if (user?.user_metadata?.display_name) {
      setName(user.user_metadata.display_name);
    }
  }, [mode, user]);

  const loadUsage = async () => {
    if (!supabase || !user) return;
    setUsageLoading(true);
    try {
      const { data, error } = await supabase.rpc('student_account_usage');
      if (error) throw error;
      setUsage(data);
    } catch {
      setUsage(null);
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    if (currentMode === 'profile' && user) {
      loadUsage();
    }
  }, [currentMode, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured || !supabase) {
      setMessage('Tryb podglądu (brak kluczy bazy Supabase w .env). Dane działają lokalnie.');
      return;
    }
    setLoading(true);
    setMessage('Chwileczkę…');

    try {
      if (currentMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setMessage('Zalogowano!');
          onAuthSuccess(data.user);
        }
      } else if (currentMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.user) {
          setMessage('Sprawdź pocztę — jeśli rejestracja wymaga potwierdzenia, znajdziesz tam link aktywacyjny.');
          onAuthSuccess(data.user);
        }
      } else if (currentMode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/?recovery=1',
        });
        if (error) throw error;
        setMessage('Jeśli konto istnieje, otrzymasz wiadomość z linkiem. Sprawdź też spam.');
      } else if (currentMode === 'profile') {
        const { error } = await supabase.auth.updateUser({
          data: { display_name: name },
        });
        if (error) throw error;
        setMessage('Imię zapisane.');
      } else if (currentMode === 'change') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setCurrentMode('login');
        setMessage('Hasło zmienione. Zaloguj się ponownie.');
      }
    } catch (err: any) {
      setMessage(
        err.status === 429
          ? 'Zbyt wiele prób. Poczekaj chwilę.'
          : err.message || 'Nie udało się wykonać operacji. Sprawdź dane i połączenie.'
      );
    } finally {
      setPassword('');
      setLoading(false);
    }
  };

  const handleDownloadFile = async (path: string, fileName: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.storage.from('student-private').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err: any) {
      alert('Błąd podczas pobierania pliku: ' + (err.message || 'błąd sieci'));
    }
  };

  const handleDeleteFile = async (path: string, fileName: string) => {
    if (!supabase) return;
    if (
      !confirm(
        `Trwale usunąć plik „${fileName}”? Nie będzie można go pobrać ani oglądać. Zapisany tekst i kurs pozostaną. Pobierz kopię przed usunięciem.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.storage.from('student-private').remove([path]);
      if (error) throw error;
      await supabase.rpc('student_detach_file', { object_path: path });
      setUsageStatus('Plik usunięty. Miejsce zostało zwolnione; tekst i kurs zachowane.');
      await loadUsage();
    } catch (err: any) {
      setUsageStatus('Nie udało się usunąć pliku: ' + err.message);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportProgress(json);
        setMessage('Postępy zaimportowane!');
      } catch {
        setMessage('Nieprawidłowy plik JSON.');
      }
    };
    reader.readAsText(file);
  };

  const isProfile = currentMode === 'profile';
  const isReset = currentMode === 'reset';
  const isChange = currentMode === 'change';
  const isRegister = currentMode === 'register';

  return (
    <section id="account" className="account" style={{ margin: '4vh auto' }}>
      {!isProfile && (
        <button
          className="ghost-btn"
          type="button"
          onClick={onOpenLanding}
          style={{ marginBottom: '16px' }}
        >
          ← O Studeo
        </button>
      )}

      <div className="brand">✦ STUDEO · BETA</div>
      <h1>
        {isProfile
          ? 'Twoja przestrzeń nauki'
          : isReset
          ? 'Odzyskaj dostęp'
          : isChange
          ? 'Ustaw nowe hasło'
          : isRegister
          ? 'Zacznij swoją naukę'
          : 'Dobrze Cię widzieć.'}
      </h1>
      <p>
        {isProfile
          ? 'Twoje postępy są przypisane do Twojego konta.'
          : 'Twoje studia w jednym miejscu: przedmioty, notatki, zadania i powtórki. Bezpłatne Premium w becie dla każdego, bez karty płatniczej.'}
      </p>

      {!isConfigured && (
        <div style={{ margin: '16px 0', padding: '12px', background: '#f5f0ff', borderRadius: '12px' }}>
          <p className="message" style={{ margin: 0 }}>
            Podgląd projektu bez bazy Supabase. Możesz oglądać kursy, tworzyć przedmioty i testować aplikację lokalnie!
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={onClose}
            style={{ marginTop: '12px' }}
          >
            Wejdź do aplikacji →
          </button>
        </div>
      )}

      {isConfigured && (
        <form id="accountForm" onSubmit={handleSubmit}>
          {isProfile && user && (
            <p>
              Zalogowana jako: <strong>{user.email}</strong>
            </p>
          )}

          {(isRegister || isProfile) && (
            <div>
              <label htmlFor="displayName">Jak mamy Cię nazywać?</label>
              <input
                id="displayName"
                name="name"
                autoComplete="nickname"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Twoje imię lub pseudonim"
              />
            </div>
          )}

          {!isProfile && !isChange && (
            <div>
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj.email@student.pl"
              />
            </div>
          )}

          {!isProfile && !isReset && (
            <div>
              <label htmlFor="password">
                Hasło{isRegister || isChange ? ' (minimum 12 znaków)' : ''}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegister || isChange ? 'new-password' : 'current-password'}
                required
                minLength={isRegister || isChange ? 12 : 1}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <button className="primary-btn" type="submit" disabled={loading}>
              {isProfile
                ? 'Zapisz imię'
                : isReset
                ? 'Wyślij link'
                : isChange
                ? 'Zapisz nowe hasło'
                : isRegister
                ? 'Utwórz konto'
                : 'Zaloguj się'}
            </button>
          </div>
        </form>
      )}

      {isProfile ? (
        <div style={{ marginTop: '20px' }}>
          <button className="ghost-btn" onClick={onClose} type="button">
            Wróć do nauki
          </button>
          <button className="ghost-btn" onClick={onLogout} type="button">
            Wyloguj się
          </button>
          <button
            className="ghost-btn"
            onClick={() => setCurrentMode('reset')}
            type="button"
          >
            Zmień hasło przez e-mail
          </button>

          <hr style={{ margin: '24px 0', border: '0', borderTop: '1px solid var(--line)' }} />

          <section id="accountUsage">
            {usageLoading && <p>Wczytuję plan i pliki…</p>}
            {usage && (
              <div>
                <h2>Mój plan: {usage.plan.plan_name}</h2>
                <p>
                  {usage.plan.plan_key === 'free'
                    ? 'Konto Basic.'
                    : 'Masz Premium. W becie korzystasz bez opłat.'}{' '}
                  Zakup subskrypcji będzie dostępny później.
                </p>
                <h3>Miejsce na pliki</h3>
                <p>
                  <strong>
                    {gb(usage.storage_bytes)} / {gb(usage.plan.limits.storage_bytes)}
                  </strong>{' '}
                  · {usage.files.length} plików
                </p>
                <progress
                  aria-label="Wykorzystanie miejsca"
                  max={usage.plan.limits.storage_bytes}
                  value={Math.min(usage.storage_bytes, usage.plan.limits.storage_bytes)}
                  style={{ width: '100%' }}
                />
                <p className="student-muted" style={{ fontSize: '12px' }}>
                  Archiwum także zajmuje miejsce. Przekroczenie limitu blokuje nowe pliki,
                  ale nie usuwa istniejących. Maksymalnie 20 MB na plik.
                </p>

                <h3>AI dzisiaj</h3>
                <p>
                  <strong>
                    {usage.ai_used} / {usage.plan.limits.ai_per_day}
                  </strong>{' '}
                  użyć · odnowienie {new Date(usage.ai_resets_at).toLocaleString('pl-PL')}.
                </p>
                <p className="student-muted" style={{ fontSize: '12px' }}>
                  Jedno opracowanie, odpowiedź asystenta lub strona OCR to jedno użycie.
                </p>

                <button type="button" className="ghost-btn" onClick={loadUsage}>
                  Odśwież zużycie
                </button>

                <h3 style={{ marginTop: '24px' }}>Przesłane pliki</h3>
                {usage.files.length === 0 ? (
                  <p>Nie przesłano jeszcze plików.</p>
                ) : (
                  usage.files.map((f, i) => {
                    const refs = fileReferences(entries, f.path);
                    const first = refs[0];
                    const attachment = first?.payload?.attachments?.find((a: any) => a.path === f.path);
                    const name =
                      attachment?.name ||
                      first?.payload?.fileName ||
                      f.path.split('/').pop() ||
                      'plik';

                    return (
                      <article key={i} className="account-file">
                        <strong>{name}</strong>
                        <p>
                          {gb(f.size)} · {new Date(f.created_at).toLocaleDateString('pl-PL')}
                        </p>
                        <p style={{ fontSize: '12px' }}>
                          {refs.length
                            ? refs
                                .map((r) => r.title + (r.archived ? ' (archiwum)' : ''))
                                .join(', ')
                            : 'Plik bez powiązanego wpisu'}
                        </p>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => handleDownloadFile(f.path, name)}
                        >
                          Pobierz
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => handleDeleteFile(f.path, name)}
                        >
                          Usuń plik
                        </button>
                      </article>
                    );
                  })
                )}
                {usageStatus && <p role="status" className="usage-status">{usageStatus}</p>}
              </div>
            )}
          </section>

          <hr style={{ margin: '24px 0', border: '0', borderTop: '1px solid var(--line)' }} />

          <h2>Przenieś stare postępy</h2>
          <p>
            W starej aplikacji kliknij „Eksportuj postępy”, a tutaj wybierz pobrany plik JSON.
            Import zastąpi postępy na tym koncie po potwierdzeniu.
          </p>
          <label htmlFor="importFile">Plik z postępami</label>
          <input
            id="importFile"
            type="file"
            accept="application/json,.json"
            onChange={handleImportFileChange}
          />
          <button className="ghost-btn" onClick={onExportProgress} type="button" style={{ marginTop: '8px' }}>
            Pobierz kopię danych (JSON)
          </button>
        </div>
      ) : !isChange ? (
        <div style={{ marginTop: '16px' }}>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => setCurrentMode(isRegister || isReset ? 'login' : 'register')}
          >
            {isRegister || isReset ? 'Mam konto — zaloguj się' : 'Utwórz konto'}
          </button>
          {!isReset && (
            <button
              className="ghost-btn"
              type="button"
              onClick={() => setCurrentMode('reset')}
            >
              Nie pamiętam hasła
            </button>
          )}
        </div>
      ) : (
        <div style={{ marginTop: '16px' }}>
          <button className="ghost-btn" onClick={onLogout} type="button">
            Wyloguj się
          </button>
        </div>
      )}

      {message && (
        <p id="accountMessage" className="message" role="status" style={{ marginTop: '14px' }}>
          {message}
        </p>
      )}

      <small style={{ marginTop: '20px', color: 'var(--muted)' }}>
        Hasła obsługuje Supabase Auth. Aplikacja nie zapisuje haseł lokalnie.
      </small>
    </section>
  );
};
