import "server-only";
import { sheets_v4 } from "googleapis";
import { ANBAUPLANUNG_SEED } from "./anbauplanungSeed";
import {
  COLUMNS,
  FIRST_DATA_ROW,
  HEADER_ROW,
  JOURNAL_HEADER,
  JOURNAL_SHEET,
  PLAN_FIRST_DATA_ROW,
  PLAN_HEADER,
  PLAN_HEADER_ROW,
  PLAN_HINWEIS_ROW,
  PLAN_SHEET,
  REFERENZ_FIRST_DATA_ROW,
  REFERENZ_HEADER,
  REFERENZ_HEADER_ROW,
  REFERENZ_SHEET,
  netGewichtProPalette,
  blattRef,
} from "./constants";
import { colLetter, getClient, getSheetId } from "./googleSheets";

export const DOKUMENT_TITEL = "Kürbis Anbauplanung Journal Ertrag";
const SICHERUNG_TITEL = "Ertragsjournal Sicherung";

/** Tab-Namen, unter denen das Journal vor der Umbenennung stehen kann. */
const ALTE_JOURNAL_TITEL = ["Tabellenblatt1", "Sheet1", "Tabelle1"];

export const PLAN_HINWEIS =
  "SAISONSTART: Nur die Zeilen ab Zeile 3 löschen und die neue Anbauplanung direkt " +
  "darunter einfügen — ohne Leerzeile dazwischen. Nur Spalte A (Schlag) und Spalte B " +
  "(Sorte) ausfüllen; Spalte C (Ertrag) rechnet sich selbst und wird von der App " +
  "ergänzt. Zeile 2 mit den Spaltenköpfen nicht verändern. Die Schreibweise gilt genau " +
  "so, wie sie in der App erscheint — Namen während der Saison nicht mehr ändern, sonst " +
  "finden bereits erfasste Paletten ihren Ertrag nicht mehr.";

const JOURNAL_NOTIZ =
  "Zeile 1 sind die Spaltenköpfe — nicht löschen. Beim Saisonstart nur die Zeilen ab " +
  "Zeile 2 löschen. Die App schreibt neue Einträge automatisch unter den letzten " +
  "Eintrag; ist alles gelöscht, beginnt sie wieder in Zeile 2. Die Spalten I, J und K " +
  "werden von der App gesetzt — nicht von Hand ändern.";

export interface EinrichtungsBericht {
  erledigt: string[];
  uebersprungen: string[];
  formelSprache: "englisch" | "deutsch";
}

interface BlattInfo {
  titel: string;
  gid: number;
  zeilen: number;
  spalten: number;
  frozenRows: number;
}

/**
 * Richtet das Dokument einmalig ein und kann jederzeit erneut laufen: Jeder Schritt
 * prüft zuerst, ob er schon erledigt ist. Datenzeilen werden nie gelöscht.
 */
