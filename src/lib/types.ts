// Eine Palette-Zeile, wie sie im Google Sheet steht (und wie sie lokal gehalten wird,
// solange sie noch nicht (erfolgreich) mit dem Sheet synchronisiert ist).
export interface PaletteEntry {
  id: string; // client-seitige ID, unabhängig von der Sheet-Zeile
  datum: string; // ISO-Datum "YYYY-MM-DD"
  person: string;
  schlag: string;
  sorte: string;
  gewichtBrutto: number; // Rohgewicht ab Waage, in kg
  anzahlKisten: number;
  gebindeart: string; // wird immer geschrieben, im Normalfall der Standardwert
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
  schlag: string;
  sorte: string;
  /** Startet in jeder Anlieferung wieder beim Standardwert. */
  gebindeart: string;
}

export type PaletteDraft = Pick<PaletteEntry, "anzahlKisten" | "gewichtBrutto">;

// Stammdaten & Statistik, wie sie der Server aus den drei Tabellenblättern zusammenstellt.
export interface ReferenceData {
  /** Frei erfassbar, abgeleitet aus den bisherigen Journalzeilen. */
  personen: string[];
  /** Ausschliesslich aus der Anbauplanung - keine freie Eingabe. */
  schlaege: string[];
  /** Erlaubte Sorten je Schlag, so wie sie in der Anbauplanung stehen. */
  sortenNachSchlag: Record<string, string[]>;
  /** Alle Sorten der Planung zusammen; nur für Anzeige und Notfälle. */
  sorten: string[];
  gebindearten: string[];
  /** Erwarteter kg/Kiste-Bereich je Sorte, aus den Zeilen der laufenden Saison. */
  sortenStats: Record<string, SorteStats>;
  /**
   * Dasselbe über alle Sorten der laufenden Saison zusammen. Ausgangspunkt für eine
   * Sorte, zu der noch keine eigenen Werte vorliegen.
   */
  allgemeineStats: SorteStats | null;
  /**
   * Vorwissen aus dem Referenzwerte-Blatt. Dieses Blatt wird fortgeschrieben und nie neu
   * berechnet - es übersteht damit das Leeren des Journals am Saisonstart, sodass eine
   * Sorte im neuen Jahr nicht wieder bei null anfängt.
   */
  vorwissen: Record<string, SorteVorwissen>;
  allgemeinesVorwissen: SorteVorwissen | null;
  /**
   * Ob die Anbauplanung gelesen werden konnte. Bei false darf die App die Auswahl nicht
   * einschränken - sonst stünde jemand ohne Netz vor leeren Listen und käme nicht weiter.
   */
  planungGelesen: boolean;
}

/** Fortgeschriebene Summen einer Sorte über alle Saisons. */
export interface SorteVorwissen {
  /** Netto kg pro Kiste im Schnitt: Netto kg geteilt durch Kisten. */
  mittelProKiste: number;
  anzahlProben: number;
}

export interface SorteStats {
  /** Median statt Mittelwert: unempfindlich gegen einzelne Fehleingaben im Verlauf. */
  medianProKiste: number;
  /** Mittlere absolute Abweichung vom Median. */
  madProKiste: number;
  anzahlProben: number;
}
