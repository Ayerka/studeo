import { useEffect, useState } from 'react';
import { ArrowLeft, Check, LogOut, Moon, Palette, Sun, UserRound, Settings2, HardDrive } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AccountUsagePanel } from './AccountUsagePanel';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../AuthContext';

interface AccountPageProps {
  onBack: () => void;
  onLogout: () => void;
}

type AccountSection = 'account' | 'usage' | 'settings';
type ThemeMode = 'light' | 'dark' | 'system';
type ProfileSettings = {
  compactCards: boolean;
  smartReminders: boolean;
  quickActions: boolean;
  theme: ThemeMode;
};

const PROFILE_SETTINGS_KEY = 'studeo-profile-settings';
const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  compactCards: false,
  smartReminders: true,
  quickActions: true,
  theme: 'system',
};

const navigation: { id: AccountSection; label: string; icon: typeof UserRound }[] = [
  { id: 'account', label: 'Konto', icon: UserRound },
  { id: 'usage', label: 'Użycie i pliki', icon: HardDrive },
  { id: 'settings', label: 'Ustawienia', icon: Settings2 },
];

export function AccountPage({ onBack, onLogout }: AccountPageProps) {
  const { user } = useAuth();
  const [section, setSection] = useState<AccountSection>('account');
  const [displayName, setDisplayName] = useState(String(user?.user_metadata?.display_name || ''));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_PROFILE_SETTINGS;
    try {
      const saved = window.localStorage.getItem(PROFILE_SETTINGS_KEY);
      return saved ? { ...DEFAULT_PROFILE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_PROFILE_SETTINGS;
    } catch {
      return DEFAULT_PROFILE_SETTINGS;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const mode = settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme;
      document.documentElement.classList.toggle('dark', mode === 'dark');
      document.documentElement.style.colorScheme = mode;
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [settings.theme]);

  const saveDisplayName = async () => {
    if (!supabase || !displayName.trim()) return;
    setBusy(true);
    setStatus('');
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim().slice(0, 80) } });
    setStatus(error ? 'Nie udało się zapisać nazwy.' : 'Nazwa została zapisana.');
    setBusy(false);
  };

  const sendPasswordReset = async () => {
    if (!supabase || !user?.email) return;
    setBusy(true);
    setStatus('');
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/?recovery=1`,
    });
    setStatus(error ? 'Nie udało się wysłać linku. Spróbuj ponownie później.' : 'Wysłaliśmy link do zmiany hasła. Sprawdź pocztę i folder spam.');
    setBusy(false);
  };

  const toggleSetting = (key: keyof Omit<ProfileSettings, 'theme'>) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const sectionTitle = navigation.find((item) => item.id === section)?.label ?? 'Konto';

  return (
    <main className="fixed inset-0 z-[60] flex min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">✦</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Studeo</p>
            <p className="truncate text-sm font-semibold">Konto użytkownika</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft />
          <span>Wróć do aplikacji</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b bg-muted/20 p-3 sm:w-64 sm:border-b-0 sm:border-r sm:p-5">
          <div className="mb-3 px-2 pt-2 sm:mb-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Profil</p>
            <p className="mt-1 truncate text-sm font-semibold">{user?.email}</p>
          </div>
          <nav aria-label="Sekcje konta" className="flex gap-1 overflow-x-auto sm:block sm:space-y-1">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                aria-current={section === id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors sm:w-full sm:gap-3 ${section === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-2 border-t pt-2 sm:mt-auto sm:pt-4">
            <Button type="button" variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={onLogout}>
              <LogOut />
              Wyloguj się
            </Button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
            <div className="mb-7 border-b pb-5">
              <p className="text-sm text-muted-foreground">Ustawienia konta</p>
              <h1 className="mt-1 text-2xl font-semibold">{sectionTitle}</h1>
            </div>

            {section === 'account' && (
              <Card>
                <CardHeader>
                  <CardTitle>Dane konta</CardTitle>
                  <CardDescription>Zarządzaj danymi logowania i informacjami profilu.</CardDescription>
                </CardHeader>
                <CardContent className="max-w-2xl space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="account-display-name">Nazwa wyświetlana</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input id="account-display-name" value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} disabled={busy} />
                      <Button type="button" onClick={() => void saveDisplayName()} disabled={busy || !displayName.trim()}>Zapisz nazwę</Button>
                    </div>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3 text-sm">
                    <p className="text-muted-foreground">Adres e-mail</p>
                    <p className="mt-1 font-medium">{user?.email}</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => void sendPasswordReset()} disabled={busy}>Wyślij link do zmiany hasła</Button>
                  {status && <p className="text-sm text-muted-foreground" role="status">{status}</p>}
                </CardContent>
              </Card>
            )}

            {section === 'usage' && (
              <Card>
                <CardHeader>
                  <CardTitle>Plan i pliki</CardTitle>
                  <CardDescription>Wykorzystanie przestrzeni, limitu AI i zapisanych plików.</CardDescription>
                </CardHeader>
                <CardContent><AccountUsagePanel client={supabase} /></CardContent>
              </Card>
            )}

            {section === 'settings' && (
              <Card>
                <CardHeader>
                  <CardTitle>Wygląd i preferencje</CardTitle>
                  <CardDescription>Dopasuj wygląd aplikacji i sposób pracy.</CardDescription>
                </CardHeader>
                <CardContent className="max-w-3xl space-y-7">
                  <section className="space-y-3" aria-labelledby="account-theme-title">
                    <h2 id="account-theme-title" className="text-sm font-semibold">Motyw</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {([{ id: 'light', label: 'Jasny', icon: Sun }, { id: 'dark', label: 'Ciemny', icon: Moon }, { id: 'system', label: 'Systemowy', icon: Palette }] as const).map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSettings((current) => ({ ...current, theme: id }))}
                          aria-pressed={settings.theme === id}
                          className={`flex min-h-20 items-center justify-between gap-3 rounded-md border p-4 text-left transition-colors ${settings.theme === id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                        >
                          <span className="flex items-center gap-3"><Icon className="size-4" /><span className="text-sm font-medium">{label}</span></span>
                          {settings.theme === id && <Check className="size-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3" aria-labelledby="account-preferences-title">
                    <h2 id="account-preferences-title" className="text-sm font-semibold">Preferencje</h2>
                    {([
                      ['compactCards', 'Kompaktowe karty', 'Mniej treści na pulpicie.'],
                      ['smartReminders', 'Inteligentne przypomnienia', 'Podpowiedzi w sekcjach planowania.'],
                      ['quickActions', 'Szybkie akcje', 'Skróty do najczęściej używanych narzędzi.'],
                    ] as const).map(([key, label, description]) => (
                      <button key={key} type="button" className="flex w-full items-center justify-between gap-4 rounded-md border px-4 py-3 text-left hover:bg-muted/30" onClick={() => toggleSetting(key)} aria-pressed={settings[key]}>
                        <span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span>
                        <Badge variant={settings[key] ? 'default' : 'secondary'}>{settings[key] ? 'Włączone' : 'Wyłączone'}</Badge>
                      </button>
                    ))}
                  </section>
                  <Button type="button" variant="outline" onClick={() => setSettings(DEFAULT_PROFILE_SETTINGS)}>Przywróć ustawienia domyślne</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
