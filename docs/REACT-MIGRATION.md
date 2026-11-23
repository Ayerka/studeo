# Produkcyjny React

`index.html` uruchamia `src/main.tsx`. Landing, konto, kurs lekcyjny i stan aplikacji są renderowane przez React. `npm run build` buduje ten punkt wejścia, a następnie Worker z prywatnym proxy API.

Panel studenta renderuje `StudentPortal` i komponenty w `src/components/student/`. Stan i CRUD są zarządzane hookiem `useStudentData`; formularze, kursy prywatne, materiały/OCR/PDF, zadania, kalendarz, archiwum, powtórki i testy są widokami React. Logika domenowa pozostaje w czystych modułach JavaScript (`student-model.js`, `subject-course.js`, `student-files.js`, `ocr-model.js`), a nie w imperative UI.

Warstwa React używa `createStudentStore` do zapytań owner-scoped i zapisów z rewizją. Snapshot nauki pozostaje zgodny ze starym formatem: postęp, odpowiedzi quizów, indeks fiszek, aktywny egzamin i historia. Import starej kopii obsługuje format `{app: "Cyber od zera", state: ...}` oraz kopie Studeo; referencje do plików binarnych nie są przenoszone.

Weryfikacja obejmuje `npm test`, `npx tsc --noEmit` i `npm run build`. Stary DOM runtime i adapter `student.js` zostały usunięte. Testy sprawdzają komponenty React, owner-scoped CRUD, prywatny kurs AI, izolację kont, zadania cykliczne, fiszki SRS, OCR/PDF i logikę domenową.

Instalacja produkcyjna używa `npm ci` oraz `package-lock.json`. Build publikuje statyczny frontend w `dist/client` oraz Worker w `dist/server/index.js`, zgodnie z `wrangler.jsonc`.
