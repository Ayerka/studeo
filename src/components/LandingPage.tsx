import React, { useState } from 'react';
import '../landing.css';

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
      'To polska aplikacja do kompleksowej organizacji studiów i nauki z własnych materiałów. Łączy w jednym miejscu przedmioty, pliki z wykładów, interaktywne kursy, fiszki z algorytmem powtórek, zadania cykliczne oraz kalendarz z tygodniami A/B.',
    ],
    [
      'Czym Studeo różni się od notatnika albo aplikacji do fiszek?',
      'Łączy w jednym miejscu notatki, kalendarz, zadania i fiszki z powtórkami, a lekcje i pytania tworzy z Twoich materiałów, wskazując fragment źródła. Nie musisz niczego konfigurować od zera ani przepisywać między aplikacjami.',
    ],
    [
      'Czy naprawdę mogę korzystać bezpłatnie?',
      'Tak. Teraz trwa bezpłatna beta: każde konto ma Premium, 20 GB na pliki i 100 użyć AI dziennie. Nie podajesz karty. Płatności i ceny po becie nie są jeszcze uruchomione.',
    ],
    [
      'Jakie materiały mogę dodać?',
      'Do tworzenia kursu dodaj PDF, TXT, MD albo wklej notatki. Prezentację PowerPoint najpierw wyeksportuj do PDF. Limit pliku to 20 MB. PDF może mieć do 100 stron; odczyt obejmuje do 120 tys. znaków.',
    ],
    [
      'Czy Studeo odczyta zeskanowany PDF?',
      'Możesz uruchomić OCR, które odczyta tekst z obrazu strony. Działa partiami do 5 stron i można je wznawiać. Sprawdź wynik — niewyraźny tekst, tabele czy odręczne pismo mogą zostać odczytane błędnie. Każda strona wykorzystuje jedno użycie AI.',
    ],
    [
      'Czy kurs tworzy się od razu po wgraniu pliku?',
      'Ty decydujesz. Wybierz „Zapisz i utwórz kurs” lub tylko zapisz materiał i uruchom tworzenie później. Nowe materiały możesz opracować podczas aktualizacji kursu. Wcześniejsze wersje lekcji i wyniki pozostają zapisane.',
    ],
    [
      'Kto widzi moje materiały?',
      'Twoje przedmioty, pliki i postępy są przypisane do Twojego konta i nie są udostępniane innym użytkownikom. Gdy uruchamiasz funkcję AI, potrzebna do niej treść — a przy OCR obraz strony — jest przesyłana do OpenAI. Dodawaj materiały, do których masz prawo.',
    ],
    [
      'Czy mogę ufać każdej odpowiedzi AI?',
      'AI wspiera naukę, ale może popełniać błędy. Weryfikuj treść z materiałami i wskazówkami prowadzących. Studeo nie gwarantuje poprawności każdej odpowiedzi ani zdania egzaminu.',
    ],
    [
      'Co się stanie, gdy zabraknie mi miejsca lub użyć AI?',
      'Po wykorzystaniu dziennego limitu AI poczekaj na jego odnowienie. Gdy zabraknie miejsca, usuń niepotrzebne pliki w Profilu. Samo archiwizowanie nie zwalnia miejsca. Istniejące dane nie są automatycznie usuwane.',
    ],
    [
      'Czy mogę używać Studeo na telefonie i iPadzie?',
      'Tak, w przeglądarce. Zaloguj się na to samo konto, aby korzystać z zapisanych danych na różnych urządzeniach. Synchronizacja, przesyłanie plików i funkcje AI wymagają internetu.',
    ],
    [
      'Czy mogę pobrać lub usunąć swoje pliki?',
      'Tak. W Profilu zobaczysz wykorzystane miejsce, listę przesłanych plików oraz przyciski pobierania i usuwania. Usunięcie oryginalnego pliku jest trwałe; zapisany tekst, kurs i postępy pozostają. Możesz również wyeksportować dane tekstowe i postępy.',
    ],
  ];

  return (
    <div id="landing">
      <a className="lp-skip" href="#lp-main">
        Przejdź do treści
      </a>

      <header className="lp-nav lp-wrap">
        <a className="lp-logo" href="#lp-top" aria-label="Studeo — strona główna">
          <span>✦</span> studeo<span className="lp-beta">BETA</span>
        </a>
        <nav aria-label="Nawigacja strony">
          <a href="#lp-advantages">Przewagi</a>
          <a href="#lp-how">Jak to działa</a>
          <a href="#lp-compare">Porównanie</a>
          <a href="#lp-source">AI ze źródłem</a>
          <a href="#lp-plans">Plany</a>
          <a href="#lp-faq">FAQ</a>
          <a href="#lp-about">O nas</a>
          <a href="#lp-contact">Kontakt</a>
          <button
            type="button"
            className="lp-text-link"
            onClick={onExploreCourse}
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'var(--lp-purple)' }}
          >
            Kurs demo ✦
          </button>
        </nav>
        <button className="lp-login" onClick={onLogin} type="button">
          Zaloguj się <span aria-hidden="true">↗</span>
        </button>
      </header>

      <main id="lp-main">
        <section id="lp-top" className="lp-hero lp-wrap">
          <div className="lp-intro">
            <span className="lp-eyebrow">
              <i /> TWÓJ INTELIGENTNY ASYSTENT SESJI
            </span>
            <h1>
              Zamiast zarywać noce przed sesją.<br />
              <em>Wrzucasz slajdy — Studeo robi resztę.</em>
            </h1>
            <p>
              Koniec z ręcznym przepisywaniem definicji do fiszek i chaosem w 4 aplikacjach. Jeden inteligentny kokpit: notatki, fiszki z powtórkami SRS i pytania testowe przygotowane prosto z Twojego wykładu.
            </p>

            <div className="lp-hero-highlights">
              <div className="lp-hero-pill">
                <span>✓</span> Bez ręcznego klepania fiszek
              </div>
              <div className="lp-hero-pill">
                <span>✓</span> Nauka prosto z Twojego wykładu
              </div>
              <div className="lp-hero-pill">
                <span>✓</span> 0 zł w Otwartej Becie
              </div>
            </div>

            <div className="lp-cta-row">
              <button className="lp-primary" onClick={onRegister} type="button">
                Zacznij bezpłatnie <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                className="lp-text-link"
                onClick={onExploreCourse}
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
              >
                Obejrzyj kurs Od zera do hakera →
              </button>
            </div>
            <p className="lp-fine">
              Bezpłatna Otwarta Beta dla każdego · 0 zł · Bez karty płatniczej · 20 GB i 100 użyć AI dziennie
            </p>
          </div>

          <div
            className="lp-preview"
            aria-label="Przykładowy widok kursu — ilustracja funkcji"
          >
            <div className="lp-window">
              <span className="lp-window-dots">● ● ●</span>
              <span>Twoja inteligentna przestrzeń nauki</span>
              <span>✦</span>
            </div>

            <div style={{ padding: '12px 16px 0 16px' }}>
              <div className="lp-demo-toggle">
                <button
                  type="button"
                  className={`lp-demo-tab ${heroTab === 'pdf' ? 'active' : ''}`}
                  onClick={() => setHeroTab('pdf')}
                >
                  1. Wgrany PDF
                </button>
                <button
                  type="button"
                  className={`lp-demo-tab ${heroTab === 'source' ? 'active' : ''}`}
                  onClick={() => setHeroTab('source')}
                >
                  2. AI ze źródłem
                </button>
                <button
                  type="button"
                  className={`lp-demo-tab ${heroTab === 'flashcard' ? 'active' : ''}`}
                  onClick={() => setHeroTab('flashcard')}
                >
                  3. Fiszka SRS
                </button>
              </div>
            </div>

            <div className="lp-mock-body">
              <aside>
                <b>✦ studeo</b>
                <span>PRZESTRZEŃ</span>
                <div>⌂ Pulpit</div>
                <div className="lp-mock-active">▤ Moje kursy</div>
                <div>◇ Powtórki SRS</div>
                <div>☑ Zadania &amp; terminy</div>
                <div>▦ Kalendarz A/B</div>
                <small>Widok studenta</small>
              </aside>

              <div className="lp-mock-main">
                {heroTab === 'pdf' && (
                  <div>
                    <span className="lp-tag">MATERIAŁ ŹRÓDŁOWY</span>
                    <h2>Wyklad_03_Zarzadzanie.pdf</h2>
                    <p>Strona 4 z 28 · Odczyt OCR ukończony</p>
                    <div style={{ background: '#fff', border: '1px solid #e2dbed', borderRadius: '8px', padding: '12px', fontSize: '11px', lineHeight: 1.6, color: '#332b45', marginTop: '10px' }}>
                      <p style={{ margin: 0 }}>
                        „...Kluczowym elementem w komunikacji masowej jest precyzyjne określenie <strong>grupy docelowej</strong>. Grupa docelowa to zbiór osób, do których kierowany jest przekaz...”
                      </p>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '10px', color: '#7053db', fontWeight: 600 }}>
                      ⚡ Studeo wykryło 6 kluczowych definicji i utworzyło pytania sprawdzające.
                    </div>
                  </div>
                )}

                {heroTab === 'source' && (
                  <div>
                    <span className="lp-tag">GENEROWANE Z TWOJEGO WYKŁADU</span>
                    <h2>Marketing w mediach</h2>
                    <p>Opracowane z pliku: Wyklad_03.pdf · s. 1–28</p>
                    <div className="lp-mock-lesson">
                      <span className="lp-source-badge">ŹRÓDŁO: PDF · STRONA 4</span>
                      <h3>
                        Jak komunikat<br />
                        trafia do odbiorcy?
                      </h3>
                      <div className="lp-mock-open">
                        Zweryfikuj z cytatem wykładowcy <span>↗</span>
                      </div>
                    </div>
                    <div className="lp-mock-tiles">
                      <div>
                        <b>▤</b> 6 lekcji
                      </div>
                      <div>
                        <b>▱</b> 24 fiszki
                      </div>
                      <div>
                        <b>✓</b> Test wiedzy
                      </div>
                    </div>
                    <div className="lp-progress-label">
                      <span>Gotowość do kolokwium</span>
                      <b>72% opanowane</b>
                    </div>
                    <div className="lp-progress">
                      <span style={{ width: '72%' }} />
                    </div>
                  </div>
                )}

                {heroTab === 'flashcard' && (
                  <div>
                    <span className="lp-tag">INTELIGENTNE POWTÓRKI SRS</span>
                    <h2>Fiszka #14 ze źródłem</h2>
                    <p>Następna powtórka: jutro o 18:00</p>
                    <div style={{ background: '#fff', border: '1px solid #7053db33', borderRadius: '10px', padding: '16px', marginTop: '10px' }}>
                      <span style={{ fontSize: '9px', color: '#7053db', fontWeight: 700 }}>PYTANIE</span>
                      <h4 style={{ margin: '4px 0 8px 0', fontSize: '14px', color: '#252139' }}>Czym jest grupa docelowa?</h4>
                      <div style={{ borderTop: '1px dashed #e2dbed', paddingTop: '8px', marginTop: '8px' }}>
                        <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 700 }}>ODPOWIEDŹ ZE ŹRÓDŁA</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#4b455b' }}>
                          Zbiór odbiorców, do których kierowany jest dany komunikat.
                        </p>
                        <small style={{ display: 'block', marginTop: '4px', color: '#8c7da3', fontSize: '9px' }}>
                          Zweryfikowano z: Wyklad_03.pdf, strona 4
                        </small>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      <div style={{ flex: 1, padding: '6px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', textAlign: 'center', fontSize: '10px', fontWeight: 600 }}>Powtórz dziś</div>
                      <div style={{ flex: 1, padding: '6px', background: '#fef3c7', color: '#92400e', borderRadius: '6px', textAlign: 'center', fontSize: '10px', fontWeight: 600 }}>Za 2 dni</div>
                      <div style={{ flex: 1, padding: '6px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', textAlign: 'center', fontSize: '10px', fontWeight: 600 }}>Za 5 dni</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lp-sticky">
              <span>✦</span>
              <div>
                <b>Od PDF-a do „już wiem”.</b>
                <small>Koniec z ręcznym przepisywaniem notatek.</small>
              </div>
            </div>
          </div>
        </section>

        <div className="lp-strip">
          <div className="lp-wrap">
            <span>ZAMIAST CZTERECH APLIKACJI</span>
            <b>Notatki</b>
            <i>✦</i>
            <b>Kalendarz A/B</b>
            <i>✦</i>
            <b>Zadania cykliczne</b>
            <i>✦</i>
            <b>Fiszki SRS</b>
            <i>✦</i>
            <b>OCR skanów</b>
            <i>✦</i>
            <b>Baza ze źródłem</b>
          </div>
        </div>

        <section id="lp-advantages" className="lp-section lp-wrap">
          <div className="lp-section-head">
            <span className="lp-eyebrow">DLACZEGO STUDEO</span>
            <h2>
              Mniej przełączania.<br />
              Więcej rozumienia.
            </h2>
            <p>
              To, co odróżnia Studeo od zwykłego notatnika, kalendarza czy aplikacji do fiszek. Koniec z chaosem między wieloma narzędziami.
            </p>
          </div>
          <div className="lp-bento lp-adv">
            <article className="lp-feature lp-hl">
              <span className="lp-feature-icon">◈</span>
              <h3>Jedno miejsce zamiast czterech aplikacji</h3>
              <p>
                Notatki, plan zajęć, zadania i fiszki należą do tego samego przedmiotu. Od zadania przechodzisz jednym kliknięciem do nauki, bez kopiowania tekstu między różnymi programami.
              </p>
            </article>
            <article className="lp-feature lp-mint">
              <span className="lp-feature-icon">✓</span>
              <h3>Gotowe od pierwszego dnia</h3>
              <p>
                Dodajesz przedmiot i zaczynasz od razu. Bez budowania baz danych, szablonów i widoków, które w uniwersalnych narzędziach trzeba mozolnie konfigurować samemu.
              </p>
            </article>
            <article className="lp-feature lp-peach">
              <span className="lp-feature-icon">✦</span>
              <h3>AI z Twoich materiałów, nie z internetu</h3>
              <p>
                Lekcje, fiszki i pytania powstają z wgranego PDF-a, tekstu lub notatek i wskazują fragment źródła: stronę i tekst, który możesz natychmiast sprawdzić przed profesorem.
              </p>
            </article>
            <article className="lp-feature">
              <span className="lp-feature-icon">▱</span>
              <h3>Powtórki we właściwym momencie</h3>
              <p>
                Fiszki wracają w odstępach zależnych od tego, jak Ci poszło (algorytm Spaced Repetition). Zadania cykliczne same przesuwają termin po wykonaniu, pilnując rytmu semestru.
              </p>
            </article>
            <article className="lp-feature lp-mint">
              <span className="lp-feature-icon">▦</span>
              <h3>Po polsku, po studencku</h3>
              <p>
                Przedmioty, zajęcia powtarzające się co tydzień, tygodnie parzyste/nieparzyste i zadania z terminami. Interfejs i opracowania AI w języku polskim, stworzone pod polskie uczelnie.
              </p>
            </article>
            <article className="lp-feature lp-hl">
              <span className="lp-feature-icon">▤</span>
              <h3>Skany też się liczą</h3>
              <p>
                Zeskanowany PDF lub zdjęcie z tablicy odczytasz wbudowaną funkcją OCR i poprawisz tekst, zanim powstanie kurs. Możesz też oglądać podgląd oryginalnego PDF obok lekcji.
              </p>
            </article>
          </div>
          <p className="lp-more">
            <a className="lp-text-link" href="#lp-compare">
              Zobacz szczegółowe porównanie rodzajów narzędzi ↓
            </a>
          </p>
        </section>

        <section id="lp-how" className="lp-section lp-wrap">
          <div className="lp-section-head">
            <span className="lp-eyebrow">OD CHAOSU DO PLANU</span>
            <h2>
              Ty dodajesz materiały.<br />
              Studeo pomaga je poukładać.
            </h2>
            <p>
              Nie musisz zaczynać od pustej kartki. Zacznij od tego, co już masz z zajęć.
            </p>
          </div>
          <div className="lp-steps">
            <article>
              <span className="lp-number">01</span>
              <h3>Dodaj przedmiot i materiały</h3>
              <p>
                Wgraj PDF albo plik tekstowy, wklej notatki lub nagraj notatkę głosową. Masz skan? Odczytaj go funkcją OCR i sprawdź wynik w kilka sekund.
              </p>
            </article>
            <article>
              <span className="lp-number">02</span>
              <h3>Utwórz kurs ze źródłem</h3>
              <p>
                Studeo przygotowuje lekcje, fiszki i pytania. Każdy element wskazuje fragment Twojego materiału, do którego możesz wrócić i zweryfikować treść.
              </p>
            </article>
            <article>
              <span className="lp-number">03</span>
              <h3>Ucz się we właściwym czasie</h3>
              <p>
                Powtórki, zadania i kalendarz masz w tym samym miejscu. Dodasz kolejny wykład? Zaktualizuj kurs, a Twoje wyniki zostaną zapisane bez utraty postępów.
              </p>
            </article>
          </div>
        </section>

        <section id="lp-compare" className="lp-section lp-wrap">
          <div className="lp-section-head">
            <span className="lp-eyebrow">PORÓWNANIE ROZWIĄZAŃ</span>
            <h2>
              Każde narzędzie robi coś dobrze.<br />
              Studeo łączy to, czego uczysz się na co dzień.
            </h2>
            <p>
              Ogólne porównanie rodzajów narzędzi, z których studenci zwykle korzystają. Konkretne aplikacje różnią się możliwościami.
            </p>
          </div>
          <div
            className="lp-table-wrap"
            role="region"
            aria-label="Porównanie rodzajów narzędzi"
            tabIndex={0}
          >
            <table className="lp-compare">
              <caption className="lp-sr">
                Porównanie Studeo z innymi rodzajami narzędzi do nauki i organizacji
              </caption>
              <thead>
                <tr>
                  <th scope="col">Czego potrzebujesz</th>
                  <th scope="col">Uniwersalny notatnik lub baza</th>
                  <th scope="col">Kalendarz i lista zadań</th>
                  <th scope="col">Aplikacja do fiszek</th>
                  <th scope="col">System uczelni</th>
                  <th scope="col" className="lp-us">
                    Studeo
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Notatki i materiały</th>
                  <td data-label="Uniwersalny notatnik lub baza">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                  <td data-label="Kalendarz i lista zadań">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td data-label="Aplikacja do fiszek">
                    <span className="lp-half" aria-hidden="true" />
                    <span className="lp-sr">
                      zależy od narzędzia lub wymaga własnej konfiguracji
                    </span>
                  </td>
                  <td data-label="System uczelni">
                    <span className="lp-half" aria-hidden="true" />
                    <span className="lp-sr">
                      zależy od narzędzia lub wymaga własnej konfiguracji
                    </span>
                  </td>
                  <td className="lp-us" data-label="Studeo">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Kalendarz zajęć i terminy</th>
                  <td data-label="Uniwersalny notatnik lub baza">
                    <span className="lp-half" aria-hidden="true" />
                    <span className="lp-sr">
                      zależy od narzędzia lub wymaga własnej konfiguracji
                    </span>
                  </td>
                  <td data-label="Kalendarz i lista zadań">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                  <td data-label="Aplikacja do fiszek">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td data-label="System uczelni">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                  <td className="lp-us" data-label="Studeo">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Zadania, także cykliczne</th>
                  <td data-label="Uniwersalny notatnik lub baza">
                    <span className="lp-half" aria-hidden="true" />
                    <span className="lp-sr">
                      zależy od narzędzia lub wymaga własnej konfiguracji
                    </span>
                  </td>
                  <td data-label="Kalendarz i lista zadań">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                  <td data-label="Aplikacja do fiszek">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td data-label="System uczelni">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td className="lp-us" data-label="Studeo">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Fiszki z powtórkami w odstępach</th>
                  <td data-label="Uniwersalny notatnik lub baza">
                    <span className="lp-half" aria-hidden="true" />
                    <span className="lp-sr">
                      zależy od narzędzia lub wymaga własnej konfiguracji
                    </span>
                  </td>
                  <td data-label="Kalendarz i lista zadań">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td data-label="Aplikacja do fiszek">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                  <td data-label="System uczelni">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td className="lp-us" data-label="Studeo">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Lekcje i pytania z Twojego PDF-a, ze wskazaniem źródła</th>
                  <td data-label="Uniwersalny notatnik lub baza">
                    <span className="lp-half" aria-hidden="true" />
                    <span className="lp-sr">
                      zależy od narzędzia lub wymaga własnej konfiguracji
                    </span>
                  </td>
                  <td data-label="Kalendarz i lista zadań">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td data-label="Aplikacja do fiszek">
                    <span className="lp-half" aria-hidden="true" />
                    <span className="lp-sr">
                      zależy od narzędzia lub wymaga własnej konfiguracji
                    </span>
                  </td>
                  <td data-label="System uczelni">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td className="lp-us" data-label="Studeo">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Gotowe bez konfigurowania</th>
                  <td data-label="Uniwersalny notatnik lub baza">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td data-label="Kalendarz i lista zadań">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                  <td data-label="Aplikacja do fiszek">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                  <td data-label="System uczelni">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                  <td className="lp-us" data-label="Studeo">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Wszystko w jednym miejscu</th>
                  <td data-label="Uniwersalny notatnik lub baza">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td data-label="Kalendarz i lista zadań">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td data-label="Aplikacja do fiszek">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td data-label="System uczelni">
                    <span aria-hidden="true">—</span>
                    <span className="lp-sr">zwykle poza zakresem</span>
                  </td>
                  <td className="lp-us" data-label="Studeo">
                    <span aria-hidden="true">✓</span>
                    <span className="lp-sr">wbudowane</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="lp-legend">
            <span aria-hidden="true">✓</span> wbudowane · <span className="lp-half" aria-hidden="true" /> zależy od narzędzia lub wymaga własnej konfiguracji · <span aria-hidden="true">—</span> zwykle poza zakresem
          </p>
        </section>

        <section className="lp-why" id="lp-source">
          <div className="lp-wrap lp-why-grid">
            <div>
              <span className="lp-eyebrow">AI ZE ŹRÓDŁEM</span>
              <h2>
                Nie „AI wie lepiej”.<br />
                <em>AI pokazuje, skąd to wzięło.</em>
              </h2>
              <p>
                Koniec z obawą przed zmyślonymi faktami na egzaminie. Studeo nie generuje losowej wiedzy z internetu — każde pytanie i fiszka opiera się w 100% na Twoim materiale.
              </p>
              <div
                className="lp-cite"
                aria-label="Przykładowa fiszka ze wskazanym źródłem — ilustracja"
              >
                <span className="lp-tag">PRZYKŁADOWY WIDOK</span>
                <p className="lp-cite-q">Czym jest grupa docelowa?</p>
                <p className="lp-cite-a">
                  Grupa osób, do których kierujesz komunikat.
                </p>
                <p className="lp-cite-src">
                  <b>Źródło:</b> Twój PDF · s. 4{' '}
                  <q>Grupa docelowa to osoby, do których kierujemy przekaz.</q>
                </p>
              </div>
            </div>
            <div className="lp-reasons">
              <article>
                <span>01</span>
                <div>
                  <h3>Punktem wyjścia jest Twój wykład</h3>
                  <p>
                    Uczysz się z opracowania materiałów, które sam dodasz. Możesz w każdej chwili oglądać oryginalny PDF i jego odczytany tekst obok fiszki.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Każdy element ma odwołanie</h3>
                  <p>
                    Lekcje, fiszki i pytania testowe wskazują dokładną stronę i cytat ze źródła, więc natychmiast zweryfikujesz każdą definicję.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Ty zachowujesz kontrolę</h3>
                  <p>
                    Samodzielnie decydujesz, kiedy uruchomić opracowanie. AI może się pomylić — dlatego Studeo zawsze daje Ci dostęp do źródła i pozwala poprawić odczyt.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="lp-privacy" className="lp-section lp-wrap">
          <div className="lp-section-head">
            <span className="lp-eyebrow">BEZPIECZEŃSTWO I DANE</span>
            <h2>Twoje materiały zostają Twoje.</h2>
            <p>
              Uczciwe zasady: pełna prywatność notatek, brak reklam i transparentność operacji AI.
            </p>
          </div>
          <div className="lp-trust">
            <article className="lp-feature">
              <span className="lp-feature-icon">◈</span>
              <h3>Tylko dla Ciebie</h3>
              <p>
                Przedmioty, pliki i postępy są przypisane do Twojego prywatnego konta i nie są udostępniane innym użytkownikom.
              </p>
            </article>
            <article className="lp-feature lp-mint">
              <span className="lp-feature-icon">✓</span>
              <h3>Bez reklam</h3>
              <p>
                W becie nie uruchamiamy reklam ani śledzenia reklamowego. Twoje materiały i notatki nigdy nie służą do targetowania reklam.
              </p>
            </article>
            <article className="lp-feature lp-peach">
              <span className="lp-feature-icon">✦</span>
              <h3>Jasno o AI</h3>
              <p>
                Gdy uruchamiasz funkcję AI, potrzebna treść (przy OCR obraz strony) jest przesyłana do OpenAI. Nie dzieje się to automatycznie bez Twojej wiedzy i zgody.
              </p>
            </article>
            <article className="lp-feature">
              <span className="lp-feature-icon">↓</span>
              <h3>Możesz wszystko zabrać</h3>
              <p>
                W każdej chwili pobierzesz swoje dane tekstowe i postępy (JSON), a w Profilu oryginalne pliki. Masz pełną kontrolę.
              </p>
            </article>
          </div>
        </section>

        <section id="lp-plans" className="lp-section lp-wrap">
          <div className="lp-section-head lp-center">
            <span className="lp-eyebrow">PROSTE PLANY. JASNE ZASADY.</span>
            <h2>
              Teraz testujesz.<br />
              Za Premium nie płacisz.
            </h2>
            <p>
              Podczas otwartej bety wszystkie konta otrzymują pełny pakiet Premium bez opłat. Płatna subskrypcja nie jest jeszcze dostępna.
            </p>
          </div>
          <div className="lp-pricing">
            <article className="lp-plan">
              <span className="lp-tag">PLAN PODSTAWOWY</span>
              <h3>Basic</h3>
              <p className="lp-plan-price">
                5 GB <small>na Twoje pliki</small>
              </p>
              <ul>
                <li>5 użyć AI dziennie</li>
                <li>Przedmioty, lekcje, fiszki i testy</li>
                <li>Zadania, notatki i kalendarz</li>
                <li>Postępy zapisane na koncie</li>
              </ul>
              <p className="lp-plan-note">
                Pakiet docelowy po zakończeniu bety. Obecnie każdy użytkownik otrzymuje wyższy pakiet Premium.
              </p>
            </article>
            <article className="lp-plan lp-plan-premium">
              <span className="lp-tag">OTWARTA BETA DLA KAŻDEGO</span>
              <div className="lp-plan-title">
                <h3>Premium</h3>
                <span>0 ZŁ W CZASIE BETY</span>
              </div>
              <p className="lp-plan-price">
                0 zł <small>w czasie bety</small>
              </p>
              <ul>
                <li>
                  <strong>20 GB</strong> na Twoje pliki
                </li>
                <li>
                  <strong>100 użyć AI dziennie</strong>
                </li>
                <li>Wszystkie funkcje nauki i organizacji</li>
                <li>Bez karty płatniczej</li>
              </ul>
              <button className="lp-primary" onClick={onRegister} type="button">
                Wypróbuj Premium bezpłatnie ↗
              </button>
            </article>
          </div>
          <p className="lp-pricing-note">
            Ceny po becie nie zostały jeszcze ustalone. Maksymalnie 20 MB na pojedynczy plik. Jedno opracowanie, odpowiedź AI lub strona OCR to jedno użycie AI; długi kurs może wymagać wielu użyć. Licznik odnawia się o północy UTC. Obowiązuje także wspólny limit dostępności usługi.
          </p>
        </section>

        <section id="lp-faq" className="lp-section lp-wrap lp-faq">
          <div>
            <span className="lp-eyebrow">PYTANIA I ODPOWIEDZI</span>
            <h2>
              Dobre pytania.<br />
              Konkretne odpowiedzi.
            </h2>
            <p>Wszystko, co warto wiedzieć przed założeniem konta.</p>
          </div>
          <div className="lp-questions">
            {faqItems.map(([q, a], idx) => (
              <details key={idx}>
                <summary>
                  {q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="lp-about" className="lp-section lp-wrap">
          <div className="lp-section-head">
            <span className="lp-eyebrow">O NAS I MISJA</span>
            <h2>
              Stworzone przez studentów.<br />
              Dla studentów w całej Polsce.
            </h2>
            <p>
              Wiemy, jak wygląda zarywanie nocy przed sesją, chaos w notatkach i bezsensowne przepisywanie slajdów. Zbudowaliśmy narzędzie, którego sami potrzebowaliśmy na co dzień.
            </p>
          </div>
          <div className="lp-bento lp-about-grid">
            <article className="lp-feature lp-hl">
              <span className="lp-feature-icon">✦</span>
              <h3>Nasza misja</h3>
              <p>
                Uprościć studiowanie do maksimum. Chcemy, aby nikt nie musiał tracić godzin na ręczne tworzenie fiszek czy żonglowanie kilkoma programami. Wrzucasz materiał z zajęć i natychmiast przechodzisz do skutecznej nauki.
              </p>
            </article>
            <article className="lp-feature lp-mint">
              <span className="lp-feature-icon">🛡️</span>
              <h3>Uczciwość i prywatność</h3>
              <p>
                Twoje materiały i notatki należą wyłącznie do Ciebie. Nie handlujemy danymi, nie wprowadzamy banerów reklamowych ani nie wykorzystujemy Twoich notatek do celów komercyjnych.
              </p>
            </article>
            <article className="lp-feature lp-peach">
              <span className="lp-feature-icon">⚡</span>
              <h3>Otwarta Beta 0 zł</h3>
              <p>
                Wierzymy w równy dostęp do nowoczesnych narzędzi edukacyjnych. Dlatego w fazie testowej każdy student otrzymuje pełny pakiet Premium bez opłat i bez konieczności podawania karty.
              </p>
            </article>
          </div>
        </section>

        <section id="lp-legal" className="lp-section lp-wrap">
          <div className="lp-section-head">
            <span className="lp-eyebrow">DOKUMENTY I PRAWO</span>
            <h2>
              Przejrzyste zasady.<br />
              Pełna zgodność z prawem.
            </h2>
            <p>
              Dbamy o Twoje prawa i bezpieczeństwo danych zgodnie z RODO, Ustawą o świadczeniu usług drogą elektroniczną oraz przepisami konsumenckimi.
            </p>
          </div>

          <div className="lp-legal-grid">
            <article id="lp-terms" className="lp-legal-card">
              <div className="lp-legal-badge">DOKUMENT PRAWNY</div>
              <h3>Regulamin świadczenia usług drogą elektroniczną</h3>
              <p className="lp-legal-date">Wersja obowiązująca od: 1 marca 2026 r. · Dotyczy serwisu Studeo (wersja Beta)</p>

              <div className="lp-legal-content">
                <h4>§ 1. Postanowienia ogólne i definicje</h4>
                <p>1. Niniejszy Regulamin określa zasady korzystania z aplikacji internetowej Studeo, dostępnej pod adresem domeny serwisu.</p>
                <p>2. Usługodawcą jest projekt Studeo, z adresem poczty elektronicznej do kontaktu: <strong>kontakt@studeo.app</strong>.</p>
                <p>3. Użytkownikiem jest każda osoba fizyczna posiadająca pełną lub ograniczoną zdolność do czynności prawnych, korzystająca z Serwisu.</p>
                <p>4. Otwarta Beta to etap udostępnienia Serwisu w celu testowania i rozwoju funkcji przed wprowadzeniem ewentualnych planów płatnych.</p>

                <h4>§ 2. Rodzaje i zakres świadczonych usług</h4>
                <p>1. Usługodawca świadczy drogą elektroniczną usługi polegające na:</p>
                <ul>
                  <li>utworzeniu i obsłudze indywidualnego Konta Użytkownika,</li>
                  <li>zarządzaniu przedmiotami akademickimi, zadaniami z terminami i kalendarzem z obsługą cyklu tygodni parzystych/nieparzystych,</li>
                  <li>wspomaganiu tworzenia materiałów dydaktycznych: generowanie lekcji, pytań sprawdzających oraz fiszek z algorytmem powtórek w odstępach czasu (SRS) na bazie materiałów wgrywanych przez Użytkownika,</li>
                  <li>rozpoznawaniu tekstu (OCR) z wgranych skanów i grafik,</li>
                  <li>przechowywaniu plików dydaktycznych oraz synchronizacji postępów nauki.</li>
                </ul>

                <h4>§ 3. Warunki techniczne i prawa autorskie</h4>
                <p>1. Do korzystania z Serwisu niezbędne jest urządzenie połączone z siecią Internet, wyposażone w aktualną przeglądarkę internetową (m.in. Chrome, Firefox, Safari, Edge) z obsługą standardu HTML5, JavaScript oraz pamięci LocalStorage.</p>
                <p>2. Użytkownik zobowiązany jest do korzystania z Serwisu zgodnie z prawem i dobrymi obyczajami, w tym powstrzymywania się od dostarczania treści o charakterze bezprawnym.</p>
                <p>3. Użytkownik oświadcza, że posiada uprawnienia do materiałów dydaktycznych (w tym plików PDF, skryptów, notatek) wgrywanych do Serwisu, w szczególności w granicach dozwolonego użytku osobistego lub edukacyjnego określonych przepisami ustawy o prawie autorskim i prawach pokrewnych.</p>

                <h4>§ 4. Zasady działania funkcji sztucznej inteligencji (AI)</h4>
                <p>1. Funkcje automatycznego generowania lekcji, fiszek i testów oraz OCR wykorzystują modele sztucznej inteligencji (dostarczane przez OpenAI API).</p>
                <p>2. Wygenerowane opracowania mają charakter wyłącznie edukacyjny i pomocniczy. AI może się pomylić. Usługodawca nie deklaruje ani nie zapewnia uzyskania zaliczenia przedmiotu czy określonych ocen na uczelni.</p>
                <p>3. Użytkownik ma możliwość i obowiązek weryfikacji generowanych treści z oryginalnym materiałem źródłowym za pomocą wbudowanego wskaźnika źródła.</p>

                <h4>§ 5. Opłaty i warunki Otwartej Bety</h4>
                <p>1. Korzystanie z Serwisu w okresie Otwartej Bety jest w 100% bezpłatne (0 zł) i nie wymaga podawania danych karty płatniczej.</p>
                <p>2. W trakcie Bety każdemu Użytkownikowi przydzielany jest pakiet Premium: limit 20 GB przestrzeni na pliki oraz 100 użyć AI dziennie (odnawiany o północy UTC). Maksymalny rozmiar pojedynczego pliku wynosi 20 MB.</p>
                <p>3. Ceny po becie nie zostały jeszcze ustalone. Wszelkie zmiany zasad po zakończeniu Bety zostaną ogłoszone z wyprzedzeniem. Docelowy pakiet bezpłatny Basic przewiduje 5 GB przestrzeni.</p>

                <h4>§ 6. Zawarcie i rozwiązanie umowy</h4>
                <p>1. Umowa o świadczenie usług drogą elektroniczną zostaje zawarta z chwilą pomyślnej rejestracji Konta na czas nieokreślony.</p>
                <p>2. Użytkownik może w dowolnym momencie zrezygnować z usługi i rozwiązać umowę ze skutkiem natychmiastowym, usuwając konto lub zgłaszając dyspozycję na kontakt@studeo.app.</p>
                <p>3. Użytkownik ma prawo w każdym czasie pobrać kopię swoich danych (format JSON) oraz przesłane pliki.</p>

                <h4>§ 7. Reklamacje i pomoc</h4>
                <p>1. Wszelkie reklamacje i zgłoszenia nieprawidłowości można zgłaszać drogą elektroniczną pod adresem: <strong>kontakt@studeo.app</strong>.</p>
                <p>2. Zgłoszenie powinno zawierać adres e-mail przypisany do konta oraz zwięzły opis okoliczności.</p>
                <p>3. Usługodawca udziela odpowiedzi na reklamację w terminie do 14 dni od dnia jej otrzymania.</p>
              </div>
            </article>

            <article id="lp-privacy-policy" className="lp-legal-card">
              <div className="lp-legal-badge">OCHRONA DANYCH</div>
              <h3>Polityka Prywatności i Plików Cookies (RODO)</h3>
              <p className="lp-legal-date">Wersja zgodna z art. 13 Ogólnego Rozporządzenia o Ochronie Danych (RODO) z dnia 27 kwietnia 2016 r.</p>

              <div className="lp-legal-content">
                <h4>1. Administrator Danych Osobowych (ADO)</h4>
                <p>Administratorem Twoich danych osobowych jest projekt Studeo. W sprawach związanych z przetwarzaniem danych oraz realizacją praw RODO możesz skontaktować się pod adresem e-mail: <strong>kontakt@studeo.app</strong> (lub <strong>iod@studeo.app</strong>).</p>

                <h4>2. Jakie dane przetwarzamy i na jakiej podstawie prawnej?</h4>
                <ul>
                  <li><strong>Rejestracja i utrzymanie Konta:</strong> adres e-mail, nazwa wyświetlana, hasło w formie bezpiecznego skrótu kryptograficznego — art. 6 ust. 1 lit. b RODO (niezbędność do wykonania umowy).</li>
                  <li><strong>Świadczenie usług edukacyjnych:</strong> dodane pliki, utworzone przedmioty, fiszki, historia powtórek i odpowiedzi testowych — art. 6 ust. 1 lit. b RODO.</li>
                  <li><strong>Bezpieczeństwo i stabilność infrastruktury:</strong> logi serwerowe, adres IP, diagnostyka błędów i ochrona przed atakami sieciowymi — art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes Administratora).</li>
                  <li><strong>Obsługa zapytań i reklamacji:</strong> korespondencja e-mail — art. 6 ust. 1 lit. c i f RODO.</li>
                </ul>

                <h4>3. Odbiorcy danych i podmioty współpracujące</h4>
                <p>1. Dane Użytkowników powierzamy wyłącznie zaufanym dostawcom infrastruktury niezbędnej do działania serwisu:</p>
                <ul>
                  <li><strong>Supabase Inc.</strong> — bezpieczna baza danych w chmurze, system uwierzytelniania kont oraz magazyn plików.</li>
                  <li><strong>OpenAI, L.L.C.</strong> — dostawca modeli sztucznej inteligencji. Gdy uruchamiasz funkcję AI, potrzebna treść (przy OCR obraz strony) jest przesyłana do OpenAI w celu wykonania zapytania. Dane nie są wykorzystywane do publicznego trenowania modeli.</li>
                  <li><strong>Cloudflare Inc.</strong> — ochrona sieciowa, DNS i bezpieczne dostarczanie treści (CDN).</li>
                </ul>

                <h4>4. Twoje prawa zgodnie z RODO</h4>
                <p>Przysługuje Ci prawo do:</p>
                <ul>
                  <li>dostępu do treści swoich danych oraz otrzymania ich kopii,</li>
                  <li>sprostowania nieprawidłowych lub niekompletnych danych,</li>
                  <li>usunięcia danych („prawo do bycia zapomnianym”) — poprzez usunięcie konta lub plików,</li>
                  <li>ograniczenia przetwarzania danych,</li>
                  <li>przenoszenia danych — wyeksportowania danych w ustrukturyzowanym formacie JSON,</li>
                  <li>wniesienia sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie,</li>
                  <li>wniesienia skargi do organu nadzorczego: Prezes Urzędu Ochrony Danych Osobowych (PUODO), ul. Stawki 2, 00-193 Warszawa.</li>
                </ul>

                <h4>5. Czas przechowywania danych (retencja)</h4>
                <p>Dane osobowe i pliki przechowujemy przez okres posiadania aktywnego Konta w Studeo. W przypadku usunięcia pliku lub całego konta, dane są bezpowrotnie usuwane z baz danych i magazynu plików.</p>

                <h4>6. Pliki Cookies i pamięć lokalna (LocalStorage)</h4>
                <p>1. Serwis wykorzystuje wyłącznie niezbędne mechanizmy techniczne pamięci przeglądarki (LocalStorage oraz sesyjne pliki cookie) służące do utrzymania stanu zalogowania Użytkownika i zabezpieczenia autoryzacji.</p>
                <p>2. W wersji beta Studeo nie stosuje marketingowych ani śledzących plików cookies stron trzecich. Twoje materiały i notatki nigdy nie służą do profilowania ani reklam.</p>
              </div>
            </article>
          </div>
        </section>

        <section id="lp-contact" className="lp-section lp-wrap">
          <div className="lp-section-head">
            <span className="lp-eyebrow">KONTAKT I WSPARCIE</span>
            <h2>
              Jesteśmy tu, żeby pomóc.<br />
              Napisz do zespołu Studeo.
            </h2>
            <p>
              Masz pytanie, znalazłeś problem w becie albo chcesz zgłosić pomysł na nową funkcję? Skontaktuj się z nami bezpośrednio.
            </p>
          </div>
          <div className="lp-contact-grid">
            <article className="lp-contact-card">
              <span className="lp-contact-icon">✉</span>
              <h3>Główny kontakt i pomoc</h3>
              <p>Pytania ogólne, pomoc techniczna, zgłaszanie problemów z plikami lub kontem.</p>
              <a className="lp-contact-link" href="mailto:kontakt@studeo.app">kontakt@studeo.app</a>
              <span className="lp-contact-time">Odpowiadamy zwykle w ciągu 24–48h w dni robocze</span>
            </article>
            <article className="lp-contact-card">
              <span className="lp-contact-icon">💡</span>
              <h3>Sugestie do Otwartej Bety</h3>
              <p>Pomysły na usprawnienie kalendarza, fiszek, algorytmu SRS lub odczytu skanów.</p>
              <a className="lp-contact-link" href="mailto:feedback@studeo.app">feedback@studeo.app</a>
              <span className="lp-contact-time">Każdy głos ma bezpośredni wpływ na rozwój aplikacji</span>
            </article>
            <article className="lp-contact-card">
              <span className="lp-contact-icon">🛡️</span>
              <h3>Prywatność i RODO</h3>
              <p>Pytania dotyczące ochrony danych osobowych, praw Użytkownika i usuwania danych.</p>
              <a className="lp-contact-link" href="mailto:iod@studeo.app">iod@studeo.app</a>
              <span className="lp-contact-time">Dedykowana linia w sprawach ochrony danych</span>
            </article>
          </div>
        </section>

        <section className="lp-final lp-wrap">
          <span className="lp-final-star" aria-hidden="true">
            ✦
          </span>
          <span className="lp-eyebrow">ZACZNIJ OD JEDNEGO PRZEDMIOTU</span>
          <h2>
            Całe studia w jednym miejscu.<br />
            Zacznij od następnego wykładu.
          </h2>
          <button className="lp-primary" onClick={onRegister} type="button">
            Załóż bezpłatne konto ↗
          </button>
          <p>Premium w becie dla każdego. Bez karty płatniczej · Gotowe w 10 sekund.</p>
        </section>
      </main>

      <footer className="lp-footer lp-wrap">
        <div className="lp-footer-brand">
          <a className="lp-logo" href="#lp-top">
            <span>✦</span> studeo
          </a>
          <p>Niezbędnik studencki · wersja beta</p>
        </div>
        <div className="lp-footer-links">
          <a href="#lp-about">O nas</a>
          <a href="#lp-contact">Kontakt</a>
          <a href="#lp-plans">Plany i zasady</a>
          <a href="#lp-terms">Regulamin</a>
          <a href="#lp-privacy-policy">Polityka prywatności</a>
        </div>
        <button className="lp-login" onClick={onLogin} type="button">
          Zaloguj się ↗
        </button>
      </footer>
    </div>
  );
};
