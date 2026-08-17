import "server-only";
import { google, sheets_v4 } from "googleapis";
import {
  ALTE_JOURNAL_TITEL,
  COLUMNS,
  FIRST_DATA_ROW,
  blattRef,
  GEBINDEARTEN,
  JOURNAL_SHEET,
  PALETTE_TARA_KG,
  PLAN_FIRST_DATA_ROW,
  PLAN_SHEET,
  REFERENZ_FIRST_DATA_ROW,
  REFERENZ_SHEET,
  STANDARD_GEBINDEART,
  gewichtProKiste,
  isoZuSheetDatum,
  taraFuerGebinde,
} from "./constants";
import { fasseZusammen } from "./plausibility";
import type { PaletteEntry, ReferenceData, SorteStats, SorteVorwissen } from "./types";

let cachedClient: sheets_v4.Sheets | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Umgebungsvariable ${name} fehlt. Siehe .env.local.example für die nötigen Werte.`
    );
  }
  return value;
}

export function getSheetId(): string {
  return getEnv("GOOGLE_SHEET_ID");
}

export function getClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;

  const email = getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const rawKey = getEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

export function colLetter(col: number): string {
  let n = col;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const LETZTE_SPALTE = colLetter(COLUMNS.id);

/** Einmal aufgelöster Tab-Name des Journals. */
let journalTabCache: string | null = null;

export function vergesseJournalTab(): void {
  journalTabCache = null;
}

/**
 * Der tatsächliche Tab-Name des Journals.
 *
 * Vor der Einrichtung heisst er noch "Tabellenblatt1". Würde die App stur
 * "Ertragsjournal" lesen, käme von jedem Zugriff nur ein Fehler zurück - und genau der
 * Knopf, der den Tab umbenennt, wäre dann nicht erreichbar.
 */
async function journalTab(): Promise<string> {
  if (journalTabCache) return journalTabCache;

  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: "sheets.properties.title",
  });
  const titel = (meta.data.sheets ?? []).map((s) => s.properties?.title ?? "");

  const gefunden =
    titel.find((t) => t === JOURNAL_SHEET) ??
    titel.find((t) => ALTE_JOURNAL_TITEL.includes(t)) ??
    (titel.length === 1 ? titel[0] : undefined);

  if (!gefunden) {
    throw new Error(
      `Tabellenblatt "${JOURNAL_SHEET}" nicht gefunden. Vorhanden sind: ` +
        `${titel.map((t) => `"${t}"`).join(", ") || "keine"}. ` +
        `Benenne das Journal so um, oder starte in den Einstellungen "Sheet einrichten".`
    );
  }
  journalTabCache = gefunden;
  return gefunden;
}

/** Erkennt, dass ein Bereich auf ein Blatt zeigt, das es nicht (mehr) gibt. */
function istUnbekannterBereich(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return /Unable to parse range|nicht gefunden/i.test(text);
}

/**
 * Führt einen Zugriff mit dem aufgelösten Tab-Namen aus und heilt sich selbst: Wurde der
 * Tab zwischenzeitlich umbenannt - etwa weil die Einrichtung auf einer anderen
 * Server-Instanz lief - wird der gemerkte Name verworfen und einmal neu aufgelöst.
 */
async function mitJournalTab<T>(arbeit: (tab: string) => Promise<T>): Promise<T> {
  try {
    return await arbeit(await journalTab());
  } catch (err) {
    if (!istUnbekannterBereich(err)) throw err;
    vergesseJournalTab();
    return arbeit(await journalTab());
  }
}

/** Wie journalTab(), nur ohne Selbstheilung - für Schreibzugriffe, die den Namen brauchen. */
async function journalTabOderNeu(): Promise<string> {
  return mitJournalTab(async (tab) => tab);
}

function rowRange(tab: string, row: number): string {
  return `${blattRef(tab)}!A${row}:${LETZTE_SPALTE}${row}`;
}

function rowValues(entry: {
  datum: string;
  person: string;
  schlag: string;
  sorte: string;
  gewichtBrutto: number;
  anzahlKisten: number;
  gebindeart?: string;
  bemerkung?: string;
}): (string | number)[] {
  return [
    isoZuSheetDatum(entry.datum),
    entry.person,
    entry.schlag,
    entry.sorte,
    entry.gewichtBrutto,
    entry.anzahlKisten,
    // Immer ausschreiben. Vorher blieb die Zelle beim Standardwert leer - das hinterliess
    // Lücken in der Spalte und löste bei einer Datenprüfung eine rote Markierung aus.
    entry.gebindeart || STANDARD_GEBINDEART,
    entry.bemerkung ?? "",
  ];
}

/**
 * Die beiden Formelspalten, passend zur Zeile und zum Leergut der jeweiligen Gebindeart.
 * Das Leergewicht steht als Zahl in der Formel, damit im Sheet nachvollziehbar bleibt,
 * womit gerechnet wurde. Vorher stand dort fest 1,5 - auch bei IFCO-Kisten.
 */
function formelWerte(row: number, gebindeart?: string | null): string[] {
  const tara = taraFuerGebinde(gebindeart);
  return [`=E${row}-${PALETTE_TARA_KG}-F${row}*${tara}`, `=I${row}/F${row}`];
}

/** Liest alle bisherigen Datenzeilen des Journals (roh, ohne Formeln aufzulösen). */
async function readAllDataRows(): Promise<{ row: number; values: unknown[] }[]> {
  const sheets = getClient();
  const res = await mitJournalTab((tab) =>
    sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: `${blattRef(tab)}!A${FIRST_DATA_ROW}:${LETZTE_SPALTE}100000`,
      valueRenderOption: "UNFORMATTED_VALUE",
    })
  );
  const rows = res.data.values ?? [];
  return rows
    .map((values, i) => ({ row: FIRST_DATA_ROW + i, values }))
    .filter((r) => r.values.some((v) => v !== "" && v !== undefined && v !== null));
}

export interface Planung {
  schlaege: string[];
  sortenNachSchlag: Record<string, string[]>;
  sorten: string[];
}

/**
 * Liest die Anbauplanung: welche Sorte steht auf welchem Schlag.
 *
 * Leerzeilen werden übersprungen statt als Ende gewertet - eine einzige versehentlich
 * leere Zeile würde sonst alles darunter unsichtbar machen.
 */
export async function readPlanung(): Promise<Planung> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(PLAN_SHEET)}!A${PLAN_FIRST_DATA_ROW}:B10000`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const sortenNachSchlag: Record<string, string[]> = {};
  const schlaege: string[] = [];
  const alleSorten = new Set<string>();

  for (const zeile of res.data.values ?? []) {
    const schlag = String(zeile[0] ?? "").trim();
    const sorte = String(zeile[1] ?? "").trim();
    if (!schlag || !sorte) continue;
    if (!sortenNachSchlag[schlag]) {
      sortenNachSchlag[schlag] = [];
      schlaege.push(schlag);
    }
    if (!sortenNachSchlag[schlag].includes(sorte)) sortenNachSchlag[schlag].push(sorte);
    alleSorten.add(sorte);
  }

  return { schlaege, sortenNachSchlag, sorten: [...alleSorten].sort((a, b) => a.localeCompare(b)) };
}

