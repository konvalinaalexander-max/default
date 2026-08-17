import type { PaletteEntry } from "./types";

/**
 * Grenzen, die serverseitig erzwungen werden. Sie sind absichtlich sehr weit gefasst -
 * sie sollen keine echte Palette abweisen, sondern verhindern, dass ein Fehler in der
 * App (oder ein manipulierter Aufruf) unsinnige Werte ins Sheet schreibt.
 */
const MAX_GEWICHT_KG = 5000;
const MAX_KISTEN = 500;
const MAX_TEXTLAENGE = 100;

export interface PruefErgebnis {
  ok: boolean;
  fehler?: string;
}

function textOk(wert: unknown): boolean {
  return typeof wert === "string" && wert.trim().length > 0 && wert.length <= MAX_TEXTLAENGE;
}

/** Prüft eine eingehende Palette, bevor irgendetwas ins Sheet geschrieben wird. */
export function pruefePalette(body: unknown): PruefErgebnis {
  if (typeof body !== "object" || body === null) {
    return { ok: false, fehler: "Kein gültiger Datensatz." };
  }
  const e = body as Partial<PaletteEntry>;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.datum))) {
    return { ok: false, fehler: "Datum fehlt oder hat ein unerwartetes Format." };
  }
  for (const [name, wert] of [
    ["Person", e.person],
    ["Schlag", e.schlag],
    ["Sorte", e.sorte],
    ["Gebindeart", e.gebindeart],
  ] as const) {
    if (!textOk(wert)) return { ok: false, fehler: `${name} fehlt oder ist zu lang.` };
  }

  if (typeof e.gewichtBrutto !== "number" || !Number.isFinite(e.gewichtBrutto)) {
    return { ok: false, fehler: "Gewicht ist keine Zahl." };
  }
  if (e.gewichtBrutto <= 0 || e.gewichtBrutto > MAX_GEWICHT_KG) {
    return { ok: false, fehler: `Gewicht liegt ausserhalb von 0 bis ${MAX_GEWICHT_KG} kg.` };
  }

  const kisten = e.anzahlKisten;
  if (typeof kisten !== "number" || !Number.isInteger(kisten)) {
    return { ok: false, fehler: "Anzahl Kisten ist keine ganze Zahl." };
  }
  if (kisten <= 0 || kisten > MAX_KISTEN) {
    return { ok: false, fehler: `Anzahl Kisten liegt ausserhalb von 1 bis ${MAX_KISTEN}.` };
  }

  if (e.bemerkung !== undefined && String(e.bemerkung).length > MAX_TEXTLAENGE) {
    return { ok: false, fehler: "Bemerkung ist zu lang." };
  }

  return { ok: true };
}

/** Zeilennummern müssen im Datenbereich liegen - die Kopfzeile bleibt unantastbar. */
export function pruefeZeilennummer(row: unknown): PruefErgebnis {
  const n = Number(row);
  if (!Number.isInteger(n) || n < 2) {
    return { ok: false, fehler: "Ungültige Zeilennummer." };
  }
  return { ok: true };
}
