/**
 * Gewicht der Palette selbst. Wird zusammen mit dem Leergut vom Waagenwert abgezogen.
 * Nicht nachgewogen - bei 295 Paletten macht 1 kg Abweichung rund 300 kg aus.
 */
export const PALETTE_TARA_KG = 25;

export interface Gebindeart {
  name: string;
  /** Leergewicht einer einzelnen leeren Kiste in kg. */
  taraKg: number;
}

/**
 * Die zulässigen Gebindearten mit ihrem Leergewicht, vom Betrieb angegeben.
 * Vorher rechnete das Sheet für jede Zeile mit 1,5 kg - also auch für IFCO-Kisten,
 * was das Netto verfälschte und über die Referenzwerte auch den Erwartungsbereich.
 */
export const GEBINDEARTEN: Gebindeart[] = [
  { name: "G2", taraKg: 1.5 },
  { name: "IFCO 6410", taraKg: 1.36 },
  { name: "IFCO 6416", taraKg: 1.68 },
  { name: "IFCO 6424", taraKg: 2.0 },
];

/**
 * Passwort für das Anlegen neuer Schläge und Sorten.
 *
 * Wird bewusst im Browser geprüft und nicht auf dem Server: Ein neuer Schlag muss auch
 * im Feld ohne Netz angelegt werden können. Damit steht das Passwort im Quelltext der
 * App und ist für jemanden, der bewusst danach sucht, auffindbar. Es verhindert, dass
 * aus Bequemlichkeit ein neuer Name getippt wird - mehr soll es nicht leisten.
 */
export const ADMIN_PASSWORT = "Sammy";

export const STANDARD_ANZAHL_KISTEN = 32;
export const STANDARD_GEBINDEART = GEBINDEARTEN[0].name;

/**
 * Leergewicht zu einer Gebindebezeichnung.
 *
 * Leer bedeutet Standardgebinde - so ist die Spalte im Sheet seit Beginn gemeint.
 * Zusätzlich wird auf die Modellnummer geprüft, damit Altbestand wie
 * "IFCO 6410 schwarz" richtig gerechnet wird und nicht auf den Standard zurückfällt.
 */
export function taraFuerGebinde(gebindeart?: string | null): number {
  const gesucht = (gebindeart ?? "").trim();
  if (!gesucht) return GEBINDEARTEN[0].taraKg;

  const genau = GEBINDEARTEN.find((g) => g.name.toLowerCase() === gesucht.toLowerCase());
  if (genau) return genau.taraKg;

  const nummer = gesucht.match(/\b(6410|6416|6424)\b/);
  if (nummer) {
    const treffer = GEBINDEARTEN.find((g) => g.name.includes(nummer[1]));
    if (treffer) return treffer.taraKg;
  }

  // Unbekannte Bezeichnung: kann nur aus Altbestand oder Handeingabe im Sheet stammen,
  // da die App nur aus der Liste oben auswählen lässt.
  return GEBINDEARTEN[0].taraKg;
}

/**
 * Die drei Tabellenblätter. Bewusst fest verdrahtet und nicht über Umgebungsvariablen:
 * Würde der Tab im Sheet umbenannt, ohne die Variable in Vercel nachzuziehen, fände die
 * App gar nichts mehr. Eine noch gesetzte GOOGLE_SHEET_TAB_NAME wird ignoriert.
 */
export const JOURNAL_SHEET = "Ertragsjournal";
export const PLAN_SHEET = "Anbauplanung Ertrag";
export const REFERENZ_SHEET = "Referenzwerte";
export const README_SHEET = "Read Me";

/**
 * Namen, unter denen das Journal stehen kann, solange die Einrichtung noch nicht gelaufen
 * ist. Ohne diese Liste würde die App vor der Einrichtung überhaupt nichts lesen können -
 * und der Knopf, der den Tab umbenennt, wäre selbst nicht erreichbar.
 */
export const ALTE_JOURNAL_TITEL = ["Tabellenblatt1", "Sheet1", "Tabelle1"];

