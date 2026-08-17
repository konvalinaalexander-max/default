// Eine Palette-Zeile, wie sie im Google Sheet steht (und wie sie lokal gehalten wird,
// solange sie noch nicht (erfolgreich) mit dem Sheet synchronisiert ist).
export interface PaletteEntry {
  id: string; // client-seitige ID, unabhängig von der Sheet-Zeile
  datum: string; // ISO-Datum "YYYY-MM-DD"
  person: string;
  feld: string;
  sorte: string;
  gewichtBrutto: number; // Rohgewicht ab Waage, in kg
  anzahlKisten: number;
  gebindeart?: string; // nur gesetzt, wenn abweichend vom Standard "G2"
  bemerkung?: string;
  sheetRow: number | null; // Zeilennummer im Sheet, sobald bekannt (nach erstem erfolgreichen Sync)
  syncStatus: "pending" | "syncing" | "synced" | "error";
  syncError?: string;
  createdAt: number; // Unix-Timestamp (ms), für stabile Sortierung
}

// Die "fixen" Angaben einer Anlieferung/Session – gelten als Vorschlag für die nächste Palette.
export interface SessionConfig {
  datum: string;
  person: string;
  feld: string;
  sorte: string;
}

export type PaletteDraft = Pick<PaletteEntry, "anzahlKisten" | "gewichtBrutto">;

// Stammdaten & Statistik, wie sie vom Server aus dem bisherigen Sheet-Inhalt abgeleitet werden.
export interface ReferenceData {
  personen: string[];
  felder: string[];
  sorten: string[];
  // Erwarteter kg/Kiste-Bereich je Sorte, aus den bisherigen Sheet-Zeilen gelernt.
  sortenStats: Record<string, SorteStats>;
}

export interface SorteStats {
  /** Median statt Mittelwert: unempfindlich gegen einzelne Fehleingaben im Verlauf. */
  medianProKiste: number;
  /** Mittlere absolute Abweichung vom Median. */
  madProKiste: number;
  anzahlProben: number;
}
