# Elektro-Bud - analiza wymagań

# 1. Opis problemu

Elektro-Bud to średniej wielkości hurtownia materiałów elektrycznych i budowlanych, w której pracuje trzech magazynierów. Informacje o magazynie są w wielu różnych miejscach przez co:

- ciężko jest szybko ustalić gdzie znajduje się dany
- nie wiadomo ile jest aktualnie danego produktu na stanie
- łatwo wydać więcej produktu niż jest w magazynie
- nie ma logów przez co nie wiadomo kto co wydał

Klient chce stworzyć dedykowany system z kontami pracowników i rolami. Logowanie, role, kartoteka, stan magazynu, przejęcie/wydanie produktu, historia operacji i podstawowe raporty

# 2. Role

| Magazynier | Bieżąca obsługa magazynu: wyszukiwanie produktów i lokalizowanie ich, przyjęcie/wydanie 
| Kierownik magazynu | Przegląda stany i historię operacji, zarządza danymi produktów, korzysta z raportów
| Administrator | Zarządza kontami użytkowników, nadaje role, blokuje konta, pozwala resetować hasła

# 3. Wymagania funkcjonalne

Produkty:
- lista produktów z EAN, nazwą, kategorią, miejscem (sektor, regał, półka) i stanem
- dodawanie, edycja i usuwanie produktu
- EAN musi mieć 8 albo 13 cyfr, poprawną cyfrę kontrolną i nie może się powtarzać
- wyszukiwanie po EAN albo po kawałku nazwy

Magazyn:
- przyjęcie towaru zwiększa stan
- wydanie towaru zmniejsza stan
- nie da się wydać więcej niż jest na stanie
- każda operacja zapisuje kto, co, ile i kiedy
- historia operacji, najnowsze na górze

Konta:
- bez zalogowania nic nie widać, każdy ma swoje konto
- to co widać zależy od roli
- admin dodaje konta, zmienia role, blokuje i odblokowuje
- zapomniane hasło: admin daje hasło tymczasowe, a pracownik przy logowaniu musi ustawić swoje
- każdy może zmienić swoje hasło

Raporty (dla kierownika):
- podsumowanie stanów
- produkty z niskim stanem
- ile czego przyjęto i wydano
- ile operacji zrobił każdy pracownik

Dokładny zakres raportów trzeba jeszcze ustalić z klientem.

# 4. Wymagania niefunkcjonalne

- szybkość - wyszukiwanie ma działać w 1-2 s, u nas jest od razu bo wszystko liczy się w przeglądarce
- prostota - magazynier ma mieć prosty widok, komunikaty są po polsku
- stan nie może spaść poniżej zera - pilnuje tego baza (`CHECK (quantity >= 0)`)
- dwóch pracowników naraz - wydanie to jedno zapytanie `UPDATE ... WHERE quantity >= ?`, więc nie wydadzą razem więcej niż jest
- dane nie znikają po odświeżeniu ani zamknięciu przeglądarki
- hasła są zapisane jako skrót (PBKDF2-SHA256 + sól), nie da się ich odczytać
- przy złym loginie i złym haśle jest ten sam komunikat
- uprawnienia są sprawdzane w kodzie, a nie tylko przez ukrycie przycisków
- hasło ma min. 8 znaków, litery i cyfry
- kierownik może pracować poza magazynem - to strona w przeglądarce
- kod w TypeScript (tryb `strict`), podzielony na pliki

Ograniczenie: baza jest w przeglądarce, więc ktoś z dostępem do komputera może zajrzeć do `localStorage`. W prawdziwym systemie baza i logowanie byłyby na serwerze.

# 5. Baza danych

Baza to SQLite uruchomiony w przeglądarce (biblioteka sql.js). Ma 3 tabele:
- `users` - konta, role, skróty haseł
- `products` - produkty i stany
- `operations` - historia

Jak działa zapis w `localStorage`:
- zapis - po każdej zmianie cała baza idzie do `localStorage`
- odczyt - przy starcie baza jest wczytywana z `localStorage`
- brak danych - przy pierwszym uruchomieniu tworzy się nowa baza z kontami testowymi i produktami
- zepsute dane - tworzy się nowa baza i jest komunikat
- aktualizacja - przed każdą zmianą bierzemy najnowszą bazę, zmiany z innej karty od razu się pokazują

# 6. Konta testowe

- magazynier: `magazynier` / `magazynier123`
- magazynier: `magazynier2` / `magazynier123`
- kierownik: `kierownik` / `kierownik123`
- admin: `admin` / `admin123`