export async function richteSheetEin(): Promise<EinrichtungsBericht> {
  const sheets = getClient();
  const bericht: EinrichtungsBericht = {
    erledigt: [],
    uebersprungen: [],
    formelSprache: "englisch",
  };

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields:
      "properties.title,sheets.properties(sheetId,title,gridProperties),sheets.protectedRanges(protectedRangeId,range),sheets.merges",
  });

  const blaetter: BlattInfo[] = (meta.data.sheets ?? []).map((s) => ({
    titel: s.properties?.title ?? "",
    gid: s.properties?.sheetId ?? 0,
    zeilen: s.properties?.gridProperties?.rowCount ?? 1000,
    spalten: s.properties?.gridProperties?.columnCount ?? 26,
    frozenRows: s.properties?.gridProperties?.frozenRowCount ?? 0,
  }));

  const journal = await findeJournal(blaetter, bericht);

  // --- Sicherungskopie, bevor irgendetwas verändert wird ---
  await legeSicherungAn(sheets, blaetter, journal, bericht);

  // --- Fehlende Blätter anlegen ---
  const plan = await stelleBlattSicher(sheets, blaetter, PLAN_SHEET, bericht);
  const referenz = await stelleBlattSicher(sheets, blaetter, REFERENZ_SHEET, bericht);

  // Ob die Schnittstelle Formeln auf Englisch oder Deutsch erwartet, hängt an der
  // Spracheinstellung des Dokuments. Statt zu raten wird es einmal ausprobiert.
  formelSpracheCache = await ermittleFormelSprache(sheets, referenz.titel);
  bericht.formelSprache = formelSpracheCache;

  // --- Dokument und Journal-Tab umbenennen ---
  const anfragen: sheets_v4.Schema$Request[] = [];

  if (meta.data.properties?.title !== DOKUMENT_TITEL) {
    anfragen.push({
      updateSpreadsheetProperties: {
        properties: { title: DOKUMENT_TITEL },
        fields: "title",
      },
    });
    bericht.erledigt.push(`Dokument umbenannt in "${DOKUMENT_TITEL}"`);
  } else {
    bericht.uebersprungen.push("Dokumentname war schon richtig");
  }

  if (journal.titel !== JOURNAL_SHEET) {
    anfragen.push({
      updateSheetProperties: {
        properties: { sheetId: journal.gid, title: JOURNAL_SHEET },
        fields: "title",
      },
    });
    bericht.erledigt.push(`Tabellenblatt "${journal.titel}" umbenannt in "${JOURNAL_SHEET}"`);
  } else {
    bericht.uebersprungen.push("Journal-Tab hiess schon richtig");
  }

  // --- Spalte K muss existieren, sonst lässt sich die Kennung nicht schreiben ---
  if (journal.spalten < COLUMNS.id) {
    anfragen.push({
      appendDimension: {
        sheetId: journal.gid,
        dimension: "COLUMNS",
        length: COLUMNS.id - journal.spalten,
      },
    });
  }

  // --- Kopfzeilen einfrieren ---
  anfragen.push(
    ...einfrieren(journal.gid, journal.frozenRows, HEADER_ROW, "Ertragsjournal", bericht)
  );
  anfragen.push(...einfrieren(plan.gid, plan.frozenRows, PLAN_HEADER_ROW, "Anbauplanung", bericht));
  anfragen.push(
    ...einfrieren(referenz.gid, referenz.frozenRows, REFERENZ_HEADER_ROW, "Referenzwerte", bericht)
  );

  // --- Notiz am Journal-Kopf, ID-Spalte ausblenden ---
  anfragen.push({
    updateCells: {
      range: {
        sheetId: journal.gid,
        startRowIndex: HEADER_ROW - 1,
        endRowIndex: HEADER_ROW,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      rows: [{ values: [{ note: JOURNAL_NOTIZ }] }],
      fields: "note",
    },
  });
  anfragen.push({
    updateDimensionProperties: {
      range: {
        sheetId: journal.gid,
        dimension: "COLUMNS",
        startIndex: COLUMNS.id - 1,
        endIndex: COLUMNS.id,
      },
      properties: { hiddenByUser: true },
      fields: "hiddenByUser",
    },
  });

  // --- Hinweiszeile der Anbauplanung über A1:C1 verbinden und umbrechen ---
  const planMerges = (meta.data.sheets ?? []).find((s) => s.properties?.sheetId === plan.gid)
    ?.merges;
  const schonVerbunden = (planMerges ?? []).some(
    (m) => m.startRowIndex === PLAN_HINWEIS_ROW - 1 && m.endColumnIndex === PLAN_HEADER.length
  );
  if (!schonVerbunden) {
    anfragen.push({
      mergeCells: {
        range: {
          sheetId: plan.gid,
          startRowIndex: PLAN_HINWEIS_ROW - 1,
          endRowIndex: PLAN_HINWEIS_ROW,
          startColumnIndex: 0,
          endColumnIndex: PLAN_HEADER.length,
        },
        mergeType: "MERGE_ALL",
      },
    });
  }
  anfragen.push({
    repeatCell: {
      range: {
        sheetId: plan.gid,
        startRowIndex: PLAN_HINWEIS_ROW - 1,
        endRowIndex: PLAN_HINWEIS_ROW,
        startColumnIndex: 0,
        endColumnIndex: PLAN_HEADER.length,
      },
      cell: {
        userEnteredFormat: {
          wrapStrategy: "WRAP",
          verticalAlignment: "TOP",
          textFormat: { bold: true },
        },
      },
      fields: "userEnteredFormat(wrapStrategy,verticalAlignment,textFormat)",
    },
  });

  // --- Kopfzeilen fett ---
  for (const [gid, zeile, breite] of [
    [journal.gid, HEADER_ROW, JOURNAL_HEADER.length],
    [plan.gid, PLAN_HEADER_ROW, PLAN_HEADER.length],
    [referenz.gid, REFERENZ_HEADER_ROW, REFERENZ_HEADER.length],
  ] as const) {
    anfragen.push({
      repeatCell: {
        range: {
          sheetId: gid,
          startRowIndex: zeile - 1,
          endRowIndex: zeile,
          startColumnIndex: 0,
          endColumnIndex: breite,
        },
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: "userEnteredFormat.textFormat.bold",
      },
    });
  }

  // --- Schutz der Kopfzeilen (mit Warnung, damit niemand ausgesperrt wird) ---
  const bestehendeSchutzbereiche = (meta.data.sheets ?? []).flatMap((s) =>
    (s.protectedRanges ?? []).map((p) => ({ gid: s.properties?.sheetId, range: p.range }))
  );
  anfragen.push(
    ...schutz(journal.gid, 0, HEADER_ROW, bestehendeSchutzbereiche, "Ertragsjournal", bericht)
  );
  anfragen.push(
    ...schutz(plan.gid, 0, PLAN_HEADER_ROW, bestehendeSchutzbereiche, "Anbauplanung", bericht)
  );
  anfragen.push(
    ...schutz(
      referenz.gid,
      0,
      REFERENZ_HEADER_ROW,
      bestehendeSchutzbereiche,
      "Referenzwerte",
      bericht
    )
  );

  if (anfragen.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSheetId(),
      requestBody: { requests: anfragen },
    });
  }

  // --- Werte schreiben (nach dem Umbenennen, damit die Bereiche stimmen) ---
  await schreibeKopfzeilen(sheets, bericht);
  await entferneGeisterformeln(sheets, bericht);
  await seedePlanung(sheets, bericht);
  const gesetzt = await ergaenzeErtragsformeln();
  if (gesetzt > 0) bericht.erledigt.push(`${gesetzt} Ertragsformeln gesetzt`);
  else bericht.uebersprungen.push("Ertragsformeln waren schon vorhanden");
  bericht.erledigt.push("Kontrollwert in E1 der Anbauplanung gesetzt");
  await seedeReferenzwerte(sheets, bericht);

  return bericht;
}

