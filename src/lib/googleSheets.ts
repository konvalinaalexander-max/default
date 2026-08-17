import "server-only";
import { google, sheets_v4 } from "googleapis";
import {
  COLUMNS,
  FIRST_DATA_ROW,
  KISTE_TARA_KG,
  PALETTE_TARA_KG,
  SHEET_NAME,
  STANDARD_GEBINDEART,
  gewichtProKiste,
  isoZuSheetDatum,
} from "./constants";
import { median, medianAbsoluteDeviation } from "./plausibility";
import type { PaletteEntry, ReferenceData, SorteStats } from "./types";

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

function getSheetId(): string {
  return getEnv("GOOGLE_SHEET_ID");
}

function getClient(): sheets_v4.Sheets {
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

function colLetter(col: number): string {
  let n = col;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function rowRange(row: number): string {
  return `${SHEET_NAME}!${colLetter(COLUMNS.datum)}${row}:${colLetter(COLUMNS.gewichtProKiste)}${row}`;
}

function rowValues(entry: {
  datum: string;
  person: string;
  feld: string;
  sorte: string;
  gewichtBrutto: number;
  anzahlKisten: number;
  gebindeart?: string;
  bemerkung?: string;
}): (string | number)[] {
  return [
    isoZuSheetDatum(entry.datum),
    entry.person,
    entry.feld,
    entry.sorte,
    entry.gewichtBrutto,
    entry.anzahlKisten,
    // Immer ausschreiben. Vorher blieb die Zelle beim Standardwert leer - das hinterliess
    // Lücken in der Spalte und löste bei einer Datenprüfung eine rote Markierung aus.
    entry.gebindeart || STANDARD_GEBINDEART,
    entry.bemerkung ?? "",
  ];
}

/** Die beiden Formelspalten, passend zur tatsächlichen Zeilennummer. */
function formelWerte(row: number): string[] {
  return [
    `=E${row}-${PALETTE_TARA_KG}-F${row}*${KISTE_TARA_KG}`,
    `=I${row}/F${row}`,
  ];
}

/** Liest alle bisherigen Datenzeilen aus dem Sheet (roh, ohne Formeln aufzulösen). */
async function readAllDataRows(): Promise<{ row: number; values: unknown[] }[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!A${FIRST_DATA_ROW}:H100000`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const rows = res.data.values ?? [];
  return rows
    .map((values, i) => ({ row: FIRST_DATA_ROW + i, values }))
    .filter((r) => r.values.some((v) => v !== "" && v !== undefined && v !== null));
}

export async function getReferenceData(): Promise<ReferenceData> {
  const rows = await readAllDataRows();

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
  const felder = count(rows.map((r) => String(r.values[COLUMNS.feld - 1] ?? "")));
  const sorten = count(rows.map((r) => String(r.values[COLUMNS.sorte - 1] ?? "")));

  const proSorteWerte = new Map<string, number[]>();
  for (const r of rows) {
    const sorte = String(r.values[COLUMNS.sorte - 1] ?? "");
    const gewicht = Number(r.values[COLUMNS.gewichtBrutto - 1]);
    const kisten = Number(r.values[COLUMNS.anzahlKisten - 1]);
    if (!sorte || !gewicht || !kisten) continue;
    const wert = gewichtProKiste(gewicht, kisten);
    if (!Number.isFinite(wert) || wert <= 0) continue;
    if (!proSorteWerte.has(sorte)) proSorteWerte.set(sorte, []);
    proSorteWerte.get(sorte)!.push(wert);
  }

  const sortenStats: Record<string, SorteStats> = {};
  for (const [sorte, werte] of proSorteWerte) {
    const med = median(werte);
    sortenStats[sorte] = {
      medianProKiste: med,
      madProKiste: medianAbsoluteDeviation(werte, med),
      anzahlProben: werte.length,
    };
  }

  return { personen, felder, sorten, sortenStats };
}

export interface SyncResult {
  sheetRow: number;
}

function parseRowFromRange(range: string | null | undefined): number {
  // z.B. "Tabellenblatt1!A312:H312" -> 312
  const m = range?.match(/![A-Z]+(\d+):/);
  if (!m) throw new Error(`Konnte Zeilennummer nicht aus Sheets-Antwort lesen: ${range}`);
  return Number(m[1]);
}

/**
 * Hängt eine neue Palette als Zeile ans Sheet an. Nutzt die native append()-API (statt
 * selbst die nächste freie Zeile zu berechnen), damit parallele Schreibvorgänge nicht
 * dieselbe Zeile überschreiben können.
 */
export async function appendPalette(entry: PaletteEntry): Promise<SyncResult> {
  const sheets = getClient();

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!A:H`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [rowValues(entry)] },
  });

  const sheetRow = parseRowFromRange(res.data.updates?.updatedRange);

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!${colLetter(COLUMNS.gewichtProPalette)}${sheetRow}:${colLetter(COLUMNS.gewichtProKiste)}${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [formelWerte(sheetRow)] },
  });

  return { sheetRow };
}

/** Überschreibt eine bestehende Palette-Zeile komplett (z.B. bei Korrektur). */
export async function updatePalette(sheetRow: number, entry: PaletteEntry): Promise<void> {
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: rowRange(sheetRow),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[...rowValues(entry), ...formelWerte(sheetRow)]] },
  });
}

/** Numerische ID des Tabellenblatts - für das echte Löschen einer Zeile nötig. */
async function getSheetGid(): Promise<number> {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: "sheets.properties(sheetId,title)",
  });
  const blatt = meta.data.sheets?.find((s) => s.properties?.title === SHEET_NAME);
  if (!blatt?.properties?.sheetId && blatt?.properties?.sheetId !== 0) {
    throw new Error(`Tabellenblatt "${SHEET_NAME}" nicht gefunden.`);
  }
  return blatt.properties.sheetId;
}

/**
 * Löscht die Zeile wirklich, statt sie nur zu leeren - sonst bleiben über die Saison
 * leere Zeilen mitten in den Daten stehen und stören jede Auswertung.
 * Die Zeilennummern darunter verschieben sich dadurch um eins nach oben; der Aufrufer
 * muss die gemerkten Zeilennummern entsprechend anpassen.
 */
export async function deletePaletteRow(sheetRow: number): Promise<void> {
  const sheets = getClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: await getSheetGid(),
              dimension: "ROWS",
              startIndex: sheetRow - 1, // API zählt ab 0
              endIndex: sheetRow,
            },
          },
        },
      ],
    },
  });
}

/** Ändert Datum/Person/Feld/Sorte für mehrere Zeilen auf einmal (rückwirkende Korrektur). */
export async function batchUpdateSessionFields(
  updates: { sheetRow: number; datum: string; person: string; feld: string; sorte: string }[]
): Promise<void> {
  if (updates.length === 0) return;
  const sheets = getClient();
  const data: sheets_v4.Schema$ValueRange[] = updates.map((u) => ({
    range: `${SHEET_NAME}!${colLetter(COLUMNS.datum)}${u.sheetRow}:${colLetter(COLUMNS.sorte)}${u.sheetRow}`,
    values: [[isoZuSheetDatum(u.datum), u.person, u.feld, u.sorte]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
}
