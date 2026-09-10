# Integrations-Handbuch — Kürbis-Erntejournal

> Dieses Dokument richtet sich an eine **andere KI / ein anderes Projekt**, das mit dieser
> Web-App bzw. ihren Daten arbeiten soll. Es beschreibt vollständig und präzise, was die
> App tut, wie die Daten strukturiert sind, welche Schnittstellen es gibt und wie man die
> Daten korrekt liest. Am Ende steht eine Empfehlung, wie ein neues, datenkonsumierendes
> Projekt am besten andockt.

**Repository:** `https://github.com/konvalinaalexander-max/default`
**Aktiver Branch (= Default-Branch):** `claude/claude-code-online-xpgf9b`

---

## 1. Was die App ist (in einem Satz)

Eine mobile-first Web-App zur **Palettenerfassung beim Wareneingang von Kürbissen**:
Erntehelfer geben pro Palette nur **Gewicht** und **Anzahl Kisten** ein; alles andere
(Datum, Person, Schlag, Sorte, Gebindeart) wird einmal pro Anlieferung gesetzt. Jede
Palette wird als Zeile in ein **Google Sheet** geschrieben. Es gibt keine Datenbank —
**das Google Sheet IST die Datenbank und die einzige Quelle der Wahrheit.**

## 2. Fachbegriffe

- **Schlag** = ein Feld/Anbaufläche (z. B. „Slowgrow Uster“). Früher hiess das im Code
  „Feld“; heute durchgängig „Schlag“, passend zur Anbauplanung.
- **Sorte** = Kürbissorte (z. B. „Lekor“, „Kaori Kuri“).
- **Palette** = eine Erfassungseinheit: eine Europalette mit mehreren gleichen Kisten.
- **Gebinde / Kiste** = die Gebinde auf der Palette. Standard ist „G2“; alternativ
  IFCO-Kisten oder ein „Holz Palox“ (Grosskiste, ein Gebinde statt vieler).
- **Anlieferung / Session** = ein Lastwagen bzw. eine Erfassungssitzung; für alle Paletten
  dieser Session gelten dieselben Kopfangaben (Datum/Person/Schlag/Sorte).
- **Netto** = Gewicht der Kürbisse ohne Palette und ohne Leergut der Kisten.

## 3. Technischer Stack & Betrieb

- **Next.js 16** (App Router), **React 19**, TypeScript, Tailwind. Einzige Laufzeit-
  Abhängigkeit ausser Next/React: **`googleapis`**.
- Gehostet auf **Vercel**. Server-Routen (`/api/*`) laufen serverseitig und sprechen über
  ein **Google-Service-Account** mit dem Sheet.
- **Kein State auf dem Server.** Der Client hält die laufende Anlieferung in
  `localStorage`. Das Backend ist zustandslos; jede Anfrage liest/schreibt direkt im Sheet.
- Umgebungsvariablen (in Vercel gesetzt):
  - `GOOGLE_SHEET_ID` — die ID des Dokuments (aus der Sheet-URL).
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — `client_email` des Service Accounts.
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — `private_key` des Service Accounts (mit `\n`).
  - `GOOGLE_SHEET_DATE_FORMAT` — optional, `de` (Standard, `TT.MM.JJJJ`) oder `iso`.
  - Die **Tab-Namen sind fest im Code** verdrahtet (nicht per Env). Eine evtl. noch
    gesetzte `GOOGLE_SHEET_TAB_NAME` wird ignoriert.
- OAuth-Scope des Service Accounts: `https://www.googleapis.com/auth/spreadsheets`.

## 4. Das Google Sheet — Datenmodell (WICHTIGSTER TEIL)

Ein Dokument mit dem Titel **„Kürbis Anbauplanung Journal Ertrag“** und vier
Tabellenblättern. Namen sind exakt so, mit Leerzeichen:

### 4.1 Tab `Ertragsjournal` — das chronologische Journal

- **Zeile 1:** ein verbundener Hinweistext (Saisonstart-Anleitung). Keine Daten.
- **Zeile 2:** Spaltenköpfe.
- **Ab Zeile 3:** je eine Zeile pro erfasster Palette, chronologisch (neue unten).

Spalten (1-indexiert, A = 1):

