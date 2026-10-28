# Stan migracji React

Kod React/TypeScript pozostaje w repozytorium jako niedokończony prototyp. Produkcja uruchamia `src/main.js`, składany z `course.js` i `account.js`. Zmiany strony powitalnej są w `src/landing.js` i `src/landing.css`.

Nie przełączaj produkcji na `src/main.tsx` przed przywróceniem i przetestowaniem:
- izolacji lokalnego stanu przy zmianie konta i wylogowaniu (prototyp używa wspólnych kluczy localStorage),
- obsługi błędów Supabase i rewizji zapisu (prototyp zapisuje z expected_revision=0),
- rzeczywistego generowania kursów przez `/api/study`, zamiast przykładowych pytań,
- limitów serwerowych, przesyłania plików, OCR, podglądu PDF i profilu pamięci,
- zgodności danych oraz całego zestawu testów sesji, kont i kursów.

Instalacja produkcyjna używa `npm ci` oraz `package-lock.json`. `npm run build` buduje frontend do `dist/client`, a potem Worker z prywatnym proxy API do `dist/server/index.js`. Cloudflare publikuje ten Worker z `wrangler.jsonc`.
