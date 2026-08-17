import "server-only";
import { sheets_v4 } from "googleapis";
import { ANBAUPLANUNG_SEED } from "./anbauplanungSeed";
import {
  ALTE_JOURNAL_TITEL,
  COLUMNS,
  HEADER_ROW,
  JOURNAL_HEADER,
  JOURNAL_HINWEIS_ROW,
  JOURNAL_SHEET,
  PLAN_FIRST_DATA_ROW,
  PLAN_HEADER,
  PLAN_HEADER_ROW,
  PLAN_HINWEIS_ROW,
  PLAN_SHEET,
  README_SHEET,
  REFERENZ_FIRST_DATA_ROW,
  REFERENZ_HEADER,
  REFERENZ_HEADER_ROW,
  REFERENZ_SHEET,
  blattRef,
  istDatenzeile,
  netGewichtProPalette,
} from "./constants";
import { colLetter, getClient, getSheetId, vergesseJournalTab } from "./googleSheets";

export const DOKUMENT_TITEL = "Kürbis Anbauplanung Journal Ertrag";
const SICHERUNG_TITEL = "Ertragsjournal Sicherung";

export const PLAN_HINWEIS =
  "SAISONSTART: Nur die Zeilen ab Zeile 3 löschen und die neue Anbauplanung direkt " +
  "darunter einfügen — ohne Leerzeile dazwischen. Nur Spalte A (Schlag) und Spalte B " +
  "(Sorte) ausfüllen; Spalte C (Ertrag) rechnet sich selbst und wird von der App " +
  "ergänzt. Zeile 2 mit den Spaltenköpfen nicht verändern. Die Schreibweise gilt genau " +
  "so, wie sie in der App erscheint — Namen während der Saison nicht mehr ändern, sonst " +
  "finden bereits erfasste Paletten ihren Ertrag nicht mehr.";

// Sichtbare Info-Zeile im Ertragsjournal - dasselbe Prinzip wie in der Anbauplanung.
export const JOURNAL_HINWEIS =
  "SAISONSTART: Nur die Zeilen ab Zeile 3 löschen — Zeile 1 (dieser Hinweis) und Zeile 2 " +
  "(die Spaltenköpfe) stehen lassen. Die App schreibt neue Einträge automatisch unter den " +
  "letzten Eintrag; ist alles gelöscht, beginnt sie wieder in Zeile 3. Die Spalten I und J " +
  "(Netto) und K (ID) setzt die App — nicht von Hand ändern.";

/** Inhalt des Read-Me-Blatts (eine Zeile je Absatz, Spalte A). */
const README_INHALT: string[] = [
  "Kürbis Anbauplanung Journal Ertrag — Kurzanleitung",
  "Dieses Dokument hat drei Arbeitsblätter: „Ertragsjournal“ (jede gewogene Palette einzeln), " +
    "„Anbauplanung Ertrag“ (welche Sorte auf welchem Schlag wächst, plus aufsummierter Ertrag) " +
    "und „Referenzwerte“ (Erfahrungswerte pro Sorte über die Jahre).",
  "SAISONSTART — so wird korrekt zurückgesetzt:",
  "1. Im „Ertragsjournal“ die Zeilen ab Zeile 3 löschen. Zeile 1 (Hinweis) und Zeile 2 " +
    "(Spaltenköpfe) stehen lassen.",
  "2. In „Anbauplanung Ertrag“ die Zeilen ab Zeile 3 löschen und die neue Planung direkt " +
    "darunter einfügen — nur Schlag (Spalte A) und Sorte (Spalte B), ohne Leerzeile dazwischen. " +
    "Spalte C (Ertrag) nicht ausfüllen, sie rechnet sich selbst.",
  "3. „Referenzwerte“ NICHT löschen — das ist das Erfahrungswissen aus den Vorjahren. Es hilft " +
    "der App, ungewöhnliche Gewichte zu erkennen, und würde sonst wieder bei null anfangen.",
  "WICHTIG: Schlag und Sorte müssen genau so geschrieben sein, wie sie in der App erscheinen. " +
    "Namen während der Saison nicht mehr ändern, sonst finden bereits erfasste Paletten ihren " +
    "Ertrag nicht mehr. Steht in „Anbauplanung Ertrag“ oben rechts nicht „Nicht zugeordnet: 0 kg“, " +
    "passt eine Schreibweise nicht zusammen.",
  "Der Knopf „Sheet einrichten“ in der App ist zum Jahreswechsel NICHT nötig — die App richtet " +
    "sich beim ersten Öffnen selbst ein (sie ergänzt die Ertragsformeln von allein). Der Knopf ist " +
    "nur zum Reparieren da, falls einmal etwas durcheinandergerät. Er ändert nie Daten, sondern " +
    "stellt nur die Struktur wieder her.",
  "Die App benutzen die Erntehelfer. Diese Blätter und ihre Struktur bitte nicht umbauen.",
];