/**
 * Findet das Journal und prüft, dass es wirklich das Journal ist. Bricht lieber ab, als
 * in ein unbekanntes Blatt zu schreiben.
 */
async function findeJournal(
  blaetter: BlattInfo[],
  bericht: EinrichtungsBericht
): Promise<BlattInfo> {
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
    range: `${nachTitel.titel}!A${HEADER_ROW}:C${FIRST_DATA_ROW}`,
  });
  const zeilen = kopf.data.values ?? [];
  const a1 = String(zeilen[0]?.[0] ?? "").trim();
  const b1 = String(zeilen[0]?.[1] ?? "").trim();
  const istLeer = zeilen.length === 0;

  // Entweder erkennbar das Journal, oder noch komplett leer. Alles andere wäre ein
  // fremdes Blatt - dort darf die Einrichtung nichts anfassen.
  const erkannt = a1.toLowerCase().startsWith("datum") && b1.toLowerCase().startsWith("person");
  if (!istLeer && !erkannt) {
    throw new Error(
      `"${nachTitel.titel}" sieht nicht wie das Ertragsjournal aus (A1="${a1}", B1="${b1}"). ` +
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
    range: `${journal.titel}!A${FIRST_DATA_ROW}:A${FIRST_DATA_ROW + 2}`,
  });
  if ((daten.data.values ?? []).length === 0) {
    bericht.uebersprungen.push("Keine Sicherung nötig, Journal ist leer");
    return;
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [
        { duplicateSheet: { sourceSheetId: journal.gid, newSheetName: SICHERUNG_TITEL } },
      ],
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
    zeilen: props?.gridProperties?.rowCount ?? 1000,
    spalten: props?.gridProperties?.columnCount ?? 26,
    frozenRows: 0,
  };
}

