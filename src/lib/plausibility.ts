import { gewichtProKiste, netGewichtProPalette } from "./constants";
import type { SorteStats } from "./types";

export interface PlausibilitaetsCheck {
  /** "unmoeglich" = rechnerisch ausgeschlossen, "warnung" = auffällig, "ok" = im Rahmen. */
  status: "ok" | "warnung" | "unmoeglich";
  istWertProKiste: number;
  erwartetVon: number;
  erwartetBis: number;
  /** true, wenn der Bereich aus den Sheet-Daten dieser Sorte gelernt wurde. */
  ausVerlauf: boolean;
}

/** Ab so vielen früheren Paletten wird der Bereich aus den echten Daten gelernt. */
const MIN_PROBEN = 4;
/** Der gelernte Bereich ist mindestens so breit (Anteil des Medians). */
const MIN_RELATIVE_TOLERANZ = 0.18;
/** Umrechnung der mittleren absoluten Abweichung in eine Streuung wie bei der Standardabweichung. */
const MAD_ZU_SIGMA = 1.4826;
const SIGMA_FAKTOR = 2.5;

/**
 * Notbereich, solange für eine Sorte noch keine Verlaufsdaten vorliegen.
 * Absichtlich sehr weit gefasst - er soll nur groteske Tippfehler abfangen
 * (fehlende oder zusätzliche Stelle), nicht normale Schwankungen.
 */
const FALLBACK_VON_PRO_KISTE = 2;
const FALLBACK_BIS_PRO_KISTE = 50;

export function pruefePlausibilitaet(
  gewichtBrutto: number,
  anzahlKisten: number,
  stats: SorteStats | undefined
): PlausibilitaetsCheck {
  const istWertProKiste = gewichtProKiste(gewichtBrutto, anzahlKisten);

  // Rechnerisch unmöglich: nach Abzug von Palette und Leerkisten bleibt kein Gewicht
  // übrig. Das ist kein Grenzfall, sondern immer ein Eingabefehler.
  if (!anzahlKisten || netGewichtProPalette(gewichtBrutto, anzahlKisten) <= 0) {
    return {
      status: "unmoeglich",
      istWertProKiste,
      erwartetVon: 0,
      erwartetBis: 0,
      ausVerlauf: false,
    };
  }

  const gelernt = stats && stats.anzahlProben >= MIN_PROBEN;

  const { von, bis } = gelernt
    ? gelernterBereich(stats)
    : { von: FALLBACK_VON_PRO_KISTE, bis: FALLBACK_BIS_PRO_KISTE };

  return {
    status: istWertProKiste < von || istWertProKiste > bis ? "warnung" : "ok",
    istWertProKiste,
    erwartetVon: von,
    erwartetBis: bis,
    ausVerlauf: !!gelernt,
  };
}

function gelernterBereich(stats: SorteStats): { von: number; bis: number } {
  const toleranz = Math.max(
    stats.medianProKiste * MIN_RELATIVE_TOLERANZ,
    stats.madProKiste * MAD_ZU_SIGMA * SIGMA_FAKTOR
  );
  return {
    von: Math.max(0, stats.medianProKiste - toleranz),
    bis: stats.medianProKiste + toleranz,
  };
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