export interface EinrichtungsBericht {
  erledigt: string[];
  uebersprungen: string[];
  formelSprache: "englisch" | "deutsch";
}

interface BlattInfo {
  titel: string;
  gid: number;
  spalten: number;
  frozenRows: number;
  neu: boolean;
}

interface JournalKopf {
  /** Köpfe stehen bereits in Zeile 2 (Info-Zeile darüber vorhanden). */
  migriert: boolean;
  /** Köpfe stehen in Zeile 1 mit Daten darunter - eine Info-Zeile muss eingefügt werden. */
  braucheInsert: boolean;
  /** In Zeile 1 steht schon ein Hinweis (nicht überschreiben - evtl. von Hand formatiert). */
  infoVorhanden: boolean;
}

/**
 * Richtet das Dokument ein und kann jederzeit erneut laufen: Jeder Schritt prüft zuerst,
 * ob er nötig ist. Datenzeilen werden nie gelöscht. Von Hand vorgenommene Formatierungen
 * der Hinweiszeilen bleiben erhalten (sie werden nur neu geschrieben, wenn sie fehlen).
 */
export async function richteSheetEin(): Promise<EinrichtungsBericht> {
  const sheets = getClient();
  const bericht: EinrichtungsBericht = { erledigt: [], uebersprungen: [], formelSprache: "englisch" };

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields:
      "properties.title,sheets.properties(sheetId,title,gridProperties),sheets.protectedRanges(protectedRangeId,range),sheets.merges",
  });

  const blaetter: BlattInfo[] = (meta.data.sheets ?? []).map((s) => ({
    titel: s.properties?.title ?? "",
    gid: s.properties?.sheetId ?? 0,
    spalten: s.properties?.gridProperties?.columnCount ?? 26,
    frozenRows: s.properties?.gridProperties?.frozenRowCount ?? 0,
    neu: false,
  }));

  const journal = await findeJournal(blaetter, bericht);
  const kopf = await leseJournalKopf(journal.titel);

  // --- Sicherung nur beim echten Erststart (Tab wird noch umbenannt). Ist der Tab schon
  // "Ertragsjournal", wurde bereits eingerichtet; das Einfügen der Info-Zeile ist ein
  // reines Verschieben und kann keine Daten verlieren, also braucht es keine Kopie. ---
  if (journal.titel !== JOURNAL_SHEET) {
    await legeSicherungAn(sheets, blaetter, journal, bericht);
  } else {
    bericht.uebersprungen.push("Keine Sicherung nötig (bereits eingerichtet)");
  }

  const plan = await stelleBlattSicher(sheets, blaetter, PLAN_SHEET, bericht);
  const referenz = await stelleBlattSicher(sheets, blaetter, REFERENZ_SHEET, bericht);
  const readme = await stelleBlattSicher(sheets, blaetter, README_SHEET, bericht);

  // Hinweiszeilen nur schreiben, wenn sie leer sind - eine von Hand angepasste Formulierung
  // oder Formatierung soll nicht überschrieben werden.
  const planHintNeu = plan.neu || (await zelleLeer(PLAN_SHEET, PLAN_HINWEIS_ROW, "A"));
  const journalHintNeu = kopf.braucheInsert || !kopf.infoVorhanden;
  const readmeNeu = readme.neu || (await zelleLeer(README_SHEET, 1, "A"));

  formelSpracheCache = await ermittleFormelSprache(sheets, referenz.titel);
  bericht.formelSprache = formelSpracheCache;

  // --- Strukturbatch. Reihenfolge zählt: Das Einfügen der Zeile steht ganz vorne, damit
  // alle folgenden zeilenbezogenen Anfragen den schon verschobenen Stand sehen. ---
  const req: sheets_v4.Schema$Request[] = [];

  if (kopf.braucheInsert) {
    req.push({
      insertDimension: {
        range: { sheetId: journal.gid, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        inheritFromBefore: false,
      },
    });
    bericht.erledigt.push("Info-Zeile im Ertragsjournal eingefügt (Köpfe jetzt in Zeile 2)");
  }

  if (meta.data.properties?.title !== DOKUMENT_TITEL) {
    req.push({ updateSpreadsheetProperties: { properties: { title: DOKUMENT_TITEL }, fields: "title" } });
    bericht.erledigt.push(`Dokument umbenannt in "${DOKUMENT_TITEL}"`);
  } else {
    bericht.uebersprungen.push("Dokumentname war schon richtig");
  }

  if (journal.titel !== JOURNAL_SHEET) {
    req.push({
      updateSheetProperties: {
        properties: { sheetId: journal.gid, title: JOURNAL_SHEET },
        fields: "title",
      },
    });
    bericht.erledigt.push(`Tabellenblatt "${journal.titel}" umbenannt in "${JOURNAL_SHEET}"`);
  } else {
    bericht.uebersprungen.push("Journal-Tab hiess schon richtig");
  }

  // Spalte K für die Kennung.
  if (journal.spalten < COLUMNS.id) {
    req.push({
      appendDimension: { sheetId: journal.gid, dimension: "COLUMNS", length: COLUMNS.id - journal.spalten },
    });
  }

  // Einfrieren.
  req.push(...einfrieren(journal.gid, journal.frozenRows, HEADER_ROW, "Ertragsjournal", bericht, kopf.braucheInsert));
  req.push(...einfrieren(plan.gid, plan.frozenRows, PLAN_HEADER_ROW, "Anbauplanung", bericht, false));
  req.push(...einfrieren(referenz.gid, referenz.frozenRows, REFERENZ_HEADER_ROW, "Referenzwerte", bericht, false));

  // ID-Spalte ausblenden.
  req.push({
    updateDimensionProperties: {
      range: { sheetId: journal.gid, dimension: "COLUMNS", startIndex: COLUMNS.id - 1, endIndex: COLUMNS.id },
      properties: { hiddenByUser: true },
      fields: "hiddenByUser",
    },
  });

  // Info-Zeilen verbinden + formatieren, aber nur wenn wir sie auch schreiben.
  if (journalHintNeu) {
    req.push(...verbindeUndFormatiere(journal.gid, JOURNAL_HINWEIS_ROW, JOURNAL_HEADER.length));
  }
  if (planHintNeu) {
    req.push(...verbindeUndFormatiere(plan.gid, PLAN_HINWEIS_ROW, PLAN_HEADER.length));
  }

  // Kopfzeilen fett.
  for (const [gid, zeile, breite] of [
    [journal.gid, HEADER_ROW, JOURNAL_HEADER.length],
    [plan.gid, PLAN_HEADER_ROW, PLAN_HEADER.length],
    [referenz.gid, REFERENZ_HEADER_ROW, REFERENZ_HEADER.length],
  ] as const) {
    req.push(fettZeile(gid, zeile, breite));
  }

  // Read-Me breit und umbrechend.
  if (readmeNeu) {
    req.push(
      {
        updateDimensionProperties: {
          range: { sheetId: readme.gid, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
          properties: { pixelSize: 720 },
          fields: "pixelSize",
        },
      },
      {
        repeatCell: {
          range: { sheetId: readme.gid, startRowIndex: 0, endRowIndex: README_INHALT.length, startColumnIndex: 0, endColumnIndex: 1 },
          cell: { userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP" } },
          fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
        },
      },
      fettZeile(readme.gid, 1, 1)
    );
  }

  // Schutz der Kopfbereiche: bestehende Kopf-Schutzbereiche entfernen und frisch setzen -
  // so stimmt die Zeilenzahl immer, auch nachdem die Info-Zeile dazugekommen ist.
  req.push(
    ...frischerSchutz(meta.data, journal.gid, HEADER_ROW, "Ertragsjournal", bericht),
    ...frischerSchutz(meta.data, plan.gid, PLAN_HEADER_ROW, "Anbauplanung", bericht),
    ...frischerSchutz(meta.data, referenz.gid, REFERENZ_HEADER_ROW, "Referenzwerte", bericht)
  );

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: getSheetId(), requestBody: { requests: req } });
  vergesseJournalTab();

  // --- Werte schreiben (nach dem Umbenennen, damit die Bereiche stimmen) ---
  await schreibeKopfzeilen(sheets, { planHintNeu, journalHintNeu }, bericht);
  if (readmeNeu) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: `${blattRef(README_SHEET)}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: README_INHALT.map((z) => [z]) },
    });
    bericht.erledigt.push('Blatt "Read Me" mit Kurzanleitung gefüllt');
  } else {
    bericht.uebersprungen.push('"Read Me" war schon beschrieben');
  }

  await entferneGeisterformeln(sheets, bericht);
  await seedePlanung(sheets, bericht);
  const gesetzt = await ergaenzeErtragsformeln();
  if (gesetzt > 0) bericht.erledigt.push(`${gesetzt} Ertragsformeln gesetzt`);
  else bericht.uebersprungen.push("Ertragsformeln waren schon vorhanden");
  bericht.erledigt.push("Kontrollwert in E1 der Anbauplanung gesetzt");
  await seedeReferenzwerte(sheets, bericht);

  return bericht;
}

/** Liest A1 und A2 des Journals und leitet daraus ab, was mit der Info-Zeile zu tun ist. */
async function leseJournalKopf(titel: string): Promise<JournalKopf> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(titel)}!A1:A2`,
  });
  const a1 = String(res.data.values?.[0]?.[0] ?? "").trim();
  const a2 = String(res.data.values?.[1]?.[0] ?? "").trim();
  const kopfIn1 = a1.toLowerCase().startsWith("datum");
  const kopfIn2 = a2.toLowerCase().startsWith("datum");

  if (kopfIn2) return { migriert: true, braucheInsert: false, infoVorhanden: a1.length > 0 && !kopfIn1 };
  if (kopfIn1) return { migriert: false, braucheInsert: true, infoVorhanden: false };
  // Leeres oder frisches Blatt: nichts zu verschieben, Köpfe kommen in Zeile 2.
  return { migriert: false, braucheInsert: false, infoVorhanden: false };
}

