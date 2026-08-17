import { gewichtProKiste, netGewichtProPalette } from "./constants";
import type { SorteStats, SorteVorwissen } from "./types";

export interface PlausibilitaetsCheck {
  /** "unmoeglich" = rechnerisch ausgeschlossen, "warnung" = auffällig, "ok" = im Rahmen. */
  status: "ok" | "warnung" | "unmoeglich";
  istWertProKiste: number;
  erwartetVon: number;
  erwartetBis: number;
  /** Worauf der Bereich beruht - nur zur Nachvollziehbarkeit, nicht für die Anzeige. */
  grundlage: "sorte" | "gemischt" | "allgemein" | "notbereich";
}

/**
 * Wie schnell die Werte der eigenen Sorte den allgemeinen Durchschnitt verdrängen.
 * Bei so vielen eigenen Paletten zählen beide gleich stark; danach überwiegt die Sorte.
 */
const SORTE_UEBERNIMMT_AB = 4;
/** Ab so vielen Zeilen im Sheet insgesamt gilt der allgemeine Durchschnitt als belastbar. */
const MIN_ALLGEMEINE_PROBEN = 8;

/** Mindestbreite des Bereichs, wenn die Sorte selbst gut belegt ist (Anteil der Mitte). */
const TOLERANZ_SORTE_BEKANNT = 0.18;
/** Mindestbreite, solange überwiegend der allgemeine Durchschnitt trägt - bewusst grosszügig. */
const TOLERANZ_SORTE_NEU = 0.3;

/** Umrechnung der mittleren absoluten Abweichung in eine Streuung wie bei der Standardabweichung. */
const MAD_ZU_SIGMA = 1.4826;
/**
 * Wie viele Streuungen breit der Bereich wird. Beim allgemeinen Durchschnitt niedriger,
 * weil dessen Streuung nicht nur die Schwankung innerhalb einer Sorte enthält, sondern
 * zusätzlich die Unterschiede zwischen den Sorten - sonst würde der Bereich zu weit.
 */
const SIGMA_FAKTOR_ALLGEMEIN = 1.8;
const SIGMA_FAKTOR_SORTE = 2.5;

/**
 * Letzter Notbereich, wenn das Sheet noch gar keine brauchbaren Zeilen enthält.
 * Nur dann sehr weit gefasst - sobald irgendwelche Daten vorliegen, greift der
 * allgemeine Durchschnitt und der Bereich wird deutlich enger.
 */
const NOTBEREICH_VON = 2;
const NOTBEREICH_BIS = 50;

/**
 * Prüft eine Eingabe gegen den erwarteten Bereich pro Kiste.
 *
 * Der Bereich entsteht gleitend: Für eine neue Sorte zählt zunächst der Durchschnitt
 * über alle Sorten (Kürbissorten liegen nicht extrem weit auseinander), mit grosszügiger
 * Toleranz. Mit jeder erfassten Palette dieser Sorte verschiebt sich das Gewicht hin zu
 * den eigenen Werten, bis der Bereich vollständig sortenspezifisch ist.
 */
export function pruefePlausibilitaet(
  gewichtBrutto: number,
  anzahlKisten: number,
  gebindeart: string | null | undefined,
  sorteStats: SorteStats | undefined,
  allgemeineStats?: SorteStats | null
): PlausibilitaetsCheck {
  const istWertProKiste = gewichtProKiste(gewichtBrutto, anzahlKisten, gebindeart);

  // Rechnerisch unmöglich: nach Abzug von Palette und Leerkisten bleibt kein Gewicht
  // übrig. Das ist kein Grenzfall, sondern immer ein Eingabefehler.
  if (!anzahlKisten || netGewichtProPalette(gewichtBrutto, anzahlKisten, gebindeart) <= 0) {
    return {
      status: "unmoeglich",
      istWertProKiste,
      erwartetVon: 0,
      erwartetBis: 0,
      grundlage: "notbereich",
    };
  }

  const bereich = bestimmeBereich(sorteStats, allgemeineStats);

  return {
    status:
      istWertProKiste < bereich.von || istWertProKiste > bereich.bis ? "warnung" : "ok",
    istWertProKiste,
    erwartetVon: bereich.von,
    erwartetBis: bereich.bis,
    grundlage: bereich.grundlage,
  };
}

