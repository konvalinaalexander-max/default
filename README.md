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
- **Sprache**: Deutsch, Englisch, Ungarisch, Polnisch, Portugiesisch. Wird beim
  ersten Start über Flaggen gewählt und bleibt gespeichert.
- **Gebinde**: startet in jeder Anlieferung beim Standardwert `G2`. Weicht es ab,
  wird vor jedem Speichern nachgefragt — so bleibt eine einmalige Umstellung nicht
  unbemerkt für alle folgenden Paletten aktiv.
- **Lange Pause**: liegt die letzte Eingabe über eine Stunde zurück, fragt die App
  beim nächsten Öffnen, ob die Anlieferung noch läuft oder eine neue beginnt.

## Wie die Daten im Sheet geschützt sind

Die App soll das Erntejournal unter keinen Umständen beschädigen. Dafür sorgen vier
Ebenen, von "Fehler verhindern" bis "Fehler rückgängig machen":

**1. Die App fügt nur an.** Im Normalbetrieb schreibt sie ausschliesslich neue Zeilen
ans Ende (über die `append`-Funktion der Sheets-API). Bestehende Zeilen werden nur
angefasst, wenn jemand in der Übersicht ausdrücklich korrigiert oder löscht. Die
Kopfzeile ist grundsätzlich ausgeschlossen.

**2. Zeilenprüfung vor jeder Änderung.** Die App merkt sich, in welcher Zeile eine
Palette steht. Wird das Sheet zwischenzeitlich von Hand sortiert oder wird oben eine
Zeile eingefügt, zeigen diese Nummern plötzlich auf fremde Daten. Deshalb liest die
App die Zeile vor jedem Ändern oder Löschen erneut und vergleicht Person und Feld mit
dem erwarteten Inhalt. Bei Abweichung bricht sie ab und meldet den Grund, statt eine
unbeteiligte Zeile zu überschreiben.

**3. Wertprüfung auf dem Server.** Selbst wenn die App im Browser einen Fehler hätte,
weist der Server unsinnige Werte ab: fehlendes Datum, leere Textfelder, Gewicht
ausserhalb 0–5000 kg, Kistenzahl ausserhalb 1–500.

**4. Versionsverlauf von Google als Sicherheitsnetz.** Google Sheets speichert
automatisch jede Änderung und du kannst jeden früheren Stand wiederherstellen — das
ist eine vollständige, laufende Sicherung, die nichts kostet und nichts einzurichten
braucht. Ein zusätzliches eigenes Backup wäre dazu nur eine schlechtere Kopie.

### Im Notfall: früheren Stand wiederherstellen

1. Sheet öffnen → **Datei → Versionsverlauf → Versionsverlauf anzeigen**
2. Rechts den Zeitpunkt vor dem Problem auswählen (die Änderungen sind farblich markiert)
3. Oben auf **Diese Version wiederherstellen**

Der Versionsverlauf zeigt auch, *wer* was geändert hat. Schreibvorgänge der App
erscheinen unter der E-Mail-Adresse des Service Accounts — dadurch lässt sich immer
unterscheiden, ob eine Änderung von der App oder von einer Person kam.

### Empfehlung fürs Sheet

Wenn auf den Spalten Person, Feld oder Sorte eine Datenüberprüfung mit fester
Auswahlliste liegt, markiert Google jede in der App neu angelegte Bezeichnung rot als
"ungültig". Die Auswahl liefert inzwischen die App selbst, daher ist die Prüfung dort
verzichtbar: Spalte markieren → **Daten → Datenüberprüfung** → Regel entfernen.
Wer sie behalten will, stellt sie von "Eingabe ablehnen" auf "Warnung anzeigen" um.

## Entwicklung

```bash
npm run dev     # Entwicklungsserver
npm run build   # Produktions-Build
npm run lint    # ESLint
```

Tech-Stack: Next.js (App Router, TypeScript), Tailwind CSS, Google Sheets API
(`googleapis`) über einen Service Account, gehostet auf Vercel.
