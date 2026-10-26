export const LECTURE_MULTI = [
  {
    "id": "lecture-multi-1",
    "lesson": "w1-cia",
    "track": 1,
    "q": "Które pary zdarzenie — naruszona cecha CIA są poprawne?",
    "options": [
      "Nieuprawniona zmiana numeru konta — integralność",
      "Niedziałający serwer — dostępność",
      "Ujawnienie tajnych danych — poufność",
      "Zmiana treści faktury — wyłącznie dostępność"
    ],
    "answers": [
      0,
      1,
      2
    ],
    "why": "Integralność dotyczy nieuprawnionych zmian, dostępność możliwości użycia usługi, a poufność ochrony przed ujawnieniem.",
    "lessonTitle": "Wykład 1 • wybór wielu odpowiedzi"
  },
  {
    "id": "lecture-multi-2",
    "lesson": "w1-access",
    "track": 1,
    "q": "Które pary czynność — element AAA są poprawne?",
    "options": [
      "Sprawdzenie tożsamości — uwierzytelnianie",
      "Sprawdzenie uprawnienia do zmiany oceny — autoryzacja",
      "Sprawdzenie uprawnienia — kopia zapasowa",
      "Sprawdzenie tożsamości — autoryzacja"
    ],
    "answers": [
      0,
      1
    ],
    "why": "Uwierzytelnianie sprawdza tożsamość, autoryzacja sprawdza uprawnienia. Kopia zapasowa nie jest elementem AAA.",
    "lessonTitle": "Wykład 1 • wybór wielu odpowiedzi"
  },
  {
    "id": "lecture-multi-3",
    "lesson": "w1-types",
    "track": 1,
    "q": "Które pary zabezpieczenie — typ kontroli są poprawne?",
    "options": [
      "Odtworzenie danych z kopii — odtworzeniowy",
      "Odtworzenie danych z kopii — odstraszający",
      "Ochroniarz zastępujący niesprawny czytnik — kompensujący",
      "Zastąpienie niedostępnego zabezpieczenia — kompensujący"
    ],
    "answers": [
      0,
      2,
      3
    ],
    "why": "Odtworzenie przywraca normalną pracę. Kontrola kompensująca zastępuje niedostępne docelowe zabezpieczenie.",
    "lessonTitle": "Wykład 1 • wybór wielu odpowiedzi"
  },
  {
    "id": "lecture-multi-4",
    "lesson": "w2-symmetric",
    "track": 2,
    "q": "Które stwierdzenia o szyfrowaniu są prawdziwe?",
    "options": [
      "AES jest szyfrem symetrycznym",
      "Wiadomość dla odbiorcy można zaszyfrować jego kluczem publicznym",
      "Klucz prywatny odbiorcy należy udostępnić każdemu nadawcy",
      "SHA-256 jest szyfrem symetrycznym"
    ],
    "answers": [
      0,
      1
    ],
    "why": "AES jest symetryczny. W schemacie asymetrycznym nadawca korzysta z klucza publicznego odbiorcy, a prywatny pozostaje chroniony. SHA-256 jest funkcją skrótu.",
    "lessonTitle": "Wykład 2 • wybór wielu odpowiedzi"
  },
  {
    "id": "lecture-multi-5",
    "lesson": "w2-sign",
    "track": 2,
    "q": "Które pary czynność — klucz są poprawne?",
    "options": [
      "Tworzenie podpisu — klucz publiczny odbiorcy",
      "Tworzenie podpisu — klucz prywatny nadawcy",
      "Weryfikacja podpisu — klucz publiczny nadawcy",
      "Weryfikacja podpisu — wspólny klucz AES"
    ],
    "answers": [
      1,
      2
    ],
    "why": "Podpis tworzy nadawca swoim kluczem prywatnym, a weryfikuje się go pasującym kluczem publicznym nadawcy.",
    "lessonTitle": "Wykład 2 • wybór wielu odpowiedzi"
  },
  {
    "id": "lecture-multi-6",
    "lesson": "w2-hash",
    "track": 2,
    "q": "Które stwierdzenia o hashach są prawdziwe?",
    "options": [
      "Hash można zawsze odszyfrować kluczem prywatnym",
      "Hash nie jest szyfrogramem",
      "Kolizja oznacza różne wiadomości z takim samym skrótem",
      "Każdy hash jest kluczem AES"
    ],
    "answers": [
      1,
      2
    ],
    "why": "Hashowanie nie jest szyfrowaniem. Kolizja to jednakowy skrót dla dwóch różnych wejść; skrót nie jest automatycznie kluczem AES.",
    "lessonTitle": "Wykład 2 • wybór wielu odpowiedzi"
  }
];