async function zelleLeer(blatt: string, zeile: number, spalte: string): Promise<boolean> {
  const sheets = getClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: `${blattRef(blatt)}!${spalte}${zeile}`,
    });
    return String(res.data.values?.[0]?.[0] ?? "").trim().length === 0;
  } catch {
    return true;
  }
}

/**
 * Findet das Journal und prüft, dass es wirklich das Journal ist. Bricht lieber ab, als
 * in ein unbekanntes Blatt zu schreiben. Erkennt die Köpfe in Zeile 1 (noch nicht migriert)
 * oder Zeile 2 (schon migriert).
 */
async function findeJournal(blaetter: BlattInfo[], bericht: EinrichtungsBericht): Promise<BlattInfo> {
  const nachTitel =
    blaetter.find((b) => b.titel === JOURNAL_SHEET) ??
    blaetter.find((b) => ALTE_JOURNAL_TITEL.includes(b.titel)) ??
    (blaetter.length === 1 ? blaetter[0] : undefined);

  if (!nachTitel) {
    throw new Error(
      `Das Journal-Tabellenblatt ist nicht eindeutig bestimmbar. Vorhanden: ` +
        `${blaetter.map((b) => `"${b.titel}"`).join(", ")}. ` +
        `Benenne das Journal von Hand in "${JOURNAL_SHEET}" um und starte die Einrichtung erneut.`
    );
  }

  const sheets = getClient();
  const kopf = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(nachTitel.titel)}!A1:B2`,
  });
  const zeilen = kopf.data.values ?? [];
  const istLeer = zeilen.length === 0;
  const passt = (zeile: unknown[] | undefined) =>
    String(zeile?.[0] ?? "").trim().toLowerCase().startsWith("datum") &&
    String(zeile?.[1] ?? "").trim().toLowerCase().startsWith("person");
  const erkannt = passt(zeilen[0]) || passt(zeilen[1]);

  if (!istLeer && !erkannt) {
    throw new Error(
      `"${nachTitel.titel}" sieht nicht wie das Ertragsjournal aus (A1="${String(zeilen[0]?.[0] ?? "")}"). ` +
        `Es wurde nichts verändert.`
    );
  }
  bericht.uebersprungen.push(`Journal erkannt als "${nachTitel.titel}"`);
  return nachTitel;
}

async function legeSicherungAn(
  sheets: sheets_v4.Sheets,
  blaetter: BlattInfo[],
  journal: BlattInfo,
  bericht: EinrichtungsBericht
): Promise<void> {
  if (blaetter.some((b) => b.titel === SICHERUNG_TITEL)) {
    bericht.uebersprungen.push("Sicherungskopie war schon vorhanden");
    return;
  }
  const daten = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(journal.titel)}!A1:F20`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  if (!(daten.data.values ?? []).some((z) => istDatenzeile(z))) {
    bericht.uebersprungen.push("Keine Sicherung nötig, Journal ist leer");
    return;
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [{ duplicateSheet: { sourceSheetId: journal.gid, newSheetName: SICHERUNG_TITEL } }],
    },
  });
  bericht.erledigt.push(`Sicherungskopie "${SICHERUNG_TITEL}" angelegt`);
}

