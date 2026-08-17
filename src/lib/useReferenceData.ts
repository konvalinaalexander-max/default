"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPlanung, fetchReferenceData } from "./api";
import { ADMIN_PASSWORT, GEBINDEARTEN } from "./constants";
import type { ReferenceData } from "./types";

/**
 * Neu angelegte Schlag-Sorte-Paare, die noch nicht ins Sheet geschrieben werden konnten.
 * Ohne diese Warteschlange wäre ein im Feld ohne Netz angelegter Schlag nach dem
 * Schliessen der App verloren - und die Kilos darauf hätten in der Anbauplanung keine
 * Zeile, in der sie auftauchen könnten.
 */
const PENDING_KEY = "kuerbis-neue-planung-v1";

type PlanungsPaar = { schlag: string; sorte: string };

function ladeOffen(): PlanungsPaar[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PlanungsPaar[]) : [];
  } catch {
    return [];
  }
}

function speichereOffen(paare: PlanungsPaar[]): void {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(paare));
  } catch {
    // Voller Speicher darf das Wiegen nicht verhindern.
  }
}

/**
 * Die Stammdaten werden auf dem Gerät gespeichert. Das ist jetzt zwingend: Schlag und
 * Sorte dürfen nicht mehr frei getippt werden, also wäre ohne Netz und ohne Zwischenspeicher
 * gar keine Auswahl vorhanden - jemand im Feld käme nicht weiter.
 */
const CACHE_KEY = "kuerbis-stammdaten-v1";

const EMPTY: ReferenceData = {
  personen: [],
  schlaege: [],
  sortenNachSchlag: {},
  sorten: [],
  gebindearten: GEBINDEARTEN.map((g) => g.name),
  sortenStats: {},
  allgemeineStats: null,
  vorwissen: {},
  allgemeinesVorwissen: null,
  planungGelesen: false,
};

function ladeCache(): ReferenceData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<ReferenceData>) };
  } catch {
    return EMPTY;
  }
}

function speichereCache(data: ReferenceData): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Voller oder gesperrter Speicher darf das Wiegen nicht verhindern.
  }
}

function mergeUnique(list: string[], extra: string[]): string[] {
  const set = new Set(list);
  for (const v of extra) if (v) set.add(v);
  return [...set];
}