function bestimmeBereich(
  sorteStats: SorteStats | undefined,
  allgemeineStats?: SorteStats | null
): { von: number; bis: number; grundlage: PlausibilitaetsCheck["grundlage"] } {
  const eigeneProben = sorteStats?.anzahlProben ?? 0;
  const allgemeinBrauchbar =
    !!allgemeineStats &&
    allgemeineStats.anzahlProben >= MIN_ALLGEMEINE_PROBEN &&
    allgemeineStats.medianProKiste > 0;

  // Nichts im Sheet und nichts zur Sorte: nur noch der weite Notbereich.
  if (!allgemeinBrauchbar && eigeneProben === 0) {
    return { von: NOTBEREICH_VON, bis: NOTBEREICH_BIS, grundlage: "notbereich" };
  }

  // Kein belastbarer Gesamtdurchschnitt, aber eigene Werte: dann nur diese.
  if (!allgemeinBrauchbar && sorteStats) {
    return {
      ...spanneAus(
        sorteStats.medianProKiste,
        sorteStats.madProKiste,
        TOLERANZ_SORTE_BEKANNT,
        SIGMA_FAKTOR_SORTE
      ),
      grundlage: "sorte",
    };
  }

  const allgemein = allgemeineStats!;

  // Gleitender Übergang: je mehr eigene Paletten, desto stärker zählen sie. Bei
  // eigeneProben = 0 ergibt das Gewicht 0, dann trägt allein der Gesamtdurchschnitt.
  const gewicht = eigeneProben / (eigeneProben + SORTE_UEBERNIMMT_AB);
  const eigenerMedian = sorteStats?.medianProKiste ?? 0;
  const eigeneStreuung = sorteStats?.madProKiste ?? 0;

  const mitte = gewicht * eigenerMedian + (1 - gewicht) * allgemein.medianProKiste;
  const streuung = gewicht * eigeneStreuung + (1 - gewicht) * allgemein.madProKiste;
  const relativeToleranz =
    TOLERANZ_SORTE_BEKANNT + (1 - gewicht) * (TOLERANZ_SORTE_NEU - TOLERANZ_SORTE_BEKANNT);
  const sigmaFaktor =
    SIGMA_FAKTOR_ALLGEMEIN + gewicht * (SIGMA_FAKTOR_SORTE - SIGMA_FAKTOR_ALLGEMEIN);

  return {
    ...spanneAus(mitte, streuung, relativeToleranz, sigmaFaktor),
    grundlage: eigeneProben === 0 ? "allgemein" : gewicht >= 0.85 ? "sorte" : "gemischt",
  };
}

function spanneAus(
  mitte: number,
  streuung: number,
  relativeToleranz: number,
  sigmaFaktor: number
) {
  const toleranz = Math.max(mitte * relativeToleranz, streuung * MAD_ZU_SIGMA * sigmaFaktor);
  return { von: Math.max(0, mitte - toleranz), bis: mitte + toleranz };
}

/**
 * Wählt den Ausgangspunkt für eine Sorte, zu der in der laufenden Saison noch nichts
 * vorliegt. Reihenfolge nach Aussagekraft: erst das Vorwissen zu genau dieser Sorte aus
 * den Vorjahren, dann der Durchschnitt aller Sorten dieser Saison, zuletzt das Vorwissen
 * über alle Sorten. Letztjährige Werte derselben Sorte sagen mehr als der heurige
 * Mittelwert über alle Sorten - deshalb stehen sie vorn.
 */
export function waehlePrior(
  sorte: string,
  vorwissen: Record<string, SorteVorwissen>,
  allgemeineStats: SorteStats | null,
  allgemeinesVorwissen: SorteVorwissen | null
): SorteStats | null {
  const eigenes = vorwissen[sorte];
  if (eigenes && eigenes.anzahlProben > 0 && eigenes.mittelProKiste > 0) {
    return vorwissenAlsStats(eigenes);
  }
  if (allgemeineStats && allgemeineStats.anzahlProben > 0) return allgemeineStats;
  if (allgemeinesVorwissen && allgemeinesVorwissen.anzahlProben > 0) {
    return vorwissenAlsStats(allgemeinesVorwissen);
  }
  return null;
}

/**
 * Das Referenzblatt führt nur Summen, keine Streuung. Streuung 0 bedeutet hier nicht
 * "keine Schwankung", sondern "unbekannt" - dann greift die grosszügige relative
 * Toleranz, was für einen Ausgangspunkt genau richtig ist.
 */
function vorwissenAlsStats(v: SorteVorwissen): SorteStats {
  return { medianProKiste: v.mittelProKiste, madProKiste: 0, anzahlProben: v.anzahlProben };
}

export function median(werte: number[]): number {
  if (werte.length === 0) return 0;
  const sortiert = [...werte].sort((a, b) => a - b);
  const mitte = Math.floor(sortiert.length / 2);
  return sortiert.length % 2 === 0
    ? (sortiert[mitte - 1] + sortiert[mitte]) / 2
    : sortiert[mitte];
}

/**
 * Mittlere absolute Abweichung vom Median. Im Gegensatz zur Standardabweichung
 * verzieht ein einzelner falsch bestätigter Ausreisser den Bereich nicht dauerhaft.
 */
export function medianAbsoluteDeviation(werte: number[], med: number): number {
  if (werte.length === 0) return 0;
  return median(werte.map((w) => Math.abs(w - med)));
}

/** Fasst eine Liste von kg-pro-Kiste-Werten zu Median und Streuung zusammen. */
export function fasseZusammen(werte: number[]): SorteStats {
  const med = median(werte);
  return {
    medianProKiste: med,
    madProKiste: medianAbsoluteDeviation(werte, med),
    anzahlProben: werte.length,
  };
}