| Sp. | Kopf | Inhalt | Wer schreibt |
|----|------|--------|--------------|
| A | Datum | `TT.MM.JJJJ` (bzw. ISO je nach Env) | App |
| B | Person | Name des Erntehelfers (freier Text) | App |
| C | Schlag | muss zur Anbauplanung passen | App |
| D | Sorte | muss zur Anbauplanung passen | App |
| E | Gewicht brutto [kg] | Rohgewicht ab Waage (Zahl) | App |
| F | Anzahl Gebinde | Anzahl Kisten (ganze Zahl) | App |
| G | Gebindeart (leer = G2) | `""`/`G2`/`IFCO 6410`/`IFCO 6416`/`IFCO 6424`/`Holz Palox` | App |
| H | Bemerkung | optional | App |
| I | Netto pro Palette [kg] | **Formel** `=E{r}-25-F{r}*{tara}`, beim Grossgebinde ohne `-25` | App (Formel) |
| J | Netto pro Kiste [kg] | **Formel** `=I{r}/F{r}` | App (Formel) |
| K | ID (App) | eindeutige Palettenkennung, Spalte ausgeblendet | App |

**Netto-Berechnung (Kernformel):**
```
netto_pro_palette = brutto − palettenTara(gebindeart) − anzahlKisten × tara(gebindeart)
netto_pro_kiste   = netto_pro_palette / anzahlKisten
```
- `palettenTara(gebindeart)` = `25` kg angenommenes **Palettengewicht**
  (`PALETTE_TARA_KG`) — aber **`0` beim Grossgebinde**: Ein Holz Palox wird vom Stapler
  direkt angehoben, unter ihm liegt keine Palette. Die Formel in Spalte I lautet dort
  entsprechend `=E{r}-F{r}*45`.
- `tara(gebindeart)` = Leergewicht **eines** Gebindes:
  | Gebindeart | tara [kg] | |
  |-----------|-----------|--|
  | G2 (Standard, auch bei leerem Feld) | 1.5 | |
  | IFCO 6410 | 1.36 | |
  | IFCO 6416 | 1.68 | |
  | IFCO 6424 | 2.0 | |
  | Holz Palox | 45 | Grossgebinde |
  Unbekannte/Alt-Bezeichnungen werden über ein Schlüsselwort erkannt: die Modellnummer
  (z. B. „IFCO 6410 schwarz“) bzw. „Palox“ (z. B. „Palox Holz“); sonst gilt G2.
- **Grossgebinde:** Beim `Holz Palox` steht in Spalte F immer `1` — die App fragt dort
  gar nicht nach einer Anzahl, weil der Palox einzeln gewogen wird und die Kürbisse
  unsortiert darin liegen. `netto_pro_kiste` (Spalte J) ist damit das Netto **des ganzen
  Palox** (rund 250–350 kg) und nicht mit dem Wert einer Kiste (rund 12 kg) vergleichbar.
  Wer über Spalte J auswertet, muss die beiden Gebindeklassen trennen — Kriterium ist
  Spalte G.

> **Für Datenkonsumenten:** Verlasst euch für „Netto“ auf Spalte **I** (bzw. rechnet die
> Formel selbst nach). Spalte E ist **brutto**. Die Netto-Formeln stehen nur in echten
> Datenzeilen; leere Zeilen tragen keine Formel.

### 4.2 Tab `Anbauplanung Ertrag` — Planung + aufsummierter Ertrag

- **Zeile 1:** verbundener Hinweistext; in **E1** ein Kontrollwert (Formel, s. u.).
- **Zeile 2:** Spaltenköpfe.
- **Ab Zeile 3:** je eine Zeile pro **Schlag-Sorte-Kombination**.

| Sp. | Kopf | Inhalt |
|----|------|--------|
| A | Schlag | z. B. „Slowgrow Uster“ |
| B | Sorte | z. B. „Lekor“ |
| C | Ertrag [kg netto] | **Formel**, summiert das Journal |

Die Ertragsformel in C (englische ODER deutsche Funktionsnamen, je nach Sprach-Region des
Dokuments — die App ermittelt das automatisch):
```
=SUMIFS(Ertragsjournal!$I:$I; Ertragsjournal!$C:$C; $A{r}; Ertragsjournal!$D:$D; $B{r})
```
D. h. **Ertrag = Summe aller Netto-Kilos im Journal für genau diesen Schlag + diese Sorte.**
Weil es eine Formel ist, wirkt jede Korrektur im Journal sofort im Ertrag.