/**
 * Legt ein neues Schlag-Sorte-Paar in der Anbauplanung an (geschützt durch das Passwort
 * in der App). Steht das Paar schon drin, passiert nichts - zweimal drücken schadet nicht.
 * Die Ertragsformel ergänzt der Aufrufer im Anschluss.
 */
export async function appendPlanungszeile(schlag: string, sorte: string): Promise<void> {
  const sheets = getClient();
  const planung = await readPlanung();
  if (planung.sortenNachSchlag[schlag]?.includes(sorte)) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${blattRef(PLAN_SHEET)}!A:B`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[schlag, sorte]] },
  });
}

/**
 * Schreibt die Summen einer Sorte im Referenzwerte-Blatt fort.
 *
 * Bewusst addierend und nicht aus dem Journal neu berechnet: Wird das Journal am
 * Saisonstart geleert, ergäbe eine Neuberechnung null Proben und würde das Wissen der
 * Vorjahre überschreiben - genau das, was das Blatt verhindern soll.
 *
 * Lesen und Schreiben sind nicht in einem Zug: Wiegen zwei Geräte im selben Moment
 * dieselbe Sorte, kann eine Palette in der Statistik fehlen. Für einen Ausgangswert ist
 * das ohne Belang - die Erträge selbst rechnet das Sheet aus dem Journal.
 */
export async function schreibeReferenzwertFort(
  sorte: string,
  anzahlKisten: number,
  nettoKg: number
): Promise<void> {
  if (!sorte || anzahlKisten <= 0 || !Number.isFinite(nettoKg) || nettoKg <= 0) return;

  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(REFERENZ_SHEET)}!A${REFERENZ_FIRST_DATA_ROW}:D10000`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const zeilen = res.data.values ?? [];

  let zeile = -1;
  let paletten = 0;
  let kisten = 0;
  let netto = 0;
  for (let i = 0; i < zeilen.length; i++) {
    if (String(zeilen[i]?.[0] ?? "").trim() === sorte) {
      zeile = REFERENZ_FIRST_DATA_ROW + i;
      paletten = Number(zeilen[i]?.[1]) || 0;
      kisten = Number(zeilen[i]?.[2]) || 0;
      netto = Number(zeilen[i]?.[3]) || 0;
      break;
    }
  }

  const neu = {
    paletten: paletten + 1,
    kisten: kisten + anzahlKisten,
    netto: Math.round((netto + nettoKg) * 10) / 10,
  };
  const werte = [
    sorte,
    neu.paletten,
    neu.kisten,
    neu.netto,
    Math.round((neu.netto / neu.kisten) * 100) / 100,
    new Date().toISOString().slice(0, 10),
  ];

  if (zeile > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: `${blattRef(REFERENZ_SHEET)}!A${zeile}:F${zeile}`,
      valueInputOption: "RAW",
      requestBody: { values: [werte] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSheetId(),
      range: `${blattRef(REFERENZ_SHEET)}!A:F`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [werte] },
    });
  }
}