/**
 * Blattnamen mit Leerzeichen müssen in Hochkommas stehen - sowohl in Formeln als auch in
 * Bereichsangaben an die Schnittstelle. "Anbauplanung Ertrag" ist so ein Fall.
 */
export function blattRef(name: string): string {
  return /[^A-Za-z0-9_]/.test(name) ? `'${name.replace(/'/g, "''")}'` : name;
}

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

// Reihenfolge & Bedeutung der Spalten im Ertragsjournal (1-indexiert, A=1).
// Die App liest und schreibt nach Position, nicht nach Spaltenüberschrift -
// Überschriften dürfen also umbenannt werden, ohne dass etwas kaputtgeht.
export const COLUMNS = {
  datum: 1, // A
  person: 2, // B
  schlag: 3, // C
  sorte: 4, // D
  gewichtBrutto: 5, // E
  anzahlKisten: 6, // F
  gebindeart: 7, // G
  bemerkung: 8, // H
  nettoProPalette: 9, // I (Formel)
  nettoProKiste: 10, // J (Formel)
  id: 11, // K (Palettenkennung der App)
} as const;

/** Spaltenüberschriften, die die Einrichtungsfunktion setzt. */
export const JOURNAL_HEADER = [
  "Datum",
  "Person",
  "Schlag",
  "Sorte",
  "Gewicht brutto [kg]",
  "Anzahl Gebinde",
  "Gebindeart (leer = G2)",
  "Bemerkung",
  "Netto pro Palette [kg]",
  "Netto pro Kiste [kg]",
  "ID (App)",
] as const;

// Ertragsjournal wie die Anbauplanung: Zeile 1 Hinweis, Zeile 2 Köpfe, Daten ab Zeile 3.
export const JOURNAL_HINWEIS_ROW = 1;
export const HEADER_ROW = 2;
export const FIRST_DATA_ROW = 3;

/**
 * Ob eine gelesene Journalzeile eine echte Palette ist: Gewicht und Kistenzahl sind
 * Zahlen grösser 0. Damit hängt das Lesen NICHT an einer festen Startzeile - egal ob die
 * Köpfe in Zeile 1 oder (nach der Info-Zeile) in Zeile 2 stehen, Hinweis- und Kopfzeile
 * werden zuverlässig übersprungen, weil dort in Spalte E kein Gewicht steht.
 */
export function istDatenzeile(werte: unknown[]): boolean {
  const gewicht = Number(werte[COLUMNS.gewichtBrutto - 1]);
  const kisten = Number(werte[COLUMNS.anzahlKisten - 1]);
  return Number.isFinite(gewicht) && gewicht > 0 && Number.isFinite(kisten) && kisten > 0;
}

// Anbauplanung: Zeile 1 Hinweis, Zeile 2 Überschriften, Daten ab Zeile 3.
export const PLAN_HINWEIS_ROW = 1;
export const PLAN_HEADER_ROW = 2;
export const PLAN_FIRST_DATA_ROW = 3;
export const PLAN_HEADER = ["Schlag", "Sorte", "Ertrag [kg netto]"] as const;

// Referenzwerte: Zeile 1 Überschriften, Daten ab Zeile 2.
export const REFERENZ_HEADER_ROW = 1;
export const REFERENZ_FIRST_DATA_ROW = 2;
export const REFERENZ_HEADER = [
  "Sorte",
  "Paletten",
  "Kisten",
  "Netto kg",
  "⌀ kg/Kiste",
  "Letzte Änderung",
] as const;

export function netGewichtProPalette(
  gewichtBrutto: number,
  anzahlKisten: number,
  gebindeart?: string | null
): number {
  return gewichtBrutto - PALETTE_TARA_KG - anzahlKisten * taraFuerGebinde(gebindeart);
}

export function gewichtProKiste(
  gewichtBrutto: number,
  anzahlKisten: number,
  gebindeart?: string | null
): number {
  if (anzahlKisten <= 0) return 0;
  return netGewichtProPalette(gewichtBrutto, anzahlKisten, gebindeart) / anzahlKisten;
}
