# Produkcyjny React

`index.html` uruchamia `src/main.tsx`. Landing, konto, kurs lekcyjny i stan aplikacji są renderowane przez React. `npm run build` buduje ten punkt wejścia, a następnie Worker z prywatnym proxy API.

Panel studenta jest na razie zamontowany przez `ProductionStudentPortal`, który zarządza cyklem życia sprawdzonego `src/student.js`. Zachowuje to istniejące funkcje i kontrakty produkcyjne: izolację kont, rewizje CRUD, generowanie przez `/api/study`, upload z rezerwacją limitu, OCR, podgląd PDF, plan i profil plików. To adapter kompatybilności, nie docelowy podział wszystkich widoków studenta na komponenty React.

Warstwa React używa `createStudentStore` do zapytań owner-scoped i zapisów z rewizją. Snapshot nauki pozostaje zgodny ze starym formatem: postęp, odpowiedzi quizów, indeks fiszek, aktywny egzamin i historia. Import starej kopii obsługuje format `{app: "Cyber od zera", state: ...}` oraz kopie Studeo; referencje do plików binarnych nie są przenoszone.

Weryfikacja obejmuje `npm test`, `npx tsc --noEmit` i `npm run build`. Stary DOM runtime i jego generator zostały usunięte. Testy sprawdzają komponent landing React, integralność danych kursu, snapshoty sesji oraz produkcyjną warstwę panelu studenta.

Instalacja produkcyjna używa `npm ci` oraz `package-lock.json`. Build publikuje statyczny frontend w `dist/client` oraz Worker w `dist/server/index.js`, zgodnie z `wrangler.jsonc`.
