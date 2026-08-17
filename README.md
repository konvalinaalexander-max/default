# Kürbis Erntejournal

Mobile-first Web-App für die Palettenerfassung beim Wareneingang. Angestellte tragen
pro Palette nur noch **Anzahl Kisten** und **Gewicht** ein — Datum, Person, Feld und
Sorte werden einmal pro Anlieferung gesetzt und im Hintergrund für jede Zeile
automatisch mit ins Google Sheet geschrieben. Eine Plausibilitätsprüfung warnt, wenn
das Gewicht für die angegebene Kistenanzahl ungewöhnlich abweicht.

## Setup

Drei Dinge müssen einmalig eingerichtet werden: ein Google Service Account (damit die
App ohne Login der Angestellten ins Sheet schreiben kann), die `.env`-Werte, und das
Hosting auf Vercel.

### 1. Google Service Account erstellen

Ein Service Account ist ein "Roboter-Konto" von Google, das nur für diese App Zugriff
auf genau ein Sheet bekommt — die Angestellten müssen sich nirgends einloggen.

1. Gehe zur [Google Cloud Console](https://console.cloud.google.com/) und erstelle
   ein neues Projekt (z.B. "Kuerbis Erntejournal").
2. Aktiviere in diesem Projekt die **Google Sheets API**
   (Menü → APIs & Dienste → Bibliothek → "Google Sheets API" suchen → Aktivieren).
3. Gehe zu **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → Dienstkonto**.
   Name frei wählbar (z.B. "erntejournal-app"). Rollen können leer bleiben, wir geben
   den Zugriff direkt im Sheet.
4. Öffne das erstellte Dienstkonto → Tab **Keys → Add Key → Create new key → JSON**.
   Es lädt eine JSON-Datei herunter — die brauchst du gleich für die Umgebungsvariablen.
5. In der JSON-Datei stehen `client_email` und `private_key`. Öffne dein Google Sheet
   und teile es (Button "Freigeben") mit genau dieser `client_email`-Adresse, Rolle
   **Bearbeiter**.

### 2. Umgebungsvariablen setzen

Kopiere `.env.local.example` zu `.env.local` und trage ein:

- `GOOGLE_SHEET_ID`: aus der Sheet-URL
  (`https://docs.google.com/spreadsheets/d/DIESER_TEIL/edit`)
- `GOOGLE_SHEET_TAB_NAME`: Name des Tabellenblatts (Tab-Reiter unten im Sheet)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: der `client_email`-Wert aus der JSON-Datei
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: der komplette `private_key`-Wert aus der
  JSON-Datei, inklusive `-----BEGIN PRIVATE KEY-----`/`-----END PRIVATE KEY-----`.
  Die `\n` in der JSON-Datei so belassen wie sie sind (nicht durch echte
  Zeilenumbrüche ersetzen) — der Code wandelt sie selbst um.

Danach lokal testen:

```bash
npm install
npm run dev
```

### 3. Hosting auf Vercel

1. Auf [vercel.com](https://vercel.com) mit GitHub einloggen, dieses Repository
   importieren ("Add New… → Project").
2. Bei den Projekteinstellungen unter **Environment Variables** dieselben vier Werte
   wie in `.env.local` eintragen.
3. Deployen. Du bekommst eine Adresse wie `kuerbis-erntejournal.vercel.app`
   (später kann eine eigene Domain verbunden werden).
4. Einen QR-Code erzeugen, der auf diese Adresse zeigt (z.B. mit einem beliebigen
   Online-QR-Generator), und beim Wareneingang aushängen. Angestellte scannen ihn,
   die App öffnet sich direkt im Browser — "Zum Homescreen hinzufügen" macht daraus
   ein App-Icon fürs Handy.

## Funktionsweise

- **Neue Anlieferung**: Datum, Person, Feld, Sorte einmal festlegen (Dropdown mit
  bisherigen Werten aus dem Sheet, oder neu hinzufügen).
- **Wiegen**: pro Palette nur noch Gewicht + Anzahl Kisten eintragen, "Weiter"
  speichert die Zeile im Hintergrund ins Sheet und öffnet direkt die nächste Palette.
- **Plausibilitätsprüfung**: weicht das Gewicht pro Kiste stark vom bisherigen
  Durchschnitt dieser Sorte ab, fragt die App vor dem Speichern nochmal nach.
- **Übersicht** (oben rechts erreichbar): alle Paletten dieser Anlieferung, einzeln
  korrigierbar oder löschbar; Einstellungen (Datum/Person/Feld/Sorte) lassen sich
  nachträglich ändern — wahlweise nur für neue Paletten oder rückwirkend für alle
  bereits erfassten dieser Anlieferung.

## Entwicklung

```bash
npm run dev     # Entwicklungsserver
npm run build   # Produktions-Build
npm run lint    # ESLint
```

Tech-Stack: Next.js (App Router, TypeScript), Tailwind CSS, Google Sheets API
(`googleapis`) über einen Service Account, gehostet auf Vercel.
