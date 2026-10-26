# Bezpieczeństwo Studeo — audyt z 26.10.2026

Zakres: baza i Storage w Supabase (projekt kioqgerkpbgntlbavtro), funkcja student-ai, Worker Cloudflare, nagłówki, kod frontendu, zależności i repozytorium. Nie był to test penetracyjny.

## Co jest w porządku

- RLS włączone (z FORCE) na tabelach użytkowników; polityki ograniczają dane do właściciela. Klucz publiczny (publishable) jest przeznaczony do przeglądarki.
- Bucket `student-private` jest prywatny, z limitem 20 MB i listą typów plików (bez HTML i SVG). Ścieżka pliku musi zaczynać się od identyfikatora użytkownika.
- Plan konta nie może być zmieniony z przeglądarki (brak zapisu do `plans` i `account_plans`).
- Treści użytkownika są escapowane w interfejsie (testy XSS w `tests/student-ui.test.js`).
- `npm audit --omit=dev`: 0 podatności. W repozytorium nie znaleziono sekretów (klucz OpenAI i service_role są poza repo).

## Naprawione w tym PR

1. **Worker na Cloudflare nie stosował `public/_headers`.** Wysyłał tylko nosniff i Referrer-Policy, więc brakowało m.in. ochrony przed osadzeniem strony w ramce (clickjacking), HSTS i nagłówka CSP. Teraz `worker/headers.js` dodaje nagłówki do każdej odpowiedzi, a test uruchamia prawdziwy build Workera.
2. **Rozjazd CSP.** Plik `_headers` miał szerszą łączność (`*.supabase.co` — dowolny projekt Supabase) i nie zawierał `worker-src`/`media-src` z `blob:`, a `microphone=()` blokowałoby notatki głosowe. Ujednolicono z `index.html` (łączność tylko z projektem Studeo, mikrofon dozwolony dla własnej strony). Test pilnuje zgodności.
3. Plik `/_headers` nie jest już publicznie serwowany jako zasób.
4. Migracja 009: zdjęcie zbędnych uprawnień (funkcja wyzwalacza limitu przedmiotów, TRUNCATE/TRIGGER/REFERENCES na `piano_piano_progress`). Migracja nie jest wdrożona tym PR.

## Do zrobienia ręcznie (panele Supabase i Cloudflare)

1. **Supabase → Authentication:** włączyć ochronę przed wyciekłymi hasłami, ustawić minimalną długość hasła 12 znaków (formularz wymusza to tylko po stronie przeglądarki), potwierdzenie adresu e-mail przy rejestracji i listę dozwolonych adresów przekierowań tylko dla używanych domen.
2. **Supabase → Authentication → Rate limits** oraz CAPTCHA (np. Cloudflare Turnstile) przy rejestracji — ogranicza zakładanie masowych kont.
3. **Cloudflare:** reguły ograniczania liczby żądań dla `/api/*` oraz alert zużycia.
4. **OpenAI:** miesięczny limit wydatków na kluczu API.

## Decyzje właścicielki

- **Limit AI w becie.** Plan `premium_beta` nie ma dziennego limitu AI, a rejestracja jest otwarta. Jedno złośliwe konto może wygenerować duże koszty u dostawcy AI. Zalecany jawny limit dla każdego konta (np. 20 na dobę) oraz limit globalny; zmiana to jedna aktualizacja wiersza w `public.plans`, bez zmiany kodu.
- **Funkcja student-ai ma `verify_jwt=false`.** To zgodne z nowymi kluczami publishable; funkcja sama weryfikuje sesję użytkownika. Nie zmieniać bez przeglądu.

## Znane ograniczenia

- Brak skanera antywirusowego plików; bucket dopuszcza `application/octet-stream`. Pliki są prywatne i nie są wykonywane, ale przed startem komercyjnym warto dodać skanowanie.
- Brak usuwania konta i plików (użytkownik nie ma polityki DELETE w Storage).
- `style-src 'unsafe-inline'` pozostaje ze względu na style generowane w interfejsie.
