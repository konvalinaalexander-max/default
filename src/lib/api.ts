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

export function createPalette(entry: PaletteEntry): Promise<{ sheetRow: number }> {
  return fetch("/api/paletten", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }).then((res) => asJson<{ sheetRow: number }>(res));
}

export function updatePaletteRow(sheetRow: number, entry: PaletteEntry): Promise<void> {
  return fetch(`/api/paletten/${sheetRow}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }).then((res) => asJson(res)).then(() => undefined);
}

export function deletePaletteRow(sheetRow: number): Promise<void> {
  return fetch(`/api/paletten/${sheetRow}`, { method: "DELETE" })
    .then((res) => asJson(res))
    .then(() => undefined);
}

export function batchUpdateSessionFields(
  updates: { sheetRow: number; datum: string; person: string; feld: string; sorte: string }[]
): Promise<void> {
  return fetch("/api/paletten/batch", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  }).then((res) => asJson(res)).then(() => undefined);
}
