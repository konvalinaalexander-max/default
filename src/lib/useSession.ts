"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "./api";
import { STANDARD_GEBINDEART } from "./constants";
import { createId, todayIso } from "./id";
import type { PaletteDraft, PaletteEntry, SessionConfig } from "./types";

const STORAGE_KEY = "kuerbis-erfassung-session-v1";

interface StoredState {
  config: SessionConfig;
  entries: PaletteEntry[];
}

function defaultConfig(): SessionConfig {
  return { datum: todayIso(), person: "", feld: "", sorte: "" };
}

function loadStored(): StoredState {
  if (typeof window === "undefined") return { config: defaultConfig(), entries: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { config: defaultConfig(), entries: [] };
    const parsed = JSON.parse(raw) as StoredState;
    return {
      config: { ...defaultConfig(), ...parsed.config },
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return { config: defaultConfig(), entries: [] };
  }
}

export function useSession() {
  // Diese Komponente wird nur clientseitig gerendert (siehe AppShellLoader), daher ist ein
  // synchrones Lesen aus localStorage beim ersten Render sicher (kein SSR-Hydration-Mismatch).
  const [config, setConfigState] = useState<SessionConfig>(() => loadStored().config);
  const [entries, setEntries] = useState<PaletteEntry[]>(() => loadStored().entries);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, entries }));
  }, [config, entries]);

  const updateEntryLocal = useCallback((id: string, changes: Partial<PaletteEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  }, []);

  const addEntry = useCallback(
    (draft: PaletteDraft) => {
      const entry: PaletteEntry = {
        id: createId(),
        datum: config.datum,
        person: config.person,
        feld: config.feld,
        sorte: config.sorte,
        gewichtBrutto: draft.gewichtBrutto,
        anzahlKisten: draft.anzahlKisten,
        gebindeart: STANDARD_GEBINDEART,
        sheetRow: null,
        syncStatus: "syncing",
        createdAt: Date.now(),
      };
      setEntries((prev) => [...prev, entry]);

      api
        .createPalette(entry)
        .then(({ sheetRow }) =>
          updateEntryLocal(entry.id, { sheetRow, syncStatus: "synced", syncError: undefined })
        )
        .catch((err: Error) =>
          updateEntryLocal(entry.id, { syncStatus: "error", syncError: err.message })
        );

      return entry.id;
    },
    [config, updateEntryLocal]
  );

  type EditableFields = Partial<
    Pick<
      PaletteEntry,
      "datum" | "person" | "feld" | "sorte" | "gewichtBrutto" | "anzahlKisten" | "bemerkung"
    >
  >;

  /** Korrigiert eine einzelne Palette (z.B. falsches Gewicht/Sorte) und synct sie neu. */
  const updateEntry = useCallback(
    (id: string, changes: EditableFields) => {
      setEntries((prev) => {
        const current = prev.find((e) => e.id === id);
        // Solange eine Palette gerade synchronisiert wird, keine parallele Änderung anstossen.
        if (!current || current.syncStatus === "syncing") return prev;

        const updated: PaletteEntry = { ...current, ...changes, syncStatus: "syncing" };
        const next = prev.map((e) => (e.id === id ? updated : e));

        const task = updated.sheetRow
          ? api.updatePaletteRow(updated.sheetRow, updated)
          : api.createPalette(updated).then((res) => {
              updateEntryLocal(id, { sheetRow: res.sheetRow });
            });

        task
          .then(() => updateEntryLocal(id, { syncStatus: "synced", syncError: undefined }))
          .catch((err: Error) => updateEntryLocal(id, { syncStatus: "error", syncError: err.message }));

        return next;
      });
    },
    [updateEntryLocal]
  );

  /** Erneuter Versuch nach einem fehlgeschlagenen Sync. */
  const retryEntry = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const current = prev.find((e) => e.id === id);
        if (!current || current.syncStatus === "syncing") return prev;
        const next = prev.map((e) => (e.id === id ? { ...e, syncStatus: "syncing" as const } : e));

        const task = current.sheetRow
          ? api.updatePaletteRow(current.sheetRow, current)
          : api.createPalette(current).then((res) => updateEntryLocal(id, { sheetRow: res.sheetRow }));

        task
          .then(() => updateEntryLocal(id, { syncStatus: "synced", syncError: undefined }))
          .catch((err: Error) => updateEntryLocal(id, { syncStatus: "error", syncError: err.message }));

        return next;
      });
    },
    [updateEntryLocal]
  );

  const removeEntry = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const current = prev.find((e) => e.id === id);
        if (!current || current.syncStatus === "syncing") return prev;
        const next = prev.map((e) => (e.id === id ? { ...e, syncStatus: "syncing" as const } : e));

        const task = current.sheetRow ? api.deletePaletteRow(current.sheetRow) : Promise.resolve();
        task
          .then(() => setEntries((cur) => cur.filter((e) => e.id !== id)))
          .catch((err: Error) => updateEntryLocal(id, { syncStatus: "error", syncError: err.message }));

        return next;
      });
    },
    [updateEntryLocal]
  );

  /**
   * Ändert die Session-Vorgaben (Datum/Person/Feld/Sorte). `retro=true` korrigiert zusätzlich
   * alle bereits erfassten Paletten dieser Session (ausser solche, die gerade synchronisieren).
   */
  const applyConfigChange = useCallback(
    (changes: Partial<SessionConfig>, retro: boolean) => {
      setConfigState((prev) => ({ ...prev, ...changes }));
      if (!retro) return;

      setEntries((prev) => {
        const affected = prev.filter((e) => e.syncStatus !== "syncing");
        const next = prev.map((e) =>
          e.syncStatus === "syncing" ? e : { ...e, ...changes, syncStatus: "syncing" as const }
        );

        const withSheetRow = affected.filter(
          (e): e is PaletteEntry & { sheetRow: number } => e.sheetRow !== null
        );

        if (withSheetRow.length > 0) {
          const updates = withSheetRow.map((e) => ({
            sheetRow: e.sheetRow,
            datum: changes.datum ?? e.datum,
            person: changes.person ?? e.person,
            feld: changes.feld ?? e.feld,
            sorte: changes.sorte ?? e.sorte,
          }));
          api
            .batchUpdateSessionFields(updates)
            .then(() =>
              withSheetRow.forEach((e) =>
                updateEntryLocal(e.id, { syncStatus: "synced", syncError: undefined })
              )
            )
            .catch((err: Error) =>
              withSheetRow.forEach((e) =>
                updateEntryLocal(e.id, { syncStatus: "error", syncError: err.message })
              )
            );
        }

        return next;
      });
    },
    [updateEntryLocal]
  );

  const startNewSession = useCallback(() => {
    setEntries([]);
    setConfigState((prev) => ({ ...defaultConfig(), datum: prev.datum, person: prev.person }));
  }, []);

  return {
    config,
    entries,
    addEntry,
    updateEntry,
    retryEntry,
    removeEntry,
    applyConfigChange,
    startNewSession,
  };
}

export type UseSessionResult = ReturnType<typeof useSession>;