/** Liest das fortgeschriebene Vorwissen je Sorte. */
export async function readVorwissen(): Promise<Record<string, SorteVorwissen>> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(REFERENZ_SHEET)}!A${REFERENZ_FIRST_DATA_ROW}:E10000`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const vorwissen: Record<string, SorteVorwissen> = {};
  for (const zeile of res.data.values ?? []) {
    const sorte = String(zeile[0] ?? "").trim();
    const paletten = Number(zeile[1]);
    const kisten = Number(zeile[2]);
    const nettoKg = Number(zeile[3]);
    if (!sorte || !Number.isFinite(kisten) || kisten <= 0) continue;
    if (!Number.isFinite(nettoKg) || nettoKg <= 0) continue;
    vorwissen[sorte] = {
      mittelProKiste: nettoKg / kisten,
      anzahlProben: Number.isFinite(paletten) && paletten > 0 ? paletten : 1,
    };
  }
  return vorwissen;
}

/**
 * Ein fehlendes oder noch nicht angelegtes Blatt darf die App nicht lahmlegen: Dann gilt
 * einfach, dass es kein Vorwissen bzw. keine Planungsbeschränkung gibt.
 */
async function ohneFehler<T>(arbeit: () => Promise<T>, ersatz: T): Promise<T> {
  try {
    return await arbeit();
  } catch {
    return ersatz;
  }
}

export async function getReferenceData(): Promise<ReferenceData> {
  const [rows, planung, vorwissen] = await Promise.all([
    readAllDataRows(),
    ohneFehler(readPlanung, null as Planung | null),
    ohneFehler(readVorwissen, {} as Record<string, SorteVorwissen>),
  ]);

  const count = (values: string[]) => {
    const freq = new Map<string, number>();
    for (const v of values) {
      if (!v) continue;
      freq.set(v, (freq.get(v) ?? 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  };

  const personen = count(rows.map((r) => String(r.values[COLUMNS.person - 1] ?? "")));

  const proSorteWerte = new Map<string, number[]>();
  const alleWerte: number[] = [];
  for (const r of rows) {
    const sorte = String(r.values[COLUMNS.sorte - 1] ?? "");
    const gewicht = Number(r.values[COLUMNS.gewichtBrutto - 1]);
    const kisten = Number(r.values[COLUMNS.anzahlKisten - 1]);
    const gebindeart = String(r.values[COLUMNS.gebindeart - 1] ?? "");
    if (!sorte || !gewicht || !kisten) continue;
    const wert = gewichtProKiste(gewicht, kisten, gebindeart);
    if (!Number.isFinite(wert) || wert <= 0) continue;
    if (!proSorteWerte.has(sorte)) proSorteWerte.set(sorte, []);
    proSorteWerte.get(sorte)!.push(wert);
    alleWerte.push(wert);
  }

  const sortenStats: Record<string, SorteStats> = {};
  for (const [sorte, werte] of proSorteWerte) {
    sortenStats[sorte] = fasseZusammen(werte);
  }

  // Vorwissen über alle Sorten: Grundlage, wenn weder zur Sorte noch zur laufenden
  // Saison etwas vorliegt - also unmittelbar nach dem Leeren des Journals.
  const vorwissenListe = Object.values(vorwissen);
  const allgemeinesVorwissen: SorteVorwissen | null = vorwissenListe.length
    ? {
        mittelProKiste:
          vorwissenListe.reduce((s, v) => s + v.mittelProKiste * v.anzahlProben, 0) /
          vorwissenListe.reduce((s, v) => s + v.anzahlProben, 0),
        anzahlProben: vorwissenListe.reduce((s, v) => s + v.anzahlProben, 0),
      }
    : null;

  return {
    personen,
    schlaege: planung?.schlaege ?? [],
    sortenNachSchlag: planung?.sortenNachSchlag ?? {},
    sorten: planung?.sorten ?? [],
    gebindearten: GEBINDEARTEN.map((g) => g.name),
    sortenStats,
    allgemeineStats: alleWerte.length > 0 ? fasseZusammen(alleWerte) : null,
    vorwissen,
    allgemeinesVorwissen,
    planungGelesen: planung !== null,
  };
}

export interface SyncResult {
  sheetRow: number;
  /** True, wenn die Palette bereits im Sheet stand und nichts angehängt wurde. */
  schonVorhanden?: boolean;
}

function parseRowFromRange(range: string | null | undefined): number {
  // z.B. "Ertragsjournal!A312:K312" -> 312
  const m = range?.match(/![A-Z]+(\d+):/);
  if (!m) throw new Error(`Konnte Zeilennummer nicht aus Sheets-Antwort lesen: ${range}`);
  return Number(m[1]);
}

/** Sucht die Zeile einer Palettenkennung. Gibt null zurück, wenn sie nicht im Sheet steht. */
async function findeZeileZuId(id: string): Promise<number | null> {
  const sheets = getClient();
  const spalte = colLetter(COLUMNS.id);
  const res = await mitJournalTab((tab) =>
    sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: `${blattRef(tab)}!${spalte}${FIRST_DATA_ROW}:${spalte}100000`,
      valueRenderOption: "UNFORMATTED_VALUE",
    })
  );
  const werte = res.data.values ?? [];
  for (let i = 0; i < werte.length; i++) {
    if (String(werte[i]?.[0] ?? "").trim() === id) return FIRST_DATA_ROW + i;
  }
  return null;
}

/**
 * Hängt eine neue Palette als Zeile ans Journal an. Nutzt die native append()-API (statt
 * selbst die nächste freie Zeile zu berechnen), damit parallele Schreibvorgänge nicht
 * dieselbe Zeile überschreiben können. Ist das Journal geleert, schreibt append von
 * selbst wieder direkt unter die Kopfzeile.
 *
 * Bei einem Wiederholversuch wird zuerst geprüft, ob die Palette schon drinsteht: Geht
 * die Antwort des Sheets verloren, obwohl die Zeile geschrieben wurde, entstand vorher
 * eine zweite identische Zeile. Identische Paletten sind völlig normal (fünf mal 384 kg
 * am selben Tag), eine solche Doppelzeile war also nicht als Fehler erkennbar - und würde
 * jetzt in den Ertrag einfliessen.
 */
export async function appendPalette(
  entry: PaletteEntry,
  istWiederholung = false
): Promise<SyncResult> {
  const sheets = getClient();

  if (istWiederholung) {
    const schonDa = await findeZeileZuId(entry.id);
    if (schonDa !== null) return { sheetRow: schonDa, schonVorhanden: true };
  }

  // Bewusst nur die Spalten A bis H, obwohl die Zeile bis K reicht:
  // append() sucht das Ende der "Tabelle" im angegebenen Bereich. Im Journal sind die
  // Formeln in I und J bis Zeile 1000 hinuntergezogen, dort steht also etwas. Würde der
  // Bereich I mit einschliessen, hielte append die Tabelle für 1000 Zeilen lang und
  // schriebe die nächste Palette in Zeile 1001 - mit hunderten leeren Zeilen davor.
  const tab = await journalTabOderNeu();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${blattRef(tab)}!A:${colLetter(COLUMNS.bemerkung)}`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [rowValues(entry)] },
  });

  const sheetRow = parseRowFromRange(res.data.updates?.updatedRange);

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${blattRef(tab)}!${colLetter(COLUMNS.nettoProPalette)}${sheetRow}:${LETZTE_SPALTE}${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[...formelWerte(sheetRow, entry.gebindeart), entry.id]] },
  });

  return { sheetRow };
}