async function stelleBlattSicher(
  sheets: sheets_v4.Sheets,
  blaetter: BlattInfo[],
  titel: string,
  bericht: EinrichtungsBericht
): Promise<BlattInfo> {
  const da = blaetter.find((b) => b.titel === titel);
  if (da) {
    bericht.uebersprungen.push(`Blatt "${titel}" war schon vorhanden`);
    return da;
  }
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: { requests: [{ addSheet: { properties: { title: titel } } }] },
  });
  const props = res.data.replies?.[0]?.addSheet?.properties;
  bericht.erledigt.push(`Blatt "${titel}" angelegt`);
  return {
    titel,
    gid: props?.sheetId ?? 0,
    spalten: props?.gridProperties?.columnCount ?? 26,
    frozenRows: 0,
    neu: true,
  };
}

function einfrieren(
  gid: number,
  aktuell: number,
  soll: number,
  name: string,
  bericht: EinrichtungsBericht,
  erzwingen: boolean
): sheets_v4.Schema$Request[] {
  if (aktuell >= soll && !erzwingen) {
    bericht.uebersprungen.push(`${name}: Kopfzeile war schon eingefroren`);
    return [];
  }
  if (!erzwingen) bericht.erledigt.push(`${name}: Kopfzeile eingefroren`);
  return [
    {
      updateSheetProperties: {
        properties: { sheetId: gid, gridProperties: { frozenRowCount: soll } },
        fields: "gridProperties.frozenRowCount",
      },
    },
  ];
}