**Kontrollwert E1:**
```
="Nicht zugeordnet: " & ROUND(
   SUMIFS(Ertragsjournal!$I:$I; Ertragsjournal!$C:$C;"<>"; Ertragsjournal!$D:$D;"<>")
   − SUM(C{3}:C10000), 1) & " kg"
```
Zeigt normal `Nicht zugeordnet: 0 kg`. Ein anderer Wert bedeutet: es gibt Journalzeilen,
deren Schlag-Sorte-Kombination in der Planung fehlt (Tippfehler / Umbenennung).

### 4.3 Tab `Referenzwerte` — kumulierte Erfahrungswerte je Sorte

- **Zeile 1:** Spaltenköpfe. **Ab Zeile 2:** je eine Zeile pro Sorte.
- **Grossgebinde stehen in einer eigenen Zeile** mit dem Namen `<Sorte> (Holz Palox)`.
  Grund: `⌀ kg/Kiste` mischt sonst rund 300 kg pro Palox mit rund 12 kg pro Kiste und
  wird für beide unbrauchbar. Spalte A ist deshalb **nicht** immer ein reiner Sortenname.

| Sp. | Kopf | Inhalt |
|----|------|--------|
| A | Sorte | |
| B | Paletten | kumulierte Anzahl Paletten (über alle Jahre) |
| C | Kisten | kumulierte Anzahl Kisten |
| D | Netto kg | kumulierte Netto-Kilos |
| E | ⌀ kg/Kiste | D / C |
| F | Letzte Änderung | ISO-Datum |

**Wichtige Eigenschaft:** Dieses Blatt wird **nur fortgeschrieben, nie neu berechnet**.
Nach jeder erfassten Palette wird die Zeile der Sorte inkrementiert (oder neu angelegt,
falls die Sorte noch nicht existiert). Es überlebt damit das Leeren des Journals am
Saisonstart — es ist das „Langzeitgedächtnis“ über Jahre. **Reine Werte, keine Formeln.**

### 4.4 Tab `Read Me`

Menschenlesbare Kurzanleitung im Dokument selbst (Saisonstart, Regeln). Für Maschinen
irrelevant.

### 4.5 Weitere mögliche Tabs

- `Ertragsjournal Sicherung` — evtl. vorhandene einmalige Sicherungskopie (kann fehlen).

## 5. Wie die App schreibt (Semantik, für Datenkonsistenz relevant)

- **Anhängen (neue Palette):** über die native Sheets-`append`-API auf `A:H`. Findet das
  Ende der Tabelle und hängt darunter an — auch wenn das Journal geleert wurde, beginnt es
  automatisch wieder in Zeile 3. Danach werden I/J (Formeln) und K (ID) gesetzt.
- **Struktur-unabhängiges Lesen:** Die App erkennt Datenzeilen daran, dass E (Gewicht) und
  F (Kisten) Zahlen > 0 sind — nicht an einer festen Startzeile. Hinweis- und Kopfzeile
  werden dadurch immer übersprungen.
- **Palettenkennung (Spalte K):** verhindert Doppelzeilen bei Wiederholversuchen nach
  Verbindungsabbruch und schützt Korrekturen davor, nach einem Löschen im Sheet eine
  fremde Zeile zu treffen. Vor jedem Ändern/Löschen wird über die ID die richtige Zeile
  verifiziert.
- **Referenzwerte** werden bei jeder Palette fortgeschrieben (s. 4.3).

## 6. HTTP-API der App

Basis-URL = die Vercel-Adresse der App. Alle Antworten sind JSON. Fehler:
`{ "error": "<text>" }` mit Status 400/403/500.

### GET `/api/reference` — Stammdaten & Statistik (LESEN, ohne Auth)

Liefert die Auswahl-Stammdaten und aggregierte Statistik. **Enthält KEINE Roh-Journalzeilen
und KEINE Ertragssummen** — dafür direkt das Sheet lesen (s. 7). Nebenwirkung: ergänzt
fehlende Ertragsformeln in der Anbauplanung (self-healing).

