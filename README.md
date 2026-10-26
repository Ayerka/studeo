# Studeo — niezbędnik studenta

Kod aplikacji Studeo: kurs Od zera do hakera, prywatne przedmioty i materiały, kursy generowane z materiałów, fiszki, testy, notatki, kalendarz, zadania i pomoc AI. Bezpłatna beta udostępnia Premium wszystkim kontom.

Strona: https://cyber-od-zera-michelle.ejm-chatgpt.chatgpt.site/

## Co jest w repozytorium

Repozytorium zawiera kopię kodu źródłowego i migracje bazy. Konta, postępy, prywatne materiały i sekrety pozostają w Supabase — nie są częścią tej kopii. Aktualizacja repozytorium sama nie publikuje zmian na stronie. Nie skonfigurowano automatycznego wdrażania z GitHuba.

## Uruchomienie

Node.js 22.12 lub nowszy oraz npm:

```sh
npm ci
cp .env.example .env.local
# Uzupełnij URL Supabase i publiczny klucz w .env.local.
npm run dev
```

```sh
npm test
npm run build
```

Polecenia automatycznie uruchamiają `scripts/assemble.mjs`. Edytuj moduły w `src/`, nie wygenerowany `src/main.js`.

## Hosting i backend

Build tworzy Worker w `dist/server/index.js` z osadzonym frontendem oraz metadane Sites. To nie jest zwykły katalog statyczny do GitHub Pages. Ścieżki `/api/study` i `/api/task-help` przekazują żądania do funkcji Supabase `student-ai`. Sam serwer deweloperski Vite nie udostępnia tych ścieżek backendu.

Istniejąca strona działa na Sites. Supabase obsługuje logowanie, Postgres, RLS i prywatny magazyn plików. Przy przenoszeniu na inny projekt sprawdź także konfigurację Supabase w `worker/proxy.js`, adresy przekierowań Auth oraz konfigurację funkcji.

Migracje znajdują się w `supabase/migrations/`; stosuj je w kolejności na nowej bazie lub uruchamiaj wyłącznie brakujące migracje na istniejącej. Nie uruchamiaj ponownie wszystkich migracji na produkcji. Funkcja AI jest w `supabase/functions/student-ai/index.ts`. Wymaga konfiguracji sekretu OpenAI po stronie Supabase i wdrożenia funkcji. Nie umieszczaj tego sekretu w kodzie frontendu ani w repozytorium.

Publiczny klucz Supabase może występować w kodzie klienta; bezpieczeństwo danych zapewniają uwierzytelnianie i polityki RLS. Pliki `.env*` poza przykładem są ignorowane przez Git.

Więcej informacji: `docs/STUDEO-BETA.md` i `docs/PRIVATE-SUBJECT-COURSES.md`.