function einfrieren(
  gid: number,
  aktuell: number,
  soll: number,
  name: string,
  bericht: EinrichtungsBericht
): sheets_v4.Schema$Request[] {
  if (aktuell >= soll) {
    bericht.uebersprungen.push(`${name}: Kopfzeile war schon eingefroren`);
    return [];
  }
  bericht.erledigt.push(`${name}: Kopfzeile eingefroren`);
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
 * Schutz mit Warnung statt hartem Sperren: Wer die Kopfzeile ändern will, bekommt eine
 * Rückfrage. Ein harter Schutz würde den Betriebsleiter selbst aussperren, sobald einmal
 * etwas angepasst werden muss - das wäre schlimmer als das Problem.
 */
function schutz(
  gid: number,
  startZeileNull: number,
  bisZeile: number,
  bestehende: { gid?: number | null; range?: sheets_v4.Schema$GridRange }[],
  name: string,
  bericht: EinrichtungsBericht
): sheets_v4.Schema$Request[] {
  const schonDa = bestehende.some(
    (b) => b.gid === gid && (b.range?.endRowIndex ?? 0) >= bisZeile && !b.range?.startColumnIndex
  );
  if (schonDa) {
    bericht.uebersprungen.push(`${name}: Kopfzeile war schon geschützt`);
    return [];
  }
  bericht.erledigt.push(`${name}: Kopfzeile geschützt (mit Warnung)`);
  return [
    {
      addProtectedRange: {
        protectedRange: {
          range: { sheetId: gid, startRowIndex: startZeileNull, endRowIndex: bisZeile },
          description: "Kopfzeile - bitte nicht löschen",
          warningOnly: true,
        },
      },
    },
  ];
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
  if (!formelSpracheCache) {
    formelSpracheCache = await ermittleFormelSprache(sheets, REFERENZ_SHEET);
  }
  return formelSpracheCache;
}

/**
 * Probiert eine englische Formel aus und liest das Ergebnis zurück. Je nach
 * Spracheinstellung des Dokuments erwartet die Schnittstelle englische oder deutsche
 * Funktionsnamen; raten wäre unnötig, ein einziger Versuch klärt es.
 */
async function ermittleFormelSprache(
  sheets: sheets_v4.Sheets,
  blatt: string
): Promise<"englisch" | "deutsch"> {
  const probe = `${blatt}!Z1`;
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
    const wert = res.data.values?.[0]?.[0];
    return Number(wert) === 1 ? "englisch" : "deutsch";
  } catch {
    return "deutsch";
  } finally {
    await sheets.spreadsheets.values
      .clear({ spreadsheetId: getSheetId(), range: probe })
      .catch(() => undefined);
  }
}

async function schreibeKopfzeilen(
  sheets: sheets_v4.Sheets,
  bericht: EinrichtungsBericht
): Promise<void> {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: `${blattRef(JOURNAL_SHEET)}!A${HEADER_ROW}:${colLetter(JOURNAL_HEADER.length)}${HEADER_ROW}`,
          values: [[...JOURNAL_HEADER]],
        },
        {
          range: `${blattRef(PLAN_SHEET)}!A${PLAN_HINWEIS_ROW}`,
          values: [[PLAN_HINWEIS]],
        },
        {
          range: `${blattRef(PLAN_SHEET)}!A${PLAN_HEADER_ROW}:${colLetter(PLAN_HEADER.length)}${PLAN_HEADER_ROW}`,
          values: [[...PLAN_HEADER]],
        },
        {
          range: `${blattRef(REFERENZ_SHEET)}!A${REFERENZ_HEADER_ROW}:${colLetter(REFERENZ_HEADER.length)}${REFERENZ_HEADER_ROW}`,
          values: [[...REFERENZ_HEADER]],
        },
      ],
    },
  });
  bericht.erledigt.push(
    "Spaltenköpfe gesetzt (Feld → Schlag, Brutto → Netto bei den berechneten Spalten)"
  );
}

/**
 * Entfernt die Netto-Formeln aus Zeilen, in denen gar keine Palette steht.
 *
 * Im Journal waren sie bis Zeile 1000 hinuntergezogen. In einer leeren Zeile ergibt
 * "=E-25-F*1.5" jeweils -25 und die Spalte daneben #DIV/0!. Über 688 Zeilen summiert sich
 * das auf -17'200 kg - wer die Nettospalte von Hand zusammenzählt, erhält einen völlig
 * falschen Wert. Ausserdem hält append() die Tabelle dadurch für 1000 Zeilen lang.
 *
 * Angetastet werden nur Zeilen, in denen die Spalten A bis H komplett leer sind - dort
 * kann keine Palette verloren gehen.
 */