/**
 * Sicherheitsnetz vor jedem Ändern oder Löschen: Die App merkt sich Zeilennummern.
 * Wird das Sheet zwischenzeitlich von Hand sortiert, wird oben eine Zeile eingefügt, oder
 * werden am Saisonstart alle Zeilen gelöscht, zeigen diese Nummern plötzlich auf fremde
 * Daten - ein Schreibvorgang würde dann eine unbeteiligte Zeile überschreiben.
 *
 * Die Palettenkennung entscheidet das eindeutig. Zeilen aus der Zeit vor der Kennung
 * haben keine; für die bleibt der bisherige Vergleich über Person und Schlag.
 */
async function findeGueltigeZeile(sheetRow: number, entry: PaletteEntry): Promise<number> {
  const sheets = getClient();
  const res = await mitJournalTab((tab) =>
    sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: rowRange(tab, sheetRow),
      valueRenderOption: "UNFORMATTED_VALUE",
    })
  );

  const werte = res.data.values?.[0] ?? [];
  const idImSheet = String(werte[COLUMNS.id - 1] ?? "").trim();

  if (idImSheet && idImSheet === entry.id) return sheetRow;

  if (idImSheet && idImSheet !== entry.id) {
    // Die Zeile gehört nachweislich zu einer anderen Palette - anderswo suchen.
    const gefunden = await findeZeileZuId(entry.id);
    if (gefunden !== null) return gefunden;
    throw new Error(
      `Diese Palette steht nicht mehr im Sheet (Zeile ${sheetRow} gehört inzwischen zu einer anderen). Es wurde nichts geändert.`
    );
  }

  // Keine Kennung vorhanden: Zeile aus der Zeit vor der Palettenkennung.
  if (werte.length === 0) {
    const gefunden = await findeZeileZuId(entry.id);
    if (gefunden !== null) return gefunden;
    throw new Error(
      `Zeile ${sheetRow} ist leer. Die Zeile wurde vermutlich im Sheet verschoben oder gelöscht - es wurde nichts geändert.`
    );
  }

  const personImSheet = String(werte[COLUMNS.person - 1] ?? "").trim();
  const schlagImSheet = String(werte[COLUMNS.schlag - 1] ?? "").trim();
  if (personImSheet === entry.person.trim() && schlagImSheet === entry.schlag.trim()) {
    return sheetRow;
  }

  throw new Error(
    `Zeile ${sheetRow} enthält andere Daten als erwartet (im Sheet: "${personImSheet} / ${schlagImSheet}"). ` +
      `Wurde das Sheet zwischenzeitlich sortiert oder bearbeitet? Es wurde nichts geändert.`
  );
}

