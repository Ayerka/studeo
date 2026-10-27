## Limit AI w becie — migracja 010 (27.10.2026)

Wszystkie konta mają Premium w becie, ale AI jest ograniczone ze względów bezpieczeństwa i kosztów: 20 użyć na konto na dobę UTC oraz globalny limit 300 na dobę. Ta zmiana zastępuje zapisy powyżej o braku dziennego limitu AI. Limity zmienia się w bazie (`plans`, `app_settings`).

## Aktualizacja Premium w becie — 26.10.2026

Wszystkie obecne i nowe konta otrzymują Premium bez opłat. Migracja 007 znosi dzienny limit 3 prób na osobę oraz 20 łącznie, zachowuje uwierzytelnianie i rejestr użycia. Przycisk Premium znajduje się w nagłówku obok profilu. Limity techniczne plików i dostawcy AI pozostają. Sprzedaż jest nadal wyłączona. Poniższy dokument opisuje wcześniejszą wersję bety; ta aktualizacja zastępuje zapisy o dziennym limicie AI.

## Fundament planów — migracja 008 (jeszcze niewdrożona)

Każde konto nadal ma Premium w becie. Migracja 008 dodaje tabele `plans` i `account_plans`, funkcję `my_plan()` oraz plan domyślny `premium_beta`, który zachowuje dzisiejsze zachowanie (bez limitu przedmiotów i AI, plik do 20 MB). Gotowe, ale nieprzypisane plany: `free` (5 przedmiotów, 3 próby AI dziennie — wartości robocze do zatwierdzenia) i `premium`. Limity AI i przedmiotów są egzekwowane w bazie na podstawie planu; limit miejsca (`storage_bytes`) jest tylko zapisany w konfiguracji i jeszcze nieegzekwowany. Pliki 500 MB nadal wymagają osobnego przepływu wysyłania. Użytkownik nie może zmienić planu z przeglądarki; przypisania wykonuje wyłącznie serwer (migracja lub webhook płatności). Przełączenie wszystkich kont na `free` to zmiana planu domyślnego, a nie zmiana kodu. Migrację uruchamiaj osobnym krokiem po sprawdzeniu historii migracji (w repozytorium brak pliku 006).

# Studeo — wdrożenie bety z biznesplanu z 26.10.2026

Decyzja właścicielki: bezpłatna beta, Premium później. Aktualizujemy istniejącą stronę; URL i projekt Supabase pozostają bez zmian. „Od zera do hakera” pozostaje kursem w bibliotece. Konto nie otrzymuje przedmiotów innego użytkownika.

## Dostępne w tej wersji

- Marka Studeo, ekran logowania i pulpit z otwartymi zadaniami, zajęciami na dziś i liczbą fiszek do powtórki.
- Własne przedmioty, pliki, notatki tekstowe i głosowe, kalendarz i zadania z dokumentacją — istniejące dane zachowane.
- Własne talie (pytanie | odpowiedź), ćwiczenia z notatek, istniejące generowanie opracowań AI z materiałów.
- Powtórki w odstępach dla prywatnych talii: ponownie za 10 min; trudne co najmniej 1 dzień; dobra odpowiedź początkowo po 3 dniach, łatwa po 7 dniach; kolejne odstępy rosną. To prosty harmonogram, nie model gwarantujący określone wyniki. Dotychczasowe „known” zachowane, starsze karty bez harmonogramu trafiają do pierwszej powtórki. Wspólny kurs Cyber zachowuje dotychczasowy tryb fiszek.
- Terminy zadań w kalendarzu, przejście do nauki przedmiotu, zadania dzienne i tygodniowe. Wykonanie przesuwa termin o jeden okres i dopisuje historię (100 ostatnich wykonań), nie usuwa notatek i plików.
- Ponawianie ćwiczeń z zachowaniem 20 ostatnich prób, zapis wyników na koncie.
- JSON wszystkich prywatnych wpisów (także archiwum) oraz postępów kursu. Załączniki binarne pobierane osobno; eksport nie jest automatycznym mechanizmem odtworzenia konta.
- Dokument HTML przedmiotu do wydruku i zapisu PDF w przeglądarce. Bez plików binarnych, zawiera teksty, fiszki, pytania i zadania.
- Ekran Beta i Premium wyraźnie oddziela działającą betę od planowanej oferty.