/**
 * Verbindet die Hinweiszeile über die volle Breite und formatiert sie (umbrechen, fett).
 *
 * Vor dem Verbinden wird die ganze Zeile getrennt. Das ist der zuverlässige Weg: Ein
 * zweites MERGE_ALL über schon verbundene Zellen lehnt die Schnittstelle mit einem Fehler
 * ab, und ob eine Verbindung besteht, lässt sich aus den Metadaten nicht sicher ablesen
 * (Google lässt Null-Indizes weg). Das Trennen einer ganzen Zeile ist gefahrlos: Es
 * umfasst jede dort bestehende Verbindung vollständig, und ohne Verbindung passiert nichts.
 */
function verbindeUndFormatiere(gid: number, zeile: number, breite: number): sheets_v4.Schema$Request[] {
  // Range nur mit Zeilengrenzen (ohne Spalten) = ganze Zeile.
  const ganzeZeile = { sheetId: gid, startRowIndex: zeile - 1, endRowIndex: zeile };
  const range = { ...ganzeZeile, startColumnIndex: 0, endColumnIndex: breite };
  return [
    { unmergeCells: { range: ganzeZeile } },
    { mergeCells: { range, mergeType: "MERGE_ALL" } },
    {
      repeatCell: {
        range,
        cell: { userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP", textFormat: { bold: true } } },
        fields: "userEnteredFormat(wrapStrategy,verticalAlignment,textFormat)",
      },
    },
  ];
}

function fettZeile(gid: number, zeile: number, breite: number): sheets_v4.Schema$Request {
  return {
    repeatCell: {
      range: { sheetId: gid, startRowIndex: zeile - 1, endRowIndex: zeile, startColumnIndex: 0, endColumnIndex: breite },
      cell: { userEnteredFormat: { textFormat: { bold: true } } },
      fields: "userEnteredFormat.textFormat.bold",
    },
  };
}

/**
 * Entfernt bestehende Kopf-Schutzbereiche eines Blatts und legt einen frischen an, der
 * genau die Kopfzeilen abdeckt. Mit Warnung statt hartem Sperren, damit sich niemand
 * selbst aussperrt.
 */
function frischerSchutz(
  meta: sheets_v4.Schema$Spreadsheet,
  gid: number,
  bisZeile: number,
  name: string,
  bericht: EinrichtungsBericht
): sheets_v4.Schema$Request[] {
  const blatt = (meta.sheets ?? []).find((s) => s.properties?.sheetId === gid);
  const alte = (blatt?.protectedRanges ?? []).filter(
    (p) => (p.range?.startRowIndex ?? 0) === 0 && !p.range?.startColumnIndex
  );
  const anfragen: sheets_v4.Schema$Request[] = alte.map((p) => ({
    deleteProtectedRange: { protectedRangeId: p.protectedRangeId ?? undefined },
  }));
  anfragen.push({
    addProtectedRange: {
      protectedRange: {
        range: { sheetId: gid, startRowIndex: 0, endRowIndex: bisZeile },
        description: "Kopfzeile - bitte nicht löschen",
        warningOnly: true,
      },
    },
  });
  bericht.erledigt.push(`${name}: Kopfzeile geschützt (mit Warnung)`);
  return anfragen;
}

type Funktionsnamen = { summewenns: string; summe: string; runden: string; wenn: string };

function funktionsnamen(sprache: "englisch" | "deutsch"): Funktionsnamen {
  return sprache === "deutsch"
    ? { summewenns: "SUMMEWENNS", summe: "SUMME", runden: "RUNDEN", wenn: "WENN" }
    : { summewenns: "SUMIFS", summe: "SUM", runden: "ROUND", wenn: "IF" };
}

/** Einmal ermittelt, gilt für die Laufzeit des Servers. */
let formelSpracheCache: "englisch" | "deutsch" | null = null;

async function holeFormelSprache(sheets: sheets_v4.Sheets): Promise<"englisch" | "deutsch"> {
  if (!formelSpracheCache) formelSpracheCache = await ermittleFormelSprache(sheets, REFERENZ_SHEET);
  return formelSpracheCache;
}

/**
 * Probiert eine englische Formel aus und liest das Ergebnis zurück. Je nach
 * Spracheinstellung des Dokuments erwartet die Schnittstelle englische oder deutsche
 * Funktionsnamen; ein einziger Versuch klärt es.
 */
async function ermittleFormelSprache(sheets: sheets_v4.Sheets, blatt: string): Promise<"englisch" | "deutsch"> {
  const probe = `${blattRef(blatt)}!Z1`;
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: probe,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["=IF(1=1,1,0)"]] },
    });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: probe,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    return Number(res.data.values?.[0]?.[0]) === 1 ? "englisch" : "deutsch";
  } catch {
    return "deutsch";
  } finally {
    await sheets.spreadsheets.values.clear({ spreadsheetId: getSheetId(), range: probe }).catch(() => undefined);
  }
}

