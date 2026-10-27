# Elektro-Bud - aplikacja magazynowa

Projekt na przedmiot Programowanie aplikacji zaawansowanych webowych. Aplikacja w TypeScript do magazynu hurtowni Elektro-Bud.

Co jest:
- logowanie i role: magazynier, kierownik, admin
- produkty z miejscem w magazynie (sektor, regał, półka)
- wyszukiwanie po EAN albo nazwie
- przyjęcie i wydanie towaru
- historia operacji i raporty
- konta użytkowników i reset hasła

Dane są w bazie SQL (SQLite przez sql.js) a baza zapisuje się w `localStorage`.

# Uruchomienie

Otwórz `index.html` w przeglądarce

Po zmianach w `src/` trzeba skompilować:

```bash
npx tsc
```

# Wersja na Windows (WPF)

W folderze `wpf/` jest program WPF (.NET 9) który pokazuje tę samą stronę w oknie Windows przez WebView2 (silnik Edge). Kod strony jest ten sam. Baza zapisuje się w `%LOCALAPPDATA%\ElektroBud`.

```bash
cd wpf
dotnet run
```

# Konta testowe

- magazynier: `magazynier` / `magazynier123` - wyszukiwanie, przyjęcie, wydanie
- magazynier: `magazynier2` / `magazynier123`
- kierownik: `kierownik` / `kierownik123` - produkty, historia, raporty
- admin: `admin` / `admin123` - konta, role, blokowanie, reset hasła

# Jak sprawdzić

1. Zaloguj się jako `magazynier` przyjmij i wydaj towar.
2. Zaloguj się jako `kierownik` - w historii i raportach widać co zrobił magazynier.
3. Jako `admin` zresetuj hasło magazyniera - przy logowaniu trzeba będzie ustawić nowe.
4. Odśwież stronę - dane zostają.
5. Przycisk „Przywróć bazę przykładową” u admina tworzy bazę od nowa.
"# zadad" 
