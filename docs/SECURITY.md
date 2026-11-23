# Bezpieczeństwo Studeo — audyt z 26.10.2026

Zakres: baza i Storage w Supabase (projekt kioqgerkpbgntlbavtro), funkcja student-ai, Worker Cloudflare, nagłówki, kod frontendu, zależności i repozytorium. Nie był to test penetracyjny.

## Co jest w porządku

- RLS włączone (z FORCE) na tabelach użytkowników; polityki ograniczają dane do właściciela. Klucz publiczny (publishable) jest przeznaczony do przeglądarki.
- Bucket `student-private` jest prywatny, z limitem 20 MB i listą typów plików (bez HTML i SVG). Ścieżka pliku musi zaczynać się od identyfikatora użytkownika.
- Plan konta nie może być zmieniony z przeglądarki (brak zapisu do `plans` i `account_plans`).
- Treści użytkownika renderują się jako tekst React; testy portalu React sprawdzają prywatność danych i zachowanie formularzy.
- `npm audit --omit=dev`: 0 podatności. W repozytorium nie znaleziono sekretów (klucz OpenAI i service_role są poza repo).

## Naprawione w tym PR

1. **Worker na Cloudflare nie stosował `public/_headers`.** Wysyłał tylko nosniff i Referrer-Policy, więc brakowało m.in. ochrony przed osadzeniem strony w ramce (clickjacking), HSTS i nagłówka CSP. Teraz `worker/headers.js` dodaje nagłówki do każdej odpowiedzi, a test uruchamia prawdziwy build Workera.
2. **Rozjazd CSP.** Plik `_headers` miał szerszą łączność (`*.supabase.co` — dowolny projekt Supabase) i nie zawierał `worker-src`/`media-src` z `blob:`, a `microphone=()` blokowałoby notatki głosowe. Ujednolicono z `index.html` (łączność tylko z projektem Studeo, mikrofon dozwolony dla własnej strony). Test pilnuje zgodności.
3. Plik `/_headers` nie jest już publicznie serwowany jako zasób.
4. Migracja 009: zdjęcie zbędnych uprawnień (funkcja wyzwalacza limitu przedmiotów, TRUNCATE/TRIGGER/REFERENCES na `piano_piano_progress`).

## Do zrobienia ręcznie (panele Supabase i Cloudflare)

1. **Supabase → Authentication:** włączyć ochronę przed wyciekłymi hasłami, ustawić minimalną długość hasła 12 znaków (formularz wymusza to tylko po stronie przeglądarki), potwierdzenie adresu e-mail przy rejestracji i listę dozwolonych adresów przekierowań tylko dla używanych domen.
2. **Supabase → Authentication → Rate limits** oraz CAPTCHA (np. Cloudflare Turnstile) przy rejestracji — ogranicza zakładanie masowych kont.
3. **Cloudflare:** reguły ograniczania liczby żądań dla `/api/*` oraz alert zużycia.
4. **OpenAI:** miesięczny limit wydatków na kluczu API.

## Wdrożone 27.10.2026 (zgoda właścicielki)

- **Migracja 009** (zdjęcie zbędnych uprawnień) i **010** (limity AI) wdrożone na produkcji.
- **Limit AI w becie:** obecnie 100 użyć na konto na dobę UTC (`plans.premium_beta.ai_per_day`, ustawione migracją 011; w tym PR-ze wdrożono najpierw 20) oraz **globalny limit 1000 na dobę** (`app_settings.ai_global_per_day`, tabela niedostępna dla API; 28.10.2026 podniesiony z 300 na polecenie właścicielki). Obie wartości zmienia się jednym UPDATE bez zmiany kodu. Przy 100 użyciach na konto globalny limit wyczerpuje już 10 aktywnych kont, więc w OpenAI ustaw też miesięczny limit wydatków.
- Test na żywej bazie (transakcja wycofana) przy limicie 20: 20 wywołań przeszło, 21. zostało odrzucone.
- Ekran Premium w aplikacji pokazuje aktualne limity planu.

## Decyzje otwarte

- **Funkcja student-ai ma `verify_jwt=false`.** To zgodne z nowymi kluczami publishable; funkcja sama weryfikuje sesję użytkownika. Nie zmieniać bez przeglądu.

## Znane ograniczenia

- Brak skanera antywirusowego plików; bucket dopuszcza `application/octet-stream`. Pliki są prywatne i nie są wykonywane, ale przed startem komercyjnym warto dodać skanowanie.
- Brak usuwania konta i plików (użytkownik nie ma polityki DELETE w Storage).
- `style-src 'unsafe-inline'` pozostaje ze względu na style generowane w interfejsie.