/** Überschreibt eine bestehende Palette-Zeile komplett (z.B. bei Korrektur). */
export async function updatePalette(sheetRow: number, entry: PaletteEntry): Promise<void> {
  const zeile = await findeGueltigeZeile(sheetRow, entry);
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: rowRange(await journalTabOderNeu(), zeile),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[...rowValues(entry), ...formelWerte(zeile, entry.gebindeart), entry.id]],
    },
  });
}

/** Numerische ID eines Tabellenblatts - für das echte Löschen einer Zeile nötig. */
export async function getSheetGid(titel: string): Promise<number> {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: "sheets.properties(sheetId,title)",
  });
  const blatt = meta.data.sheets?.find((s) => s.properties?.title === titel);
  if (typeof blatt?.properties?.sheetId !== "number") {
    const vorhanden = (meta.data.sheets ?? [])
      .map((s) => `"${s.properties?.title}"`)
      .join(", ");
    throw new Error(
      `Tabellenblatt "${titel}" nicht gefunden. Vorhanden sind: ${vorhanden || "keine"}.`
    );
  }
  return blatt.properties.sheetId;
}

/**
 * Löscht die Zeile wirklich, statt sie nur zu leeren - sonst bleiben über die Saison
 * leere Zeilen mitten in den Daten stehen und stören jede Auswertung.
 * Die Zeilennummern darunter verschieben sich dadurch um eins nach oben; der Aufrufer
 * muss die gemerkten Zeilennummern entsprechend anpassen.
 */
export async function deletePaletteRow(sheetRow: number, entry: PaletteEntry): Promise<void> {
  const zeile = await findeGueltigeZeile(sheetRow, entry);
  const sheets = getClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: await getSheetGid(await journalTabOderNeu()),
              dimension: "ROWS",
              startIndex: zeile - 1, // API zählt ab 0
              endIndex: zeile,
            },
          },
        },
      ],
    },
  });
}

/** Ändert Datum/Person/Schlag/Sorte für mehrere Zeilen auf einmal (rückwirkende Korrektur). */
export async function batchUpdateSessionFields(
  updates: { sheetRow: number; datum: string; person: string; schlag: string; sorte: string }[]
): Promise<void> {
  if (updates.length === 0) return;
  const sheets = getClient();
  const tab = await journalTabOderNeu();
  const data: sheets_v4.Schema$ValueRange[] = updates.map((u) => ({
    range: `${blattRef(tab)}!${colLetter(COLUMNS.datum)}${u.sheetRow}:${colLetter(COLUMNS.sorte)}${u.sheetRow}`,
    values: [[isoZuSheetDatum(u.datum), u.person, u.schlag, u.sorte]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
}
