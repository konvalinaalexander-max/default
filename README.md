# Kürbis Erntejournal

Mobile-first Web-App für die Palettenerfassung beim Wareneingang. Angestellte tragen
pro Palette nur noch **Anzahl Kisten** und **Gewicht** ein — Datum, Person, Schlag und
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

### 2. Die drei Zugangswerte bereitlegen

Diese drei Werte verbinden die App mit deinem Sheet. Die Namen der Tabellenblätter sind
fest eingebaut (`Ertragsjournal`, `Anbauplanung Ertrag`, `Referenzwerte`) und brauchen
keine Umgebungsvariable — eine noch gesetzte `GOOGLE_SHEET_TAB_NAME` wird ignoriert und
darf stehen bleiben. Leg sie dir kurz zur Seite —
eingetragen werden sie im nächsten Schritt bei Vercel.

| Wert | Wo du ihn findest |
| --- | --- |
| `GOOGLE_SHEET_ID` | In der Sheet-URL: `docs.google.com/spreadsheets/d/`**`DIESER_TEIL`**`/edit` |
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
   die drei Werte aus Schritt 2 eintragen — jeweils Name links, Wert rechts.
4. Auf **Deploy** klicken. Nach ein bis zwei Minuten bekommst du eine Adresse wie
   `kuerbis-erntejournal.vercel.app`.

Wenn du die Werte erst nach dem ersten Deploy einträgst, findest du sie unter
**Projekt → Settings → Environment Variables**. Wichtig: Damit sie greifen, danach
einmal neu deployen (**Deployments → beim letzten Eintrag das `⋯`-Menü → Redeploy**).

### 4. Das Dokument einrichten

Einmalig, direkt aus der App: **Übersicht → ⚙ Einstellungen → 🛠 Sheet einrichten**,
Passwort eingeben. Die Funktion läuft auf dem Server mit den Zugangsdaten aus Schritt 2,
es muss also kein Schlüssel von Hand irgendwohin kopiert werden.

Zieh vorher im Sheet einmal **Datei → Herunterladen** — die Funktion legt zwar selbst
eine Sicherungskopie als Tabellenblatt an, aber bei einem Eingriff in die Produktivdaten
soll unabhängig davon eine Datei bei dir liegen.

Was dabei passiert:

- Dokument wird auf **Kürbis Anbauplanung Journal Ertrag** umbenannt
- Das bestehende Tabellenblatt wird zu **Ertragsjournal**, Spaltenköpfe korrigiert
  (`Feld` → `Schlag`, die berechneten Spalten von `Brutto` auf `Netto`), Spalte K für die
  Palettenkennung angelegt und ausgeblendet
- Eine Sicherungskopie **Ertragsjournal Sicherung** wird angelegt
- **Anbauplanung Ertrag** wird angelegt: Hinweis in Zeile 1, Spaltenköpfe in Zeile 2,
  Schlag-Sorte-Paare ab Zeile 3, Ertragsformeln in Spalte C, Kontrollwert in E1
- **Referenzwerte** wird angelegt und aus dem bisherigen Journal gefüllt
- Kopfzeilen werden eingefroren und mit einer Warnung geschützt
- Netto-Formeln in leeren Zeilen werden entfernt (sie ergaben je −25 kg)

Die Funktion ist **wiederholbar**: Jeder Schritt prüft vorher, ob er nötig ist, und
Datenzeilen werden nie gelöscht. Sie bricht ab, statt zu schreiben, wenn das
Tabellenblatt nicht wie das Ertragsjournal aussieht.

### 5. QR-Code aushängen

Erzeuge mit einem beliebigen Online-QR-Generator einen Code, der auf deine
Vercel-Adresse zeigt, und häng ihn beim Wareneingang auf. Angestellte scannen ihn,
die App öffnet sich direkt im Browser. Über "Zum Startbildschirm hinzufügen" wird
daraus ein App-Icon auf dem Handy.

### Optional: lokal auf dem eigenen Rechner laufen lassen

Nur nötig, wenn du am Code entwickeln willst — für den normalen Betrieb kannst du
das überspringen. Kopiere dazu `.env.local.example` zu `.env.local`, trage dieselben
drei Werte ein und starte:

```bash
npm install
npm run dev
```

## Funktionsweise

- **Neue Anlieferung**: Datum, Person, Schlag, Sorte einmal festlegen. Person ist frei
  eingebbar. **Schlag und Sorte kommen ausschliesslich aus der Anbauplanung** — damit die
  Schreibweise mit dem Plan übereinstimmt und die Erträge zusammengerechnet werden können.
  Die Sortenauswahl zeigt nur, was auf dem gewählten Schlag steht.
- **Neuen Schlag oder eine neue Sorte anlegen**: `+++ Neu +++` am Ende des Dropdowns,
  danach Passwortabfrage. Gedacht für den Betriebsleiter. Ein neuer Schlag verlangt gleich
  eine Sorte, sonst liesse er sich nicht bewiegen. Die Zeile wird in die Anbauplanung
  geschrieben; ohne Netz wartet sie und wird beim nächsten Start nachgetragen.