async function schreibeKopfzeilen(
  sheets: sheets_v4.Sheets,
  opt: { planHintNeu: boolean; journalHintNeu: boolean },
  bericht: EinrichtungsBericht
): Promise<void> {
  const data: sheets_v4.Schema$ValueRange[] = [
    {
      range: `${blattRef(JOURNAL_SHEET)}!A${HEADER_ROW}:${colLetter(JOURNAL_HEADER.length)}${HEADER_ROW}`,
      values: [[...JOURNAL_HEADER]],
    },
    {
      range: `${blattRef(PLAN_SHEET)}!A${PLAN_HEADER_ROW}:${colLetter(PLAN_HEADER.length)}${PLAN_HEADER_ROW}`,
      values: [[...PLAN_HEADER]],
    },
    {
      range: `${blattRef(REFERENZ_SHEET)}!A${REFERENZ_HEADER_ROW}:${colLetter(REFERENZ_HEADER.length)}${REFERENZ_HEADER_ROW}`,
      values: [[...REFERENZ_HEADER]],
    },
  ];
  if (opt.journalHintNeu) {
    data.push({ range: `${blattRef(JOURNAL_SHEET)}!A${JOURNAL_HINWEIS_ROW}`, values: [[JOURNAL_HINWEIS]] });
  }
  if (opt.planHintNeu) {
    data.push({ range: `${blattRef(PLAN_SHEET)}!A${PLAN_HINWEIS_ROW}`, values: [[PLAN_HINWEIS]] });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: { valueInputOption: "RAW", data },
  });
  bericht.erledigt.push("Spaltenköpfe gesetzt");
}

