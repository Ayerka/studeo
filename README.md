# Studeo — niezbędnik studenta

Kod aplikacji Studeo: kurs Od zera do hakera, prywatne przedmioty i materiały, kursy generowane z materiałów, fiszki, testy, notatki, kalendarz, zadania i pomoc AI. Bezpłatna beta udostępnia Premium wszystkim kontom.

Strona: https://cyber-od-zera-michelle.ejm-chatgpt.chatgpt.site/

## Co jest w repozytorium

Repozytorium zawiera kopię kodu źródłowego i migracje bazy. Konta, postępy, prywatne materiały i sekrety pozostają w Supabase — nie są częścią tej kopii. Aktualizacja repozytorium sama nie publikuje zmian na stronie. Nie skonfigurowano automatycznego wdrażania z GitHuba.

## Aplikacja w React

Aplikacja została przepisana do nowoczesnego stosu **React + TypeScript + Vite**, z zachowaniem pełnej logiki biznesowej, polskiego interfejsu, stylów CSS i testów:

- **Architektura React**: Modularne komponenty (`LandingPage`, `CourseApp`, `StudentPortal`, `AccountModal`, `Toast`).
- **Kurs „Od zera do hakera”**: 34 interaktywne lekcje w 4 blokach tematycznych (Podstawy, Kryptografia, Aktorzy zagrożeń, Malware), fiszki, słownik pojęć, interaktywne diagramy edukacyjne, generator testów i pytań CompTIA Security+ SY0-701.
- **Strefa studenta („Moje przedmioty”)**: Prywatne przedmioty, materiały PDF i tekstowe z podglądem i OCR, notatki tekstowe i nagrania audio, tablica zadań Kanban z powtarzalnością i notatkami roboczymi, kalendarz zajęć, algorytm powtórek w odstępach (SRS) oraz kursy generowane z własnych materiałów.
- **Backend i synchronizacja**: Integracja z Supabase (Auth, PostgreSQL, RLS, Storage) oraz bezpieczny tryb offline/preview z lokalnym zapisem.

## Uruchomienie

Node.js 22 lub nowszy oraz npm:

```sh
npm install
npm run dev      # Uruchamia serwer developerski na porcie 3000
npm test         # Uruchamia pełny zestaw testów
npm run build    # Buduje zoptymalizowaną aplikację React
```

## Hosting i backend

Build tworzy Worker w `dist/server/index.js` z osadzonym frontendem oraz metadane Sites. To nie jest zwykły katalog statyczny do GitHub Pages. Ścieżki `/api/study` i `/api/task-help` przekazują żądania do funkcji Supabase `student-ai`. Sam serwer deweloperski Vite nie udostępnia tych ścieżek backendu.

Istniejąca strona działa na Sites. Supabase obsługuje logowanie, Postgres, RLS i prywatny magazyn plików. Przy przenoszeniu na inny projekt sprawdź także konfigurację Supabase w `worker/proxy.js`, adresy przekierowań Auth oraz konfigurację funkcji.

Migracje znajdują się w `supabase/migrations/`; stosuj je w kolejności na nowej bazie lub uruchamiaj wyłącznie brakujące migracje na istniejącej. Nie uruchamiaj ponownie wszystkich migracji na produkcji. Funkcja AI jest w `supabase/functions/student-ai/index.ts`. Wymaga konfiguracji sekretu OpenAI po stronie Supabase i wdrożenia funkcji. Nie umieszczaj tego sekretu w kodzie frontendu ani w repozytorium.

Publiczny klucz Supabase może występować w kodzie klienta; bezpieczeństwo danych zapewniają uwierzytelnianie i polityki RLS. Pliki `.env*` poza przykładem są ignorowane przez Git.

Więcej informacji: `docs/STUDEO-BETA.md` i `docs/PRIVATE-SUBJECT-COURSES.md`.

## Automatyczna publikacja

Konfiguracja docelowego hostingu Cloudflare Workers jest przygotowana w `wrangler.jsonc`. Połączenie kont i pierwsze wdrożenie opisuje [instrukcja](docs/CLOUDFLARE.md). GitHub Actions uruchamia testy i sprawdza build; nie wdraża bazy ani funkcji Supabase.
