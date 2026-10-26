# GitHub → Cloudflare → Supabase

Status: konfiguracja przygotowana. Połączenie konta Cloudflare, pierwsze wdrożenie i konfiguracja adresów Auth wymagają dokończenia. Obecna strona Sites pozostaje aktywna.

## Połączenie repozytorium

W Cloudflare Workers & Pages utwórz aplikację Worker z repozytorium GitHub `Ayerka/studeo`. Nadaj integracji dostęp do tego repozytorium.

- Nazwa Workera: `studeo` (zgodna z wrangler.jsonc).
- Gałąź produkcyjna: `main`.
- Katalog główny: katalog repozytorium.
- Build command: `npm ci && npm test && npm run build`.
- Deploy command: `npx wrangler@4 deploy`.
- Wyłącz wdrażanie innych gałęzi do produkcji.

Ustaw zmienne builda:

```text
NODE_VERSION=22
VITE_SUPABASE_URL=https://kioqgerkpbgntlbavtro.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nQNZs5zYdlqFyje_0yzUAQ_7Rot6RVN
```

To klucz publiczny aplikacji, nie sekret. Nie dodawaj klucza OpenAI ani service_role do zmiennych VITE. AI pozostaje w funkcji Supabase student-ai.

Po pierwszym wdrożeniu zapisz rzeczywisty adres workers.dev. Dodaj go do dozwolonych przekierowań Supabase Auth; zachowaj dotychczasowe adresy, w tym adresy osobnej aplikacji włoskiego. Nie zmieniaj globalnego Site URL bez sprawdzenia wpływu na obie aplikacje.

Sprawdź na nowym adresie logowanie, reset hasła, dostęp do istniejących postępów, pliki i AI. Przeglądarka może wymagać ponownego logowania na nowej domenie; baza danych nie jest przenoszona.

Kolejne zmiany main uruchamiają testy i build przed publikacją przez Cloudflare. Ta integracja nie wdraża funkcji Supabase ani migracji bazy: są osobnym krokiem. Nie resetuj bazy i nie odtwarzaj istniejących kont.

Dokumentacja: https://developers.cloudflare.com/workers/ci-cd/builds/
