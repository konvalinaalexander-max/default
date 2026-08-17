import type { PaletteEntry, ReferenceData } from "./types";

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Serverfehler (${res.status})`);
  }
  return res.json();
}

export function fetchReferenceData(): Promise<ReferenceData> {
  return fetch("/api/reference").then((res) => asJson<ReferenceData>(res));
}

/**
 * @param istWiederholung Bei true prüft der Server zuerst, ob die Palette schon im Sheet
 * steht. Nötig, weil eine verlorene Antwort auf einen erfolgreichen Schreibvorgang sonst
 * zu einer zweiten identischen Zeile führt - und die würde in den Ertrag einfliessen.
 */
export function createPalette(
  entry: PaletteEntry,
  istWiederholung = false
): Promise<{ sheetRow: number }> {
  return fetch("/api/paletten", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...entry, istWiederholung }),
  }).then((res) => asJson<{ sheetRow: number }>(res));
}

/** Legt ein Schlag-Sorte-Paar in der Anbauplanung an. */
export function createPlanung(
  schlag: string,
  sorte: string,
  passwort: string
): Promise<void> {
  return fetch("/api/planung", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schlag, sorte, passwort }),
  })
    .then((res) => asJson(res))
    .then(() => undefined);
}

export interface EinrichtungsBericht {
  erledigt: string[];
  uebersprungen: string[];
  formelSprache: "englisch" | "deutsch";
}

export function richteSheetEin(passwort: string): Promise<EinrichtungsBericht> {
  return fetch("/api/einrichten", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passwort }),
  }).then((res) => asJson<EinrichtungsBericht>(res));
}

export function updatePaletteRow(sheetRow: number, entry: PaletteEntry): Promise<void> {
  return fetch(`/api/paletten/${sheetRow}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }).then((res) => asJson(res)).then(() => undefined);
}

/** Der erwartete Inhalt wird mitgeschickt, damit der Server die Zeile vor dem Löschen prüft. */
export function deletePaletteRow(sheetRow: number, entry: PaletteEntry): Promise<void> {
  return fetch(`/api/paletten/${sheetRow}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  })
    .then((res) => asJson(res))
    .then(() => undefined);
}

export function batchUpdateSessionFields(
  updates: { sheetRow: number; datum: string; person: string; schlag: string; sorte: string }[]
): Promise<void> {
  return fetch("/api/paletten/batch", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  }).then((res) => asJson(res)).then(() => undefined);
}
