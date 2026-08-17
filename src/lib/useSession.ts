"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./api";
import { STANDARD_GEBINDEART } from "./constants";
import { createId, todayIso } from "./id";
import type { PaletteDraft, PaletteEntry, SessionConfig } from "./types";

const STORAGE_KEY = "kuerbis-erfassung-session-v1";
/** Zwei identische Eingaben innerhalb dieser Zeit gelten als versehentlicher Doppelklick. */
const DOPPELKLICK_FENSTER_MS = 2000;
/** Abstand, in dem fehlgeschlagene Zeilen erneut gesendet werden. */
const WIEDERHOLUNG_INTERVALL_MS = 20_000;
/**
 * Nach dieser Pause wird gefragt, ob die Anlieferung noch läuft. Absichtlich eine
 * Frage und kein automatisches Zurücksetzen: erfasste Daten dürfen nie ungefragt
 * verschwinden. Eine kurze Pause zwischen zwei Paletten dauert Minuten, ein neuer
 * Lastwagen kommt Stunden später - eine Stunde trennt die beiden Fälle gut.
 */
const INAKTIV_SCHWELLE_MS = 60 * 60 * 1000;

interface StoredState {
  config: SessionConfig;
  entries: PaletteEntry[];
  /** Zeitpunkt der letzten Eingabe - Grundlage für die Inaktivitätsfrage. */
  letzteAktivitaet: number;
}

function defaultConfig(): SessionConfig {
  return {
    datum: todayIso(),
    person: "",
    feld: "",
    sorte: "",
    gebindeart: STANDARD_GEBINDEART,
  };
}

function loadStored(): StoredState {
  const leer = { config: defaultConfig(), entries: [], letzteAktivitaet: Date.now() };
  if (typeof window === "undefined") return leer;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return leer;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return {
      config: { ...defaultConfig(), ...parsed.config },
      // Beim Laden gilt alles als offen, was beim Schliessen noch unterwegs war -
      // sonst bliebe eine Zeile für immer im Zustand "wird gespeichert" hängen.
      entries: entries.map((e) => ({
        ...e,
        // Ältere gespeicherte Zeilen kennen das Feld noch nicht.
        gebindeart: e.gebindeart || STANDARD_GEBINDEART,
        syncStatus: e.syncStatus === "syncing" ? ("error" as const) : e.syncStatus,
      })),
      letzteAktivitaet:
        typeof parsed.letzteAktivitaet === "number"
          ? parsed.letzteAktivitaet
          : entries.reduce((max, e) => Math.max(max, e.createdAt ?? 0), 0) || Date.now(),
    };
  } catch {
    return leer;
  }
}