async function entferneGeisterformeln(
  sheets: sheets_v4.Sheets,
  bericht: EinrichtungsBericht
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${blattRef(JOURNAL_SHEET)}!A${FIRST_DATA_ROW}:${colLetter(COLUMNS.nettoProKiste)}100000`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const zeilen = res.data.values ?? [];

  const zuLeeren: string[] = [];
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i] ?? [];
    const hatDaten = zeile
      .slice(0, COLUMNS.bemerkung)
      .some((v) => v !== "" && v !== undefined && v !== null);
    const hatFormelwerte = [COLUMNS.nettoProPalette, COLUMNS.nettoProKiste].some((sp) => {
      const v = zeile[sp - 1];
      return v !== "" && v !== undefined && v !== null;
    });
    if (!hatDaten && hatFormelwerte) {
      const nr = FIRST_DATA_ROW + i;
      zuLeeren.push(
        `${blattRef(JOURNAL_SHEET)}!${colLetter(COLUMNS.nettoProPalette)}${nr}:${colLetter(COLUMNS.nettoProKiste)}${nr}`
      );
    }
  }

  if (zuLeeren.length === 0) {
    bericht.uebersprungen.push("Keine Formeln in leeren Zeilen gefunden");
    return;
  }

  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: getSheetId(),
    requestBody: { ranges: zuLeeren },
  });
  bericht.erledigt.push(
    `Netto-Formeln aus ${zuLeeren.length} leeren Zeilen entfernt (ergaben je -25 kg)`
  );
}

/** Füllt die Anbauplanung nur, wenn sie leer ist - sonst gilt, was im Sheet steht. */
async function seedePlanung(
  sheets: sheets_v4.Sheets,
  bericht: EinrichtungsBericht
): Promise<void> {
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
 * Setzt die Ertragsformel für jede Planungszeile, in der sie fehlt. Dadurch darf am
 * Saisonstart einfach Schlag und Sorte eingefügt werden - die Spalte C ergänzt die App.
 * Zusätzlich der Kontrollwert: Steht dort nicht 0, gibt es Paletten, deren Schlag-Sorte-
 * Kombination in der Planung fehlt - etwa nach einem Umbenennen.
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

  /**
   * Kontrollwert neben dem Hinweis: Journal-Gesamtsumme minus Summe aller Erträge.
   *
   * Die Gesamtsumme darf nicht einfach SUM über die Nettospalte sein: Im Journal sind die
   * Formeln bis Zeile 1000 hinuntergezogen und ergeben in leeren Zeilen jeweils -25.
   * Über 688 solche Zeilen wären das -17'200 kg, der Kontrollwert wäre unbrauchbar.
   * Deshalb wird nur summiert, wo auch Schlag und Sorte stehen.
   */
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
 * null anfängt. Danach wird das Blatt nur noch fortgeschrieben und nie neu berechnet -
 * so übersteht es das Leeren des Journals am Saisonstart.
 */
async function seedeReferenzwerte(
  sheets: sheets_v4.Sheets,
  bericht: EinrichtungsBericht
): Promise<void> {
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
    range: `${blattRef(JOURNAL_SHEET)}!A${FIRST_DATA_ROW}:${colLetter(COLUMNS.gebindeart)}100000`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const proSorte = new Map<string, { paletten: number; kisten: number; netto: number }>();
  for (const z of journal.data.values ?? []) {
    const sorte = String(z[COLUMNS.sorte - 1] ?? "").trim();
    const brutto = Number(z[COLUMNS.gewichtBrutto - 1]);
    const kisten = Number(z[COLUMNS.anzahlKisten - 1]);
    const gebindeart = String(z[COLUMNS.gebindeart - 1] ?? "");
    if (!sorte || !Number.isFinite(brutto) || !Number.isFinite(kisten) || kisten <= 0) continue;
    // Bewusst neu gerechnet und nicht aus Spalte I gelesen: Dort steckt für die eine
    // IFCO-Zeile noch das Leergut des Standardgebindes.
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