/**
 * Entfernt Netto-Formeln aus Zeilen ohne Palette. Im Journal waren sie bis Zeile 1000
 * hinuntergezogen und ergaben in leeren Zeilen je -25 kg. Info- und Kopfzeile bleiben
 * unberührt, weil sie in Spalte A Text tragen (hatDaten = true).
 */
async function entferneGeisterformeln(sheets: sheets_v4.Sheets, bericht: EinrichtungsBericht): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(JOURNAL_SHEET)}!A1:${colLetter(COLUMNS.nettoProKiste)}100000`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const zeilen = res.data.values ?? [];

  const zuLeeren: string[] = [];
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i] ?? [];
    const hatDaten = zeile.slice(0, COLUMNS.bemerkung).some((v) => v !== "" && v !== undefined && v !== null);
    const hatFormelwerte = [COLUMNS.nettoProPalette, COLUMNS.nettoProKiste].some((sp) => {
      const v = zeile[sp - 1];
      return v !== "" && v !== undefined && v !== null;
    });
    if (!hatDaten && hatFormelwerte) {
      const nr = 1 + i;
      zuLeeren.push(
        `${blattRef(JOURNAL_SHEET)}!${colLetter(COLUMNS.nettoProPalette)}${nr}:${colLetter(COLUMNS.nettoProKiste)}${nr}`
      );
    }
  }

  if (zuLeeren.length === 0) {
    bericht.uebersprungen.push("Keine Formeln in leeren Zeilen gefunden");
    return;
  }
  await sheets.spreadsheets.values.batchClear({ spreadsheetId: getSheetId(), requestBody: { ranges: zuLeeren } });
  bericht.erledigt.push(`Netto-Formeln aus ${zuLeeren.length} leeren Zeilen entfernt`);
}

/** Füllt die Anbauplanung nur, wenn sie leer ist - sonst gilt, was im Sheet steht. */
async function seedePlanung(sheets: sheets_v4.Sheets, bericht: EinrichtungsBericht): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(PLAN_SHEET)}!A${PLAN_FIRST_DATA_ROW}:B10000`,
  });
  const vorhanden = (res.data.values ?? []).filter(
    (z) => String(z[0] ?? "").trim() && String(z[1] ?? "").trim()
  );
  if (vorhanden.length > 0) {
    bericht.uebersprungen.push(`Anbauplanung enthielt schon ${vorhanden.length} Zeilen`);
    return;
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${blattRef(PLAN_SHEET)}!A${PLAN_FIRST_DATA_ROW}`,
    valueInputOption: "RAW",
    requestBody: { values: ANBAUPLANUNG_SEED.map(([schlag, sorte]) => [schlag, sorte]) },
  });
  bericht.erledigt.push(`Anbauplanung mit ${ANBAUPLANUNG_SEED.length} Zeilen gefüllt`);
}

/**
 * Setzt die Ertragsformel für jede Planungszeile, in der sie fehlt, plus den Kontrollwert.
 * Wird sowohl beim Einrichten als auch bei jedem Laden (über die Reference-Route)
 * aufgerufen - so ist der Saisonstart ohne Knopfdruck erledigt.
 */
export async function ergaenzeErtragsformeln(): Promise<number> {
  const sheets = getClient();
  const f = funktionsnamen(await holeFormelSprache(sheets));
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(PLAN_SHEET)}!A${PLAN_FIRST_DATA_ROW}:C10000`,
    valueRenderOption: "FORMULA",
  });
  const zeilen = res.data.values ?? [];
  const journalRef = blattRef(JOURNAL_SHEET);
  const netto = colLetter(COLUMNS.nettoProPalette);
  const schlagSpalte = colLetter(COLUMNS.schlag);
  const sorteSpalte = colLetter(COLUMNS.sorte);

  const daten: sheets_v4.Schema$ValueRange[] = [];
  let gesetzt = 0;

  for (let i = 0; i < zeilen.length; i++) {
    const zeile = PLAN_FIRST_DATA_ROW + i;
    const schlag = String(zeilen[i]?.[0] ?? "").trim();
    const sorte = String(zeilen[i]?.[1] ?? "").trim();
    const bisher = String(zeilen[i]?.[2] ?? "").trim();
    if (!schlag || !sorte) continue;
    if (bisher.startsWith("=")) continue;
    daten.push({
      range: `${blattRef(PLAN_SHEET)}!C${zeile}`,
      values: [
        [
          `=${f.summewenns}(${journalRef}!$${netto}:$${netto},` +
            `${journalRef}!$${schlagSpalte}:$${schlagSpalte},$A${zeile},` +
            `${journalRef}!$${sorteSpalte}:$${sorteSpalte},$B${zeile})`,
        ],
      ],
    });
    gesetzt++;
  }

  // Kontrollwert: nur Zeilen mit Schlag UND Sorte summieren (sonst zählten die früheren
  // Geisterformeln mit -25 kg mit).
  daten.push({
    range: `${blattRef(PLAN_SHEET)}!E${PLAN_HINWEIS_ROW}`,
    values: [
      [
        `="Nicht zugeordnet: " & ${f.runden}(` +
          `${f.summewenns}(${journalRef}!$${netto}:$${netto},` +
          `${journalRef}!$${schlagSpalte}:$${schlagSpalte},"<>",` +
          `${journalRef}!$${sorteSpalte}:$${sorteSpalte},"<>")` +
          ` - ${f.summe}(C${PLAN_FIRST_DATA_ROW}:C10000), 1) & " kg"`,
      ],
    ],
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: { valueInputOption: "USER_ENTERED", data: daten },
  });
  return gesetzt;
}

