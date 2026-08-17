// Tara-Werte aus dem bestehenden Sheet übernommen (Formel dort: =Gewicht-25-Kisten*1.5)
export const PALETTE_TARA_KG = 25;
export const KISTE_TARA_KG = 1.5;

export const STANDARD_ANZAHL_KISTEN = 32;
export const STANDARD_GEBINDEART = "G2";

export const SHEET_NAME = process.env.GOOGLE_SHEET_TAB_NAME || "Tabellenblatt1";

/**
 * Schreibweise, in der das Datum ins Sheet geschrieben wird. Google Sheets liest den
 * Wert in der Sprache/Region des Dokuments: schreibt man in ein Sheet mit deutscher
 * Region ein ISO-Datum, landet es unter Umständen als Text in der Zelle - und eine
 * Datumsprüfung auf der Spalte markiert die Zelle dann rot.
 * "de" -> 17.08.2026, "iso" -> 2026-08-17
 */
export const SHEET_DATE_FORMAT: "de" | "iso" =
  process.env.GOOGLE_SHEET_DATE_FORMAT === "iso" ? "iso" : "de";

/** Wandelt das intern genutzte ISO-Datum in die Schreibweise des Sheets um. */
export function isoZuSheetDatum(iso: string): string {
  if (SHEET_DATE_FORMAT === "iso") return iso;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

/** Liest ein Datum aus dem Sheet zurück ins ISO-Format. */
export function sheetDatumZuIso(rohwert: unknown): string {
  const text = String(rohwert ?? "").trim();
  const deutsch = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (deutsch) {
    const [, d, m, y] = deutsch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return text;
}

// Reihenfolge & Bedeutung der Spalten im Sheet (1-indexiert, A=1)
export const COLUMNS = {
  datum: 1, // A
  person: 2, // B
  feld: 3, // C
  sorte: 4, // D
  gewichtBrutto: 5, // E
  anzahlKisten: 6, // F
  gebindeart: 7, // G
  bemerkung: 8, // H
  gewichtProPalette: 9, // I (Formel)
  gewichtProKiste: 10, // J (Formel)
} as const;

export const HEADER_ROW = 1;
export const FIRST_DATA_ROW = 2;

export function netGewichtProPalette(gewichtBrutto: number, anzahlKisten: number): number {
  return gewichtBrutto - PALETTE_TARA_KG - anzahlKisten * KISTE_TARA_KG;
}

export function gewichtProKiste(gewichtBrutto: number, anzahlKisten: number): number {
  if (anzahlKisten <= 0) return 0;
  return netGewichtProPalette(gewichtBrutto, anzahlKisten) / anzahlKisten;
}