- **Wiegen**: pro Palette nur noch Gewicht + Anzahl Kisten eintragen, "Weiter"
  speichert die Zeile im Hintergrund ins Sheet und öffnet direkt die nächste Palette.
- **Plausibilitätsprüfung**: weicht das Gewicht pro Kiste stark vom bisherigen
  Durchschnitt dieser Sorte ab, fragt die App vor dem Speichern nochmal nach.
- **Übersicht** (oben rechts erreichbar): alle Paletten dieser Anlieferung, einzeln
  korrigierbar oder löschbar; Einstellungen (Datum/Person/Schlag/Sorte) lassen sich
  nachträglich ändern — wahlweise nur für neue Paletten oder rückwirkend für alle
  bereits erfassten dieser Anlieferung.
- **Sprache**: Deutsch, Englisch, Ungarisch, Polnisch, Portugiesisch. Wird beim
  ersten Start über Flaggen gewählt und bleibt gespeichert.
- **Gebinde**: startet in jeder Anlieferung beim Standardwert `G2`. Weicht es ab,
  wird vor jedem Speichern nachgefragt — so bleibt eine einmalige Umstellung nicht
  unbemerkt für alle folgenden Paletten aktiv.
- **Lange Pause**: liegt die letzte Eingabe über eine Stunde zurück, fragt die App
  beim nächsten Öffnen, ob die Anlieferung noch läuft oder eine neue beginnt.

## Die drei Tabellenblätter

| Blatt | Inhalt |
| --- | --- |
| `Ertragsjournal` | Zeile 1 Hinweis, Zeile 2 Köpfe, ab Zeile 3 eine Zeile pro Palette. Spalten A–H von der App bzw. von Hand, I und J als Formel (Netto), K die Palettenkennung (ausgeblendet) |
| `Anbauplanung Ertrag` | Schlag, Sorte, Ertrag. Zeile 1 Hinweis, Zeile 2 Köpfe, Daten ab Zeile 3 |
| `Referenzwerte` | Je Sorte die aufsummierten Paletten, Kisten und Kilos |
| `Read Me` | Kurzanleitung im Dokument selbst — was beim Saisonstart wichtig ist |

**Der Ertrag ist eine Formel**, kein von der App geschriebener Wert:

```
=SUMIFS(Ertragsjournal!$I:$I; Ertragsjournal!$C:$C; $A3; Ertragsjournal!$D:$D; $B3)
```

Deshalb wirkt jede Korrektur im Journal sofort im Ertrag — egal ob sie aus der App kam
oder von Hand im Sheet gemacht wurde. Es gibt keinen Weg, auf dem die beiden Blätter
auseinanderlaufen könnten, weil es nur eine Datenquelle gibt.

**Der Kontrollwert in E1** zeigt `Nicht zugeordnet: 0 kg`. Steht dort etwas anderes, gibt
es Paletten, deren Schlag-Sorte-Kombination nicht in der Planung steht — etwa nach einem
Umbenennen oder einem Tippfehler. Ein Blick genügt.

**Die Referenzwerte werden nur fortgeschrieben, nie neu berechnet.** Das ist Absicht:
Wird das Journal am Saisonstart geleert, ergäbe eine Neuberechnung null Proben und würde
das Wissen der Vorjahre überschreiben. So startet eine Sorte im neuen Jahr mit dem Wert,
den sie letztes Jahr hatte, statt wieder bei null.

## Saisonwechsel

Es braucht keine Funktion in der App. Der Betriebsleiter arbeitet direkt im Sheet:

1. Im `Ertragsjournal` die Zeilen **ab Zeile 3** löschen (Zeile 1 Hinweis und Zeile 2
   Köpfe stehen lassen). Wer die Vorjahresdaten behalten will, kopiert sie vorher heraus
   oder dupliziert den Tab.
2. In `Anbauplanung Ertrag` die Zeilen **ab Zeile 3** löschen und die neue Planung direkt
   darunter einfügen — nur Spalte A und B, ohne Leerzeile.

Eine Kurzfassung davon steht auch im Blatt `Read Me` direkt im Dokument.

Die App kommt damit **ohne Knopfdruck** zurecht: Sie hängt neue Paletten immer unter den
letzten Eintrag (ist alles gelöscht, wieder ab Zeile 3), liest die Planung bei jedem Start
neu, und **ergänzt fehlende Ertragsformeln beim Öffnen von selbst**. Die Referenzwerte
bleiben unangetastet. Der Knopf „Sheet einrichten" ist dafür nicht nötig.

Die Leergewichte der Gebindearten stehen in `src/lib/constants.ts` (`GEBINDEARTEN`) —
G2 1,5 kg, IFCO 6410 1,36 kg, 6416 1,68 kg, 6424 2,0 kg, Palette 25 kg. Ändern sie sich,
ist das die einzige Stelle.

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
App die Zeile vor jedem Ändern oder Löschen erneut und vergleicht die Palettenkennung mit
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

Wenn auf den Spalten Person, Schlag oder Sorte eine Datenüberprüfung mit fester
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
