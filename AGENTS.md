# Praca nad Studeo

- Główne repozytorium kodu: Ayerka/studeo. Przed zmianami pobierz aktualny stan GitHuba; nie zastępuj go starszą kopią lokalną.
- Backend produkcyjny: projekt Supabase kioqgerkpbgntlbavtro. Zachowaj dane użytkowników, polityki RLS, identyfikatory lekcji oraz postępy.
- Nigdy nie dodawaj sekretów, plików .env ani eksportów danych użytkowników do repozytorium.
- Kod frontendu jest w src/. Produkcyjne wejście React to src/main.tsx.
- Przed publikacją uruchom npm test i npm run build z odpowiednią konfiguracją publiczną Supabase. CI używa konfiguracji testowej i jego build nie jest gotowym artefaktem produkcyjnym.
- Migracje bazy są osobnym krokiem wdrożenia: uruchamiaj tylko brakujące, po sprawdzeniu bieżącego schematu i historii migracji. Nie resetuj produkcyjnej bazy.
- Funkcja student-ai znajduje się w supabase/functions/student-ai/index.ts. Jej sekrety pozostają w Supabase.
- GitHub Actions sprawdza testy i build. Nie publikuje strony ani funkcji i nie wykonuje migracji.
- Docelowy hosting: Cloudflare Workers z integracją GitHub Builds; konfiguracja w wrangler.jsonc i docs/CLOUDFLARE.md. Do czasu potwierdzenia wdrożenia nie uznawaj migracji hostingu za zakończoną.
- Obecny hosting: Sites, projekt appgprj_6acbd2f820188191bd35b4e86fc89172. Publikację wykonuj przez obsługiwany workflow Sites. Zmiana hostingu wymaga konfiguracji nowego wdrożenia i adresów Auth.
- Po publikacji odnotuj użyty commit GitHuba i wynik wdrożenia. Nie deklaruj wdrożenia na podstawie samego commitu.
