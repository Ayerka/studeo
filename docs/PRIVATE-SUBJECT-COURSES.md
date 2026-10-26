# Prywatne kursy przedmiotowe

W przedmiocie wybierz „Mój kurs” → „Utwórz kurs z moich materiałów” lub „Utwórz / zaktualizuj kurs”. Źródła: aktywne materiały z odczytanym tekstem i zapisane własne notatki. Notatki wygenerowane przez asystenta do zadań są pomijane. Nagrania, skany i obrazy bez tekstu nie są transkrybowane/OCR — dodaj ich tekst jako notatkę. Minimalna długość źródła: 100 znaków.

Kurs składa się z modułów według kolejności materiałów. Długie materiały dzielimy na części około 24 tys. znaków. Istniejący backend AI tworzy sekcje lekcji (zwykle 3–6 na część), fiszki i pytania z cytatami. Dokładna liczba zależy od długości i treści źródła. Indeks „Pojęcia i odpowiedzi” zbiera fiszki, nie jest osobną generacją słownika. Test kursu losuje 10/20/30 pytań z aktualnych modułów, a przy mniejszej puli wykorzystuje wszystkie dostępne.

## Zapis i aktualizacja

- Źródła oraz wygenerowane moduły są prywatnymi wpisami `student_entries`, chronionymi istniejącym RLS.
- Backend `/api/study` ponownie sprawdza sesję, własność materiału i dzienny limit AI. Żaden nowy sekret nie trafia do przeglądarki; połączenie Supabase/OpenAI pozostaje niezmienione.
- Każda część posiada prywatny snapshot materiału (ukryty na zwykłej liście plików). Snapshot ma deterministyczny UUID zależny od konta, przedmiotu, źródła, rewizji i numeru części. Aktualizacje są chronione kontrolą rewizji wpisu.
- Zapisany snapshot wiąże źródło i wygenerowany deck. Gotowy moduł jest odnajdywany także po zerwanym połączeniu. W trakcie generowania blokada części trwa do 3 minut. Nie uruchamiamy automatycznych płatnych ponowień przy niepewnym wyniku.
- Premium w becie (26.10): bez dziennych limitów produktu. Jedno kliknięcie opracowuje kolejno wszystkie oczekujące części z chwili rozpoczęcia. Przycisk zatrzymania kończy po bieżącej części. Limity dostawcy i błędy usługi nadal mogą przerwać zadanie bez usuwania gotowych modułów.
- Nie regenerujemy modułu przy niezmienionej rewizji i treści źródła. Zmiana materiału tworzy nową wersję; poprzednie lekcje, oznaczenia ukończenia i testy są nadal dostępne w „Wcześniejszych wersjach”. Wycofane źródła nie wchodzą do nowych testów.
- Ukończenie lekcji zapisujemy w `deck.payload.lessonDone`. Fiszki korzystają z istniejącego mechanizmu powtórek. Egzamin zapisuje kopię pytań, wyniki i wskazania modułów, więc zmiana materiału nie zmienia już rozpoczętego egzaminu.
- Bez migracji tabel i bez zmian w kursie Cyber ani projekcie włoskiego.

## Weryfikacja

33 testy obejmują stary kurs, RLS, źródła, chunkowanie, wznowienie po limicie, zapisy lekcji, test całego przedmiotu i izolację kont. Wywołania modelu w testach są zastąpione odpowiedziami testowymi — nie uruchomiono rzeczywistej płatnej generacji na koncie użytkowniczki. Nie jest to potwierdzenie dostępnego salda OpenAI. Błędy dostawcy i limitów są prezentowane w aplikacji bez kasowania gotowych materiałów.
