// Tara-Werte aus dem bestehenden Sheet übernommen (Formel dort: =Gewicht-25-Kisten*1.5)
export const PALETTE_TARA_KG = 25;
export const KISTE_TARA_KG = 1.5;

export const STANDARD_ANZAHL_KISTEN = 32;
export const STANDARD_GEBINDEART = "G2";

export const SHEET_NAME = process.env.GOOGLE_SHEET_TAB_NAME || "Tabellenblatt1";

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
