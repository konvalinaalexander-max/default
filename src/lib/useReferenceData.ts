"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReferenceData } from "./api";
import type { ReferenceData } from "./types";

const EMPTY: ReferenceData = { personen: [], felder: [], sorten: [], sortenStats: {} };

function mergeUnique(list: string[], extra: string[]): string[] {
  const set = new Set(list);
  for (const v of extra) if (v) set.add(v);
  return [...set];
}

export function useReferenceData() {
  const [data, setData] = useState<ReferenceData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Werte, die der Nutzer in dieser Sitzung neu eingegeben hat, bevor sie ins Sheet
  // zurückgesynct sind - damit sie sofort im Dropdown erscheinen.
  const [localExtras, setLocalExtras] = useState<{ personen: string[]; felder: string[]; sorten: string[] }>({
    personen: [],
    felder: [],
    sorten: [],
  });

  // Enthält absichtlich keine synchronen setState-Aufrufe, damit dies gefahrlos
  // direkt aus dem Mount-Effect heraus aufgerufen werden kann.
  const fetchAndStore = useCallback(() => {
    return fetchReferenceData()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAndStore();
  }, [fetchAndStore]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAndStore();
  }, [fetchAndStore]);

  const addLocalOption = useCallback((kind: "personen" | "felder" | "sorten", value: string) => {
    if (!value) return;
    setLocalExtras((prev) => ({ ...prev, [kind]: mergeUnique(prev[kind], [value]) }));
  }, []);

  return {
    loading,
    error,
    reload,
    personen: mergeUnique(data.personen, localExtras.personen),
    felder: mergeUnique(data.felder, localExtras.felder),
    sorten: mergeUnique(data.sorten, localExtras.sorten),
    sortenStats: data.sortenStats,
    addLocalOption,
  };
}

export type UseReferenceDataResult = ReturnType<typeof useReferenceData>;
