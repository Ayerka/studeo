# Studeo — niezbędnik studenta

Kod aplikacji Studeo: kurs Od zera do hakera, prywatne przedmioty i materiały, kursy generowane z materiałów, fiszki, testy, notatki, kalendarz, zadania i pomoc AI. Bezpłatna beta udostępnia Premium wszystkim kontom.

Strona: https://studeo.ayerka13.workers.dev

## Co jest w repozytorium

Repozytorium zawiera kopię kodu źródłowego i migracje bazy. Konta, postępy, prywatne materiały i sekrety pozostają w Supabase — nie są częścią tej kopii. Cloudflare GitHub Builds automatycznie publikuje gałąź main po udanym budowaniu. GitHub Actions osobno sprawdza testy i build.

## Frontend React

Produkcyjny interfejs uruchamia `src/main.tsx`. Widoki, nawigacja i stan kursu są komponentami React. Panel studenta jest obecnie osadzony przez adapter React, który zachowuje istniejące przepływy AI, plików, OCR i PDF; szczegóły dalszej migracji są w [dokumentacji](docs/REACT-MIGRATION.md).

Niektóre moduły `.js` pozostają celowo jako logika domenowa używana przez React: magazyn konta, kursy prywatne, OCR/PDF, modele i statystyki. Stary DOM runtime oraz jego generator zostały usunięte.

## Uruchomienie

Node.js 22.12 lub nowszy oraz npm:

```sh
npm ci
cp .env.example .env.local
# Uzupełnij publiczną konfigurację Supabase w .env.local.
npm run dev
npm test
npm run build
```

## Hosting i backend

Build tworzy Worker w `dist/server/index.js` z osadzonym frontendem oraz metadane Sites. To nie jest zwykły katalog statyczny do GitHub Pages. Ścieżki `/api/study` i `/api/task-help` przekazują żądania do funkcji Supabase `student-ai`. Sam serwer deweloperski Vite nie udostępnia tych ścieżek backendu.

Strona działa na Cloudflare Workers. Supabase obsługuje logowanie, Postgres, RLS i prywatny magazyn plików. Przy przenoszeniu na inny projekt sprawdź także konfigurację Supabase w `worker/proxy.js`, adresy przekierowań Auth oraz konfigurację funkcji.

Migracje znajdują się w `supabase/migrations/`; stosuj je w kolejności na nowej bazie lub uruchamiaj wyłącznie brakujące migracje na istniejącej. Nie uruchamiaj ponownie wszystkich migracji na produkcji. Funkcja AI jest w `supabase/functions/student-ai/index.ts`. Wymaga konfiguracji sekretu OpenAI po stronie Supabase i wdrożenia funkcji. Nie umieszczaj tego sekretu w kodzie frontendu ani w repozytorium.

Publiczny klucz Supabase może występować w kodzie klienta; bezpieczeństwo danych zapewniają uwierzytelnianie i polityki RLS. Pliki `.env*` poza przykładem są ignorowane przez Git.

Więcej informacji: `docs/STUDEO-BETA.md` i `docs/PRIVATE-SUBJECT-COURSES.md`.

## Automatyczna publikacja

Konfiguracja docelowego hostingu Cloudflare Workers jest przygotowana w `wrangler.jsonc`. Połączenie kont i pierwsze wdrożenie opisuje [instrukcja](docs/CLOUDFLARE.md). GitHub Actions uruchamia testy i sprawdza build; nie wdraża bazy ani funkcji Supabase.
