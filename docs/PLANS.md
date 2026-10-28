# Plany i pliki

Migracja `011_account_storage.sql` wymaga 008 i 010. Nie uruchamiaj jej ponownie: jednorazowo przestawia obecne przypisania na premium_beta, ustawia Premium jako domyślne dla nowych kont. Nie usuwa plików, postępów ani treści. Zachowuje globalny limit AI z 010 (zapisany w `app_settings.ai_global_per_day`; 28.10.2026 ustawiony na 1000/dobę, zmiana jednym UPDATE).

- Basic (`free`): 5 000 000 000 bajtów, 5 użyć AI/dobę UTC.
- Premium i Premium beta: 20 000 000 000 bajtów, 100 użyć AI/dobę UTC.
- Bez limitu liczby przedmiotów w obu planach. Maksymalny plik nadal 20 MiB.
- Plan i przypisanie są odczytywane z serwera. Użytkownicy nie mogą ich edytować.
- `student_claim_ai` respektuje limity planu oraz niezależny globalny limit dostępności/kosztów. Nie zwiększamy globalnego budżetu automatycznie.

## Przechowywanie

Pliki w prywatnym bucket student-private. Rezerwacja miejsca przez student_reserve_upload odbywa się atomowo pod blokadą per konto. Każdy upload rezerwuje pełne 20 MiB (limit bucketa), co nie ufa rozmiarowi podanemu przez klienta. Po zakończeniu student_finish_upload zwalnia nadmiar; profil również rozlicza ukończone rezerwacje. Nowy plik potrzebuje co najmniej 20 MiB wolnego miejsca. Istniejące pliki bez rezerwacji są uwzględniane w zużyciu; nie wolno ich nadpisywać.

Rezerwacje przerwanych uploadów nie wygasają automatycznie (zapobiega to wyścigowi ze wciąż trwającym uploadem). Administrator może anulować taką rezerwację dopiero po potwierdzeniu zakończenia uploadu i nieobecności obiektu. Użytkownik widzi zarezerwowane miejsce. To konserwatywna ochrona przed przekroczeniem limitu, nie płatne zużycie.

Usuwanie: Storage API usuwa binarny plik; student_detach_file odłącza ścieżki i załączniki przy zachowaniu tekstu, kursów, notatek i wyników. Zwiększa revision aby starsze karty nie nadpisały zmian. Nie usuwaj rekordów storage.objects przez SQL — to nie usuwa binarnych obiektów. Archiwizacja nie zwalnia miejsca. Po obniżeniu planu istniejące dane zostają: blokowane są nowe uploady.

## Płatności — przyszły etap, obecnie wyłączone

Nie ma aktywnego checkoutu, cen, pobierania opłat ani sekretów Stripe. Ekran Premium jawnie pokazuje, że zakup będzie dostępny później. Nie włączaj sprzedaży samym przyciskiem ani adresem powrotu z checkoutu.

Przy uruchomieniu płatności skonfiguruj konto sprzedawcy, ceny, regulamin i politykę zwrotów oraz Stripe Checkout + Portal. Backend musi wyznaczać cenę i user_id z sesji; nigdy z danych przeglądarki. Dopiero podpisany webhook z idempotencją po event.id, weryfikacją customer/subscription/user i bieżącego statusu subskrypcji może aktualizować account_plans z service role. Obsłuż opłacenie, zaległości, anulowanie, koniec okresu i zdarzenia poza kolejnością; przechowuj billing mapping w tabeli niedostępnej dla API użytkownika. Testuj w Stripe test mode. Przy obniżeniu planu nie usuwaj danych.

Późniejsze przełączenie domyślnego planu na free i zakończenie bety wymaga oddzielnej decyzji właścicielki. Nie zmieniaj indywidualnych przypisań przez klienta ani metadane Auth.
