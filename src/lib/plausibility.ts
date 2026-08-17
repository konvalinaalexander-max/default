import { gewichtProKiste } from "./constants";
import type { SorteStats } from "./types";

export interface PlausibilitaetsCheck {
  status: "ok" | "warnung" | "keine-daten";
  istWertProKiste: number;
  erwartetVon: number;
  erwartetBis: number;
}

const MIN_PROBEN = 3;
const MIN_RELATIVE_TOLERANZ = 0.15; // mind. ±15%
const STDDEV_FAKTOR = 2.2;

export function pruefePlausibilitaet(
  gewichtBrutto: number,
  anzahlKisten: number,
  stats: SorteStats | undefined
): PlausibilitaetsCheck {
  const istWertProKiste = gewichtProKiste(gewichtBrutto, anzahlKisten);

  if (!stats || stats.anzahlProben < MIN_PROBEN || !anzahlKisten) {
    return {
      status: "keine-daten",
      istWertProKiste,
      erwartetVon: 0,
      erwartetBis: 0,
    };
  }

  const toleranz = Math.max(
    stats.mittelwertProKiste * MIN_RELATIVE_TOLERANZ,
    stats.stddevProKiste * STDDEV_FAKTOR
  );
  const erwartetVon = stats.mittelwertProKiste - toleranz;
  const erwartetBis = stats.mittelwertProKiste + toleranz;

  const status =
    istWertProKiste < erwartetVon || istWertProKiste > erwartetBis ? "warnung" : "ok";

  return { status, istWertProKiste, erwartetVon, erwartetBis };
}