## Dane i zgodność wsteczna

Bez migracji tabel: nowe pola są dodatkami w istniejącym `student_entries.payload`, chronionym istniejącymi regułami RLS właściciela. Zapis używa istniejącej kontroli revision, aby konflikt między urządzeniami nie nadpisywał danych. Terminy fiszek zapisujemy jako UTC, pokazujemy w lokalnej strefie urządzenia. Nie zmieniamy identyfikatorów lekcji, fiszek kursu ani danych włoskiego.

Beta nie włącza płatności, reklam, nowych kont reklamowych, analityki marketingowej ani limitu 5 przedmiotów. Obowiązują aktualne limity techniczne 20 MB na plik, 5 minut nagrania i 3 próby AI dziennie (UTC). Nie obiecujemy obecnie 20 GB / 500 MB ani nielimitowanego AI. Dane nie służą do reklam.

## Kolejny etap — przed sprzedażą

1. Dane podmiotu sprzedającego, uzgodnione warunki i prywatność, prawa do materiałów wspólnego kursu. Nie traktować niniejszego pliku jako regulaminu ani porady prawnej.
2. Stripe lub inny operator: środowisko testowe, produkty/ceny, weryfikacja podpisów webhooków, idempotencja zdarzeń, cykl anulowania/wygaśnięcia oraz test zakupu i zwrotu. Uprawnienia Premium wyłącznie z serwera, nie z edytowalnych metadanych użytkownika.
3. Serwerowe limity: tabele planów i użycia, atomowe rezerwacje miejsca i AI, egzekwowanie po stronie bazy i Storage. Zachowanie istniejących danych po przekroczeniu limitu; blokowanie nowych zapisów ponad limit bez kasowania wcześniejszych plików.
4. Ustalić konkretne limity AI: biznesplan zawiera zarówno „duże”, jak i „nielimitowane”. Zalecany jawny limit zależny od budżetu. Dostawca AI i funkcja student-ai pozostają bez zmian w tej aktualizacji.
5. Pliki 500 MB wymagają osobnego przepływu wysyłania, limitów Storage, skanowania i kosztów. Nie przesyłać ich przez Worker o pamięci 128 MB. Skaner antywirusowy nie został dodany w becie.
6. Powiadomienia poza aplikacją (push/e-mail) wymagają mechanizmu dostarczania, preferencji i harmonogramu. Obecnie przypomnienia są na pulpicie i w kalendarzu po otwarciu aplikacji.
7. Usuwanie konta i plików wymaga uwierzytelnionej operacji serwerowej, czyszczenia Storage i obsługi zależności; obecne archiwum nie jest trwałym usuwaniem. Dodać przed publicznym komercyjnym startem.
8. Reklamy i CMP dopiero po wyborze dostawcy, akceptacji strony i konfiguracji zgód. Bez atrap reklam i pozornych zgód w obecnej wersji.
9. KPI, program poleceń i kody grupowe dopiero po przygotowaniu zgód, modelu nadużyć i rzeczywistych danych. Nie publikować wymyślonych wyników ani opinii.

## Sprawdzanie

`npm test`: zachowanie starego kursu, zapis/odtwarzanie, konflikty, RLS, prywatne zadania, ręczne fiszki, terminy powtórek, zadania powtarzalne, eksport i odizolowanie kont. `npm run build`: produkcyjna kompilacja strony i Workera. Testy AI są mockowane; ta aktualizacja nie potwierdza rzeczywistego wywołania modelu na zalogowanym koncie.
