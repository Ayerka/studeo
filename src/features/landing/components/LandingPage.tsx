import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  Check,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckSquare,
  Layers,
  ScanText,
  Database,
  ShieldCheck,
  Brain,
  Download,
  Mail,
  ChevronDown,
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
  onExploreCourse: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onRegister,
  onExploreCourse,
}) => {
  const [heroTab, setHeroTab] = useState<'pdf' | 'source' | 'flashcard'>('source');

  const faqItems = [
    [
      'Czym właściwie jest Studeo?',
      'To polska aplikacja do kompleksowej organizacji studiów i nauki z własnych materiałów. Łączy w jednym miejscu przedmioty, pliki z wykładów, interaktywne kursy, fiszki z algorytmem powtórek (SRS), zadania cykliczne oraz kalendarz z tygodniami A/B.',
    ],
    [
      'Czym Studeo różni się od notatnika albo aplikacji do fiszek?',
      'Łączy w jednym miejscu notatki, kalendarz, zadania i fiszki, a lekcje i pytania generuje bezpośrednio z Twoich materiałów, wskazując dokładny fragment źródła. Nie musisz niczego ręcznie przepisywać ani konfigurować od zera.',
    ],
    [
      'Czy naprawdę mogę korzystać bezpłatnie?',
      'Tak. W Otwartej Becie każde konto otrzymuje pełny pakiet Premium: 20 GB na pliki i 100 użyć AI dziennie. Nie wymagamy podawania karty.',
    ],
    [
      'Jakie materiały mogę dodać?',
      'Możesz wgrać PDF, TXT, MD albo wkleić notatki. Prezentacje PowerPoint wystarczy wyeksportować do formatu PDF. Limit rozmiaru to 20 MB.',
    ],
    [
      'Czy Studeo odczyta zeskanowany PDF?',
      'Tak, aplikacja posiada wbudowany moduł OCR odczytujący tekst ze skanów i zdjęć z tablicy, który możesz przejrzeć i skorygować przed wygenerowaniem kursu.',
    ],
    [
      'Kto widzi moje materiały?',
      'Twoje pliki i postępy są przypisane do Twojego prywatnego konta i zabezpieczone. Dane przesyłane do modeli AI przetwarzane są wyłącznie w celu realizacji Twoich zapytań.',
    ],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Pasek nawigacyjny */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2 font-extrabold text-xl tracking-tight text-primary">
            <span className="text-2xl leading-none">✦</span>
            <span>studeo</span>
            <Badge variant="secondary" className="text-[10px] tracking-wider px-1.5 py-0.5">
              BETA
            </Badge>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#advantages" className="hover:text-foreground transition-colors">Przewagi</a>
            <a href="#how" className="hover:text-foreground transition-colors">Jak to działa</a>
            <a href="#plans" className="hover:text-foreground transition-colors">Plany</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <button
              type="button"
              onClick={onExploreCourse}
              className="text-primary font-semibold hover:underline flex items-center gap-1"
            >
              Demo kursu ✦
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onLogin}>
              Zaloguj się
            </Button>
            <Button size="sm" onClick={onRegister} className="shadow-sm">
              Dołącz bezpłatnie
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {/* Sekcja Hero */}
        <section id="top" className="py-16 md:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              TWÓJ INTELIGENTNY ASYSTENT SESJI
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Zamiast zarywać noce przed sesją.<br />
              <span className="text-primary italic font-serif font-normal">Wrzucasz slajdy — Studeo robi resztę.</span>
            </h1>

            <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
              Koniec z ręcznym przepisywaniem definicji do fiszek i chaosem w czterech aplikacjach. 
              Jeden kokpit: notatki, fiszki SRS i pytania testowe przygotowane bezpośrednio z Twojego wykładu.
            </p>

            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card">
                <Check className="size-3.5 text-primary" /> Bez ręcznego klepania fiszek
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card">
                <Check className="size-3.5 text-primary" /> Wskazuje stronę i cytat
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card">
                <Check className="size-3.5 text-primary" /> 0 zł w Otwartej Becie
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button size="lg" onClick={onRegister} className="gap-2 shadow-md">
                Zacznij bezpłatnie <ArrowRight className="size-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={onExploreCourse}>
                Zobacz kurs demo →
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Otwarta Beta dla każdego · 0 zł · Bez karty płatniczej · 20 GB i 100 operacji AI dziennie
            </p>
          </div>

          {/* Interaktywny podgląd aplikacji w Hero */}
          <div className="lg:col-span-5">
            <Card className="shadow-2xl border-primary/20 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-400/80 inline-block" />
                  <span className="size-2.5 rounded-full bg-amber-400/80 inline-block" />
                  <span className="size-2.5 rounded-full bg-emerald-400/80 inline-block" />
                </div>
                <span className="font-medium text-[11px]">Twoja przestrzeń nauki</span>
                <span className="text-primary font-bold">✦</span>
              </div>

              <div className="p-4 bg-muted/20 border-b flex gap-1">
                {(['pdf', 'source', 'flashcard'] as const).map((tab, i) => (
                  <Button
                    key={tab}
                    variant={heroTab === tab ? 'default' : 'ghost'}
                    size="xs"
                    className="flex-1 text-xs"
                    onClick={() => setHeroTab(tab)}
                  >
                    {i + 1}. {tab === 'pdf' ? 'Wgrany PDF' : tab === 'source' ? 'AI ze źródłem' : 'Fiszka SRS'}
                  </Button>
                ))}
              </div>

              <div className="p-5 space-y-4">
                {heroTab === 'pdf' && (
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-[10px]">MATERIAŁ ŹRÓDŁOWY</Badge>
                    <h3 className="font-semibold text-base leading-tight">Wyklad_03_Zarzadzanie.pdf</h3>
                    <p className="text-xs text-muted-foreground">Strona 4 z 28 · Odczyt OCR ukończony</p>
                    <div className="p-3 rounded-lg border bg-muted/30 text-xs italic text-foreground/80 leading-relaxed">
                      „...Kluczowym elementem w komunikacji masowej jest precyzyjne określenie <strong>grupy docelowej</strong>...”
                    </div>
                    <p className="text-xs font-medium text-primary">
                      ⚡ Studeo wykryło 6 kluczowych definicji i utworzyło pytania sprawdzające.
                    </p>
                  </div>
                )}

                {heroTab === 'source' && (
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-[10px]">GENEROWANE Z WYKŁADU</Badge>
                    <h3 className="font-semibold text-base leading-tight">Marketing w mediach</h3>
                    <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                      <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">
                        ŹRÓDŁO: PDF · STRONA 4
                      </Badge>
                      <h4 className="font-bold text-sm">Jak komunikat trafia do odbiorcy?</h4>
                      <p className="text-xs text-muted-foreground">Zweryfikuj z cytatem wykładowcy ↗</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 border rounded-lg bg-card"><b>6</b> lekcji</div>
                      <div className="p-2 border rounded-lg bg-card"><b>24</b> fiszki</div>
                      <div className="p-2 border rounded-lg bg-card"><b>Test</b> wiedzy</div>
                    </div>
                  </div>
                )}

                {heroTab === 'flashcard' && (
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-[10px]">POWTÓRKA SRS</Badge>
                    <div className="p-4 rounded-xl border bg-card shadow-sm space-y-2">
                      <span className="text-[10px] font-bold text-primary">PYTANIE</span>
                      <h4 className="font-semibold text-sm">Czym jest grupa docelowa?</h4>
                      <div className="pt-2 border-t border-dashed text-xs text-foreground/90 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-600 block">ODPOWIEDŹ ZE ŹRÓDŁA:</span>
                        <p>Zbiór osób, do których kierowany jest przekaz.</p>
                        <span className="text-[10px] text-muted-foreground block">Źródło: Wykład 3, s. 4</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium">
                      <span className="p-1.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Dziś</span>
                      <span className="p-1.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Za 2 dni</span>
                      <span className="p-1.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Za 5 dni</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </section>

        {/* Pasek modułów */}
        <div className="py-6 border-y flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-muted-foreground">
          <span className="uppercase tracking-wider text-foreground">Wszystko w jednym miejscu:</span>
          <span className="inline-flex items-center gap-1.5 text-foreground"><BookOpen className="size-4 text-primary" /> Notatki</span>
          <span>✦</span>
          <span className="inline-flex items-center gap-1.5 text-foreground"><Calendar className="size-4 text-primary" /> Kalendarz A/B</span>
          <span>✦</span>
          <span className="inline-flex items-center gap-1.5 text-foreground"><CheckSquare className="size-4 text-primary" /> Zadania</span>
          <span>✦</span>
          <span className="inline-flex items-center gap-1.5 text-foreground"><Layers className="size-4 text-primary" /> Fiszki SRS</span>
          <span>✦</span>
          <span className="inline-flex items-center gap-1.5 text-foreground"><ScanText className="size-4 text-primary" /> OCR skanów</span>
          <span>✦</span>
          <span className="inline-flex items-center gap-1.5 text-foreground"><Database className="size-4 text-primary" /> Baza ze źródłem</span>
        </div>

        {/* Przewagi */}
        <section id="advantages" className="py-20 space-y-12">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline">DLACZEGO STUDEO</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Mniej przełączania.<br />Więcej rozumienia.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Zastąp 4 różne narzędzia jednym spójnym środowiskiem dopasowanym do polskich uczelni.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <Brain className="size-8 text-primary mb-2" />
                <CardTitle className="text-lg">AI ze źródłem, nie z internetu</CardTitle>
                <CardDescription>
                  Lekcje i pytania powstają wyłącznie z Twoich slajdów. Każda definicja wskazuje dokładną stronę i cytat.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Layers className="size-8 text-primary mb-2" />
                <CardTitle className="text-lg">Spaced Repetition (SRS)</CardTitle>
                <CardDescription>
                  Algorytm planuje powtórki fiszek tuż przed momentem, w którym mózg zaczyna zapominać materiał.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <ScanText className="size-8 text-primary mb-2" />
                <CardTitle className="text-lg">OCR skanów i slajdów</CardTitle>
                <CardDescription>
                  Wbudowany silnik odczytuje tekst ze skanów PDF i zdjęć notatek, zamieniając je w interaktywne lekcje.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Cennik Otwartej Bety */}
        <section id="plans" className="py-20 space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline">JASNE ZASADY</Badge>
            <h2 className="text-3xl font-extrabold tracking-tight">Teraz testujesz. Za Premium nie płacisz.</h2>
            <p className="text-muted-foreground text-sm">
              W czasie Otwartej Bety każde konto otrzymuje bezpłatny dostęp do pakietu Premium.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto items-stretch">
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <Badge variant="outline" className="w-fit">DOCELOWY PO BECIE</Badge>
                <CardTitle className="text-xl">Basic</CardTitle>
                <div className="text-3xl font-extrabold pt-2">5 GB</div>
                <CardDescription>Miejsce na Twoje pliki dydaktyczne</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> 5 operacji AI dziennie</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> Przedmioty, lekcje i testy</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> Kalendarz A/B i zadania</div>
              </CardContent>
            </Card>

            <Card className="border-primary shadow-xl bg-primary/5 flex flex-col justify-between relative">
              <div className="absolute -top-3 right-4">
                <Badge className="bg-primary text-primary-foreground font-bold">0 ZŁ W BECIE</Badge>
              </div>
              <CardHeader>
                <Badge variant="outline" className="w-fit text-primary border-primary">DLA KAŻDEGO TERAZ</Badge>
                <CardTitle className="text-xl">Premium (Beta)</CardTitle>
                <div className="text-3xl font-extrabold text-primary pt-2">0 zł</div>
                <CardDescription>Pełen dostęp w okresie testowym</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 font-semibold"><Check className="size-4 text-primary" /> 20 GB miejsca na pliki</div>
                <div className="flex items-center gap-2 font-semibold"><Check className="size-4 text-primary" /> 100 operacji AI dziennie</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> OCR skanów i zdjęć</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> Bez karty płatniczej</div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full shadow-md" size="lg" onClick={onRegister}>
                  Dołącz do Otwartej Bety ↗
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 border-t space-y-10">
          <div className="max-w-xl space-y-2">
            <Badge variant="outline">FAQ</Badge>
            <h2 className="text-3xl font-extrabold tracking-tight">Często zadawane pytania</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {faqItems.map(([question, answer], idx) => (
              <Card key={idx} className="bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-bold leading-snug">{question}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {answer}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Baner końcowy CTA */}
        <section className="my-16 p-10 sm:p-14 rounded-3xl bg-primary text-primary-foreground text-center space-y-6 shadow-xl">
          <span className="text-3xl block">✦</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Całe studia w jednym miejscu.<br />Zacznij od następnego wykładu.
          </h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto text-sm sm:text-base">
            Otwarta Beta Premium dla każdego studenta. Bez opłat, bez karty płatniczej. Gotowe w 10 sekund.
          </p>
          <Button size="lg" variant="secondary" onClick={onRegister} className="font-bold shadow-md">
            Załóż bezpłatne konto ↗
          </Button>
        </section>
      </main>

      {/* Stopka */}
      <footer className="border-t py-12 text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <span>✦ studeo</span>
            <span className="font-normal text-muted-foreground">· wersja beta</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href="#advantages" className="hover:underline">Przewagi</a>
            <a href="#plans" className="hover:underline">Cennik</a>
            <a href="#faq" className="hover:underline">FAQ</a>
            <a href="mailto:kontakt@studeo.app" className="hover:underline">Kontakt</a>
          </div>
          <Button variant="outline" size="sm" onClick={onLogin}>
            Zaloguj się
          </Button>
        </div>
      </footer>
    </div>
  );
};