Antwort-Form (`ReferenceData`):
```jsonc
{
  "personen": ["Csaba Fancsali", ...],        // aus Journalzeilen abgeleitet
  "schlaege": ["Slowgrow Uster", ...],         // NUR aus der Anbauplanung
  "sortenNachSchlag": { "Slowgrow Uster": ["Lekor","Kaori Kuri", ...], ... },
  "sorten": ["Amoro", ...],                    // alle Sorten der Planung
  "gebindearten": ["G2","IFCO 6410","IFCO 6416","IFCO 6424","Holz Palox"],
  "sortenStats": {                             // aus der LAUFENDEN Saison (Journal)
    "Lekor": { "medianProKiste": 10.2, "madProKiste": 0.4, "anzahlProben": 81 }, ...
  },
  "allgemeineStats": { "medianProKiste": 11.4, "madProKiste": 1.6, "anzahlProben": 295 },
  "vorwissen": {                               // aus Referenzwerte-Blatt (über Jahre)
    "Lekor": { "mittelProKiste": 10.2, "anzahlProben": 81 }, ...
  },
  "allgemeinesVorwissen": { "mittelProKiste": 11.4, "anzahlProben": 295 },
  "planungGelesen": true,                      // false = Anbauplanung nicht lesbar
  "formelnFehlen": false                       // intern (self-heal-Signal)
}
```

### POST `/api/paletten` — neue Palette anhängen

Body = `PaletteEntry` (s. 8) plus optional `istWiederholung: boolean`.
Antwort: `{ "sheetRow": <number> }` (die geschriebene Zeilennummer). Serverseitige
Validierung: Datum `YYYY-MM-DD`, Person/Schlag/Sorte/Gebindeart nicht leer und ≤100 Zeichen,
`gewichtBrutto` 0–5000, `anzahlKisten` ganze Zahl 1–500. Schreibt zusätzlich die
Referenzwerte fort.

### PATCH `/api/paletten/[row]` — Palette in Zeile `row` korrigieren

Body = vollständiger `PaletteEntry` (inkl. `id`). Antwort `{ "ok": true }`. Nutzt die ID,
um die richtige Zeile zu verifizieren.

### DELETE `/api/paletten/[row]` — Palette löschen

Body = erwarteter `PaletteEntry` (zur Verifikation). Antwort `{ "ok": true }`.

### PATCH `/api/paletten/batch` — Kopffelder mehrerer Zeilen ändern

Body: `{ "updates": [{ "sheetRow", "datum", "person", "schlag", "sorte" }, ...] }`
(rückwirkende Korrektur von Datum/Person/Schlag/Sorte). Antwort `{ "ok": true }`.

### POST `/api/planung` — Schlag-Sorte-Paar in die Anbauplanung eintragen

Body: `{ "schlag", "sorte", "passwort" }`. **Passwort erforderlich** (`"Sammy"`), sonst 403.
Legt das Paar an (idempotent) und ergänzt die Ertragsformel.

### POST `/api/einrichten` — Dokument einrichten/reparieren

Body: `{ "passwort": "Sammy" }`. Legt Blätter/Köpfe/Formeln/Schutz an; idempotent;
löscht nie Datenzeilen. Nur zum Aufsetzen/Reparieren, nicht für den Datenfluss relevant.

## 7. Empfohlener Weg, um Daten zu KONSUMIEREN

Ein neues Projekt, das **Erntedaten auswertet**, sollte **das Google Sheet direkt lesen**,
nicht die App-API — denn `/api/reference` liefert nur Stammdaten/Statistik, nicht die
Rohzeilen und nicht die Ertragssummen.

**Vorgehen:**
1. Das neue Projekt bekommt **einen eigenen (Read-only genügt) Google-Service-Account**
   oder darf denselben nutzen. Das Sheet wird mit dessen `client_email` geteilt
   (Leser reicht).
2. Über die Google Sheets API (`spreadsheets.values.get`) lesen:
   - **`Ertragsjournal!A3:K`** → jede Palette einzeln (Rohdaten; Netto in Spalte I).
   - **`Anbauplanung Ertrag!A3:C`** → fertige **Ertragssumme je Schlag+Sorte** (Spalte C).
   - **`Referenzwerte!A2:F`** → kumulierte Kennzahlen je Sorte über die Jahre.