export function useSession() {
  // Diese Komponente wird nur clientseitig gerendert (siehe AppShellLoader), daher ist ein
  // synchrones Lesen aus localStorage beim ersten Render sicher (kein SSR-Hydration-Mismatch).
  const [config, setConfigState] = useState<SessionConfig>(() => loadStored().config);
  const [entries, setEntries] = useState<PaletteEntry[]>(() => loadStored().entries);
  const [letzteAktivitaet, setLetzteAktivitaet] = useState<number>(
    () => loadStored().letzteAktivitaet
  );
  const [pauseZuLang, setPauseZuLang] = useState(false);

  // Für Hintergrundaufgaben (Wiederholung) immer der aktuelle Stand, ohne Neustart des Timers.
  const entriesRef = useRef(entries);
  const letzteEingabe = useRef<{ signatur: string; zeit: number } | null>(null);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ config, entries, letzteAktivitaet })
    );
  }, [config, entries, letzteAktivitaet]);

  /**
   * Prüft, ob seit der letzten Eingabe zu viel Zeit vergangen ist. Läuft bewusst
   * ausserhalb des Renderns: beim Zurückkehren aus dem Hintergrund (anderes Programm,
   * Bildschirm gesperrt) und zusätzlich in festem Abstand, falls die App offen liegt.
   */
  useEffect(() => {
    const pruefe = () =>
      setPauseZuLang(
        entries.length > 0 && Date.now() - letzteAktivitaet > INAKTIV_SCHWELLE_MS
      );
    const beiRueckkehr = () => {
      if (document.visibilityState === "visible") pruefe();
    };

    const sofort = window.setTimeout(pruefe, 0);
    const timer = window.setInterval(pruefe, 60_000);
    document.addEventListener("visibilitychange", beiRueckkehr);
    return () => {
      window.clearTimeout(sofort);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beiRueckkehr);
    };
  }, [entries.length, letzteAktivitaet]);

  const updateEntryLocal = useCallback((id: string, changes: Partial<PaletteEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  }, []);

  /** Schickt eine Zeile ans Sheet und pflegt den Status nach. */
  const sende = useCallback(
    (entry: PaletteEntry) => {
      const fertig = () => updateEntryLocal(entry.id, { syncStatus: "synced", syncError: undefined });
      const fehler = (err: Error) =>
        updateEntryLocal(entry.id, { syncStatus: "error", syncError: err.message });

      if (entry.sheetRow) {
        api.updatePaletteRow(entry.sheetRow, entry).then(fertig).catch(fehler);
      } else {
        api
          .createPalette(entry)
          .then(({ sheetRow }) =>
            updateEntryLocal(entry.id, { sheetRow, syncStatus: "synced", syncError: undefined })
          )
          .catch(fehler);
      }
    },
    [updateEntryLocal]
  );

  const addEntry = useCallback(
    (draft: PaletteDraft & { gebindeart?: string }) => {
      // Schutz gegen versehentliches doppeltes Tippen auf "Weiter" - mit Handschuhen
      // oder bei Verzögerung im Netz passiert das sonst leicht.
      const signatur = `${config.sorte}|${config.feld}|${draft.gewichtBrutto}|${draft.anzahlKisten}`;
      const jetzt = Date.now();
      const vorher = letzteEingabe.current;
      if (vorher && vorher.signatur === signatur && jetzt - vorher.zeit < DOPPELKLICK_FENSTER_MS) {
        return null;
      }
      letzteEingabe.current = { signatur, zeit: jetzt };

      const entry: PaletteEntry = {
        id: createId(),
        datum: config.datum,
        person: config.person,
        feld: config.feld,
        sorte: config.sorte,
        gewichtBrutto: draft.gewichtBrutto,
        anzahlKisten: draft.anzahlKisten,
        gebindeart: draft.gebindeart || config.gebindeart || STANDARD_GEBINDEART,
        sheetRow: null,
        syncStatus: "syncing",
        createdAt: jetzt,
      };
      setEntries((prev) => [...prev, entry]);
      setLetzteAktivitaet(jetzt);
      sende(entry);
      return entry.id;
    },
    [config, sende]
  );

  type EditableFields = Partial<
    Pick<
      PaletteEntry,
      "datum" | "person" | "feld" | "sorte" | "gewichtBrutto" | "anzahlKisten" | "bemerkung"
    >
  >;

  /** Korrigiert eine einzelne Palette (z.B. falsches Gewicht) und schickt sie neu. */
  const updateEntry = useCallback(
    (id: string, changes: EditableFields) => {
      const current = entriesRef.current.find((e) => e.id === id);
      if (!current || current.syncStatus === "syncing") return;
      const updated: PaletteEntry = { ...current, ...changes, syncStatus: "syncing" };
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      sende(updated);
    },
    [sende]
  );

  /** Erneuter Versuch nach einem fehlgeschlagenen Senden. */
  const retryEntry = useCallback(
    (id: string) => {
      const current = entriesRef.current.find((e) => e.id === id);
      if (!current || current.syncStatus === "syncing") return;
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, syncStatus: "syncing" as const } : e))
      );
      sende({ ...current, syncStatus: "syncing" });
    },
    [sende]
  );

  // Offene Zeilen automatisch nachsenden: sobald das Netz zurück ist und zusätzlich
  // in festem Abstand. Ohne das müsste die Person den Fehler selbst bemerken.
  useEffect(() => {
    const nachsenden = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      for (const e of entriesRef.current) {
        if (e.syncStatus === "error") retryEntry(e.id);
      }
    };
    const timer = window.setInterval(nachsenden, WIEDERHOLUNG_INTERVALL_MS);
    window.addEventListener("online", nachsenden);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", nachsenden);
    };
  }, [retryEntry]);

  const removeEntry = useCallback(
    (id: string) => {
      const current = entriesRef.current.find((e) => e.id === id);
      if (!current || current.syncStatus === "syncing") return;

      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, syncStatus: "syncing" as const } : e))
      );

      const geloeschteZeile = current.sheetRow;
      const task = geloeschteZeile
        ? api.deletePaletteRow(geloeschteZeile, current)
        : Promise.resolve();

      task
        .then(() =>
          setEntries((prev) =>
            prev
              .filter((e) => e.id !== id)
              // Die Zeile ist wirklich aus dem Sheet entfernt, alles darunter rutscht
              // eine Zeile hoch. Ohne diese Korrektur würde eine spätere Änderung die
              // falsche Zeile überschreiben.
              .map((e) =>
                geloeschteZeile && e.sheetRow && e.sheetRow > geloeschteZeile
                  ? { ...e, sheetRow: e.sheetRow - 1 }
                  : e
              )
          )
        )
        .catch((err: Error) =>
          updateEntryLocal(id, { syncStatus: "error", syncError: err.message })
        );
    },
    [updateEntryLocal]
  );

  /**
   * Ändert die Vorgaben der Anlieferung. `retro=true` korrigiert zusätzlich alle bereits
   * erfassten Paletten (ausser solche, die gerade gesendet werden).
   */
  const applyConfigChange = useCallback(
    (changes: Partial<SessionConfig>, retro: boolean) => {
      setConfigState((prev) => ({ ...prev, ...changes }));
      if (!retro) return;

      const betroffen = entriesRef.current.filter(
        (e): e is PaletteEntry & { sheetRow: number } =>
          e.syncStatus !== "syncing" && e.sheetRow !== null
      );

      setEntries((prev) =>
        prev.map((e) =>
          e.syncStatus === "syncing" ? e : { ...e, ...changes, syncStatus: "syncing" as const }
        )
      );

      if (betroffen.length === 0) return;

      const updates = betroffen.map((e) => ({
        sheetRow: e.sheetRow,
        datum: changes.datum ?? e.datum,
        person: changes.person ?? e.person,
        feld: changes.feld ?? e.feld,
        sorte: changes.sorte ?? e.sorte,
      }));

      api
        .batchUpdateSessionFields(updates)
        .then(() =>
          betroffen.forEach((e) =>
            updateEntryLocal(e.id, { syncStatus: "synced", syncError: undefined })
          )
        )
        .catch((err: Error) =>
          betroffen.forEach((e) =>
            updateEntryLocal(e.id, { syncStatus: "error", syncError: err.message })
          )
        );
    },
    [updateEntryLocal]
  );

  const startNewSession = useCallback(() => {
    setEntries([]);
    letzteEingabe.current = null;
    setLetzteAktivitaet(Date.now());
    setPauseZuLang(false);
    // Person bleibt stehen (meist dieselbe), Gebindeart startet wieder beim Standard.
    setConfigState((prev) => ({ ...defaultConfig(), datum: todayIso(), person: prev.person }));
  }, []);

  const setDatum = useCallback((datum: string) => {
    setConfigState((prev) => ({ ...prev, datum }));
  }, []);

  /**
   * Bestätigt, dass die laufende Anlieferung trotz Pause weitergeht. Die Zeitmarke wird
   * neu gesetzt, dadurch verschwindet die Frage - und stellt sich nach einer weiteren
   * langen Pause von selbst erneut.
   */
  const bestaetigeWeiterlauf = useCallback(() => {
    setLetzteAktivitaet(Date.now());
    setPauseZuLang(false);
  }, []);

  return {
    config,
    entries,
    /** Anzahl Zeilen, die noch nicht sicher im Sheet stehen. */
    offeneAnzahl: entries.filter((e) => e.syncStatus !== "synced").length,
    /** true, wenn die Anlieferung von einem früheren Tag stammt (Handy lag über Nacht offen). */
    datumIstVeraltet: entries.length > 0 && config.datum !== todayIso(),
    heute: todayIso(),
    /** true, wenn seit der letzten Eingabe so lange nichts passiert ist, dass nachgefragt wird. */
    pauseZuLang,
    letzteAktivitaet,
    bestaetigeWeiterlauf,
    addEntry,
    updateEntry,
    retryEntry,
    removeEntry,
    applyConfigChange,
    startNewSession,
    setDatum,
  };
}

export type UseSessionResult = ReturnType<typeof useSession>;
