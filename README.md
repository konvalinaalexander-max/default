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

### 2. Die vier Zugangswerte bereitlegen

Diese vier Werte verbinden die App mit deinem Sheet. Leg sie dir kurz zur Seite —
eingetragen werden sie im nächsten Schritt bei Vercel.

| Wert | Wo du ihn findest |
| --- | --- |
| `GOOGLE_SHEET_ID` | In der Sheet-URL: `docs.google.com/spreadsheets/d/`**`DIESER_TEIL`**`/edit` |
| `GOOGLE_SHEET_TAB_NAME` | Der Name des Tabellenblatts — der Reiter unten links im Sheet, z.B. `Tabellenblatt1` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Der Wert von `client_email` in der JSON-Datei aus Schritt 1 |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Der Wert von `private_key` in derselben JSON-Datei, komplett von `-----BEGIN PRIVATE KEY-----` bis `-----END PRIVATE KEY-----` |

Zum privaten Schlüssel: Du kannst ihn genau so einfügen, wie er in der JSON-Datei
steht (also mit `\n` als Zeilenumbruch-Zeichen), oder als echten mehrzeiligen Text.
Die App kommt mit beidem zurecht.

> Der private Schlüssel ist ein Passwort. Nie in eine Chat-Nachricht, nie ins
> Repository, nie per Mail. Er gehört ausschliesslich in die JSON-Datei und in das
> Vercel-Formular aus Schritt 3.

### 3. Auf Vercel deployen und die Werte eintragen

1. Auf [vercel.com](https://vercel.com) mit dem GitHub-Konto einloggen.
2. **Add New… → Project** und dieses Repository auswählen.
3. Noch **vor** dem Deployen den Abschnitt **Environment Variables** aufklappen und
   die vier Werte aus Schritt 2 eintragen — jeweils Name links, Wert rechts.
4. Auf **Deploy** klicken. Nach ein bis zwei Minuten bekommst du eine Adresse wie
   `kuerbis-erntejournal.vercel.app`.

Wenn du die Werte erst nach dem ersten Deploy einträgst, findest du sie unter
**Projekt → Settings → Environment Variables**. Wichtig: Damit sie greifen, danach
einmal neu deployen (**Deployments → beim letzten Eintrag das `⋯`-Menü → Redeploy**).

### 4. QR-Code aushängen

Erzeuge mit einem beliebigen Online-QR-Generator einen Code, der auf deine
Vercel-Adresse zeigt, und häng ihn beim Wareneingang auf. Angestellte scannen ihn,
die App öffnet sich direkt im Browser. Über "Zum Startbildschirm hinzufügen" wird
daraus ein App-Icon auf dem Handy.

### Optional: lokal auf dem eigenen Rechner laufen lassen

Nur nötig, wenn du am Code entwickeln willst — für den normalen Betrieb kannst du
das überspringen. Kopiere dazu `.env.local.example` zu `.env.local`, trage dieselben
vier Werte ein und starte:

```bash
npm install
npm run dev
```

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