3. Datenzeilen im Journal daran erkennen, dass E und F Zahlen > 0 sind (Hinweis-/Kopfzeile
   überspringen). Für aufgelöste Formelwerte `valueRenderOption: UNFORMATTED_VALUE` nutzen.

Alternativ, wenn nur Stammdaten/Statistik gebraucht werden und die App erreichbar ist:
`GET https://<vercel-app>/api/reference`.

> **Schreibzugriff aus dem neuen Projekt?** Möglich (append ins Journal), aber dann die
> Regeln aus Abschnitt 5 einhalten (ID in Spalte K setzen, Netto-Formeln in I/J, korrekte
> Zeilenstruktur). Sonst besser die POST-API der App nutzen. Für reines Auswerten:
> **nur lesen.**

## 8. TypeScript-Typen (Auszug, Quelle: `src/lib/types.ts`)

```ts
interface PaletteEntry {
  id: string;              // client-seitige eindeutige ID (= Spalte K)
  datum: string;           // ISO "YYYY-MM-DD" (im Sheet als TT.MM.JJJJ)
  person: string;
  schlag: string;
  sorte: string;
  gewichtBrutto: number;   // kg, Rohgewicht ab Waage
  anzahlKisten: number;
  gebindeart: string;      // "G2" | "IFCO 6410" | "IFCO 6416" | "IFCO 6424" | "Holz Palox"
  bemerkung?: string;
  sheetRow: number | null; // Zeilennummer im Sheet (nach erstem Sync)
  syncStatus: "pending" | "syncing" | "synced" | "error";
  createdAt: number;       // ms-Timestamp
}
```

## 9. Wichtige Invarianten / Fallstricke

- **Schreibweise muss exakt übereinstimmen.** Schlag/Sorte im Journal müssen zeichengenau
  mit der Anbauplanung übereinstimmen, sonst ordnet die SUMIFS-Formel den Ertrag nicht zu
  (Kontrollwert E1 zeigt das an).
- **Schlag & Sorte kommen ausschliesslich aus der Anbauplanung** (in der App keine freie
  Eingabe; Neuanlage nur mit Passwort). Person und Gebindeart sind fest bzw. frei.
- **Ertrag ist immer eine Formel, kein gespeicherter Wert** → beim Lesen der Anbauplanung
  den berechneten Wert (nicht die Formel) holen.
- **Referenzwerte sind ein Akkumulator** (nur fortschreiben) und überleben den
  Saisonwechsel; das Journal wird jährlich geleert (Zeilen ab 3), die Anbauplanung neu
  eingetragen. Formeln ergänzt die App beim nächsten Laden selbst.
- **Passwort „Sammy“ ist eine Bequemlichkeitssperre**, keine echte Sicherheit: Für
  Offline-Fähigkeit im Browser geprüft, daher im Quelltext auffindbar. Für schützenswerte
  Integrationen nicht darauf verlassen.
- **Keine Datenbank, kein Server-State** — Nebenläufigkeit wird über die Sheets-API und die
  Palettenkennung entschärft, ist aber „best effort“.

## 10. Wichtige Dateien im Repo (Orientierung für die andere KI)

- `src/lib/constants.ts` — Spalten, Tab-Namen, Gebinde-Tara, Netto-Formeln, `istDatenzeile`.
- `src/lib/googleSheets.ts` — alle Sheet-Lese/Schreib-Operationen (append, update, delete,
  `getReferenceData`, `readPlanung`, `schreibeReferenzwertFort`).
- `src/lib/sheetSetup.ts` — Einrichtung/Reparatur des Dokuments (idempotent).
- `src/lib/types.ts` — alle Datentypen (`PaletteEntry`, `ReferenceData`, …).
- `src/lib/plausibility.ts` — Plausibilitätsprüfung + Erwartungsbereich je Sorte.
- `src/app/api/*/route.ts` — die HTTP-Endpunkte (Abschnitt 6).
- `src/components/*` — die UI (Wiegen, Übersicht, Auswahl).
- `README.md` — Betriebs-/Setup-Anleitung für Menschen.

## 11. Lokal starten (falls die andere KI den Code ausführen will)

```bash
npm install
cp .env.local.example .env.local   # dann GOOGLE_SHEET_ID + Service-Account-Werte eintragen
npm run dev                         # http://localhost:3000
```
Build/Checks: `npm run build`, `npx tsc --noEmit`, `npx eslint .`.