/**
 * Füllt die Referenzwerte einmalig aus dem bisherigen Journal, damit die App nicht bei
 * null anfängt. Danach wird das Blatt nur noch fortgeschrieben und nie neu berechnet.
 */
async function seedeReferenzwerte(sheets: sheets_v4.Sheets, bericht: EinrichtungsBericht): Promise<void> {
  const vorhanden = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(REFERENZ_SHEET)}!A${REFERENZ_FIRST_DATA_ROW}:A10000`,
  });
  if ((vorhanden.data.values ?? []).some((z) => String(z[0] ?? "").trim())) {
    bericht.uebersprungen.push("Referenzwerte waren schon gefüllt");
    return;
  }

  const journal = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(JOURNAL_SHEET)}!A1:${colLetter(COLUMNS.gebindeart)}100000`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const proSorte = new Map<string, { paletten: number; kisten: number; netto: number }>();
  for (const z of journal.data.values ?? []) {
    if (!istDatenzeile(z)) continue;
    const sorte = String(z[COLUMNS.sorte - 1] ?? "").trim();
    const brutto = Number(z[COLUMNS.gewichtBrutto - 1]);
    const kisten = Number(z[COLUMNS.anzahlKisten - 1]);
    const gebindeart = String(z[COLUMNS.gebindeart - 1] ?? "");
    if (!sorte) continue;
    const netto = netGewichtProPalette(brutto, kisten, gebindeart);
    if (!Number.isFinite(netto) || netto <= 0) continue;
    const eintrag = proSorte.get(sorte) ?? { paletten: 0, kisten: 0, netto: 0 };
    eintrag.paletten += 1;
    eintrag.kisten += kisten;
    eintrag.netto += netto;
    proSorte.set(sorte, eintrag);
  }

  if (proSorte.size === 0) {
    bericht.uebersprungen.push("Keine Referenzwerte übertragbar, Journal ist leer");
    return;
  }

  const heute = new Date().toISOString().slice(0, 10);
  const zeilen = [...proSorte.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sorte, w]) => [
      sorte,
      w.paletten,
      w.kisten,
      Math.round(w.netto * 10) / 10,
      Math.round((w.netto / w.kisten) * 100) / 100,
      heute,
    ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${blattRef(REFERENZ_SHEET)}!A${REFERENZ_FIRST_DATA_ROW}`,
    valueInputOption: "RAW",
    requestBody: { values: zeilen },
  });
  bericht.erledigt.push(`Referenzwerte für ${zeilen.length} Sorten übertragen`);
}