export function useReferenceData() {
  // Der Zwischenspeicher wird direkt beim ersten Render gelesen. Das ist hier sicher,
  // weil die App ohne serverseitiges Rendern läuft (siehe AppShellLoader) - so stehen
  // die Listen ohne Netz sofort bereit, statt erst leer zu erscheinen.
  const [data, setData] = useState<ReferenceData>(ladeCache);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * Neu angelegte Schlag-Sorte-Paare, die noch nicht aus dem Sheet zurückgelesen wurden -
   * damit sie sofort auswählbar sind und nicht erst nach dem nächsten Laden.
   */
  const [neuePlanung, setNeuePlanung] = useState<PlanungsPaar[]>(ladeOffen);
  const [neuePersonen, setNeuePersonen] = useState<string[]>([]);

  /**
   * Versucht, offene Planungszeilen ins Sheet zu schreiben. Erfolgreiche fallen aus der
   * Warteschlange. Der Anzeigezustand wird bewusst nicht angetastet: Die Paare bleiben
   * einfach auswählbar, und beim nächsten Laden kommen sie ohnehin aus dem Sheet zurück.
   */
  const sendeOffenePlanung = useCallback(async () => {
    const offen = ladeOffen();
    if (offen.length === 0) return;
    const bleibt: PlanungsPaar[] = [];
    for (const paar of offen) {
      try {
        await createPlanung(paar.schlag, paar.sorte, ADMIN_PASSWORT);
      } catch {
        bleibt.push(paar);
      }
    }
    speichereOffen(bleibt);
  }, []);

  // Enthält absichtlich keine synchronen setState-Aufrufe, damit dies gefahrlos
  // direkt aus dem Mount-Effect heraus aufgerufen werden kann.
  const fetchAndStore = useCallback(() => {
    return fetchReferenceData()
      .then((d) => {
        setData(d);
        speichereCache(d);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Erst nachliefern, was offen ist, dann laden - so enthält das Ergebnis die
    // nachgetragenen Zeilen bereits.
    sendeOffenePlanung().finally(fetchAndStore);
  }, [fetchAndStore, sendeOffenePlanung]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAndStore();
  }, [fetchAndStore]);

  const addLocalPerson = useCallback((name: string) => {
    if (name) setNeuePersonen((prev) => mergeUnique(prev, [name]));
  }, []);

  /**
   * Nimmt das Paar sofort in die Auswahl auf und schreibt es ins Sheet. Klappt das nicht,
   * bleibt es in der Warteschlange und wird beim nächsten Laden erneut versucht.
   */
  const addLocalPlanung = useCallback(
    (schlag: string, sorte: string) => {
      if (!schlag || !sorte) return;
      const paar = { schlag, sorte };
      setNeuePlanung((prev) => [...prev, paar]);
      speichereOffen([...ladeOffen(), paar]);
      createPlanung(schlag, sorte, ADMIN_PASSWORT)
        .then(() => {
          speichereOffen(ladeOffen().filter((p) => p.schlag !== schlag || p.sorte !== sorte));
        })
        .catch(() => {
          // Bleibt in der Warteschlange; der nächste Start versucht es wieder.
        });
    },
    []
  );

  // Planung aus dem Sheet und lokal Ergänztes zusammenführen.
  const planung = useMemo(() => {
    const sortenNachSchlag: Record<string, string[]> = {};
    for (const [schlag, sorten] of Object.entries(data.sortenNachSchlag)) {
      sortenNachSchlag[schlag] = [...sorten];
    }
    for (const { schlag, sorte } of neuePlanung) {
      if (!sortenNachSchlag[schlag]) sortenNachSchlag[schlag] = [];
      if (!sortenNachSchlag[schlag].includes(sorte)) sortenNachSchlag[schlag].push(sorte);
    }
    const schlaege = mergeUnique(data.schlaege, neuePlanung.map((p) => p.schlag));
    const sorten = mergeUnique(data.sorten, neuePlanung.map((p) => p.sorte));
    return { sortenNachSchlag, schlaege, sorten };
  }, [data.sortenNachSchlag, data.schlaege, data.sorten, neuePlanung]);

  /**
   * Die erlaubten Sorten für einen Schlag. Ist der Schlag unbekannt - etwa weil die
   * Planung nachträglich umbenannt wurde und eine ältere Anlieferung noch offen ist -
   * werden alle Sorten der Planung angeboten, statt eine leere Liste zu zeigen.
   */
  const sortenFuerSchlag = useCallback(
    (schlag: string): string[] => {
      const eigene = planung.sortenNachSchlag[schlag];
      if (eigene && eigene.length > 0) return eigene;
      return planung.sorten;
    },
    [planung]
  );

  return {
    loading,
    error,
    reload,
    personen: mergeUnique(data.personen, neuePersonen),
    schlaege: planung.schlaege,
    sorten: planung.sorten,
    sortenFuerSchlag,
    // Feste Liste mit bekanntem Leergewicht - nicht mehr aus dem Sheet abgeleitet, sonst
    // wäre sie nach dem Leeren des Journals leer.
    gebindearten: EMPTY.gebindearten,
    sortenStats: data.sortenStats,
    allgemeineStats: data.allgemeineStats,
    vorwissen: data.vorwissen,
    allgemeinesVorwissen: data.allgemeinesVorwissen,
    planungGelesen: data.planungGelesen,
    addLocalPerson,
    addLocalPlanung,
  };
}

export type UseReferenceDataResult = ReturnType<typeof useReferenceData>;
