"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReferenceData } from "./api";
import { STANDARD_GEBINDEART } from "./constants";
import type { ReferenceData } from "./types";

type OptionKind = "personen" | "felder" | "sorten" | "gebindearten";

const EMPTY: ReferenceData = {
  personen: [],
  felder: [],
  sorten: [],
  // Der Standard ist immer wählbar, auch wenn das Sheet noch nicht erreichbar ist.
  gebindearten: [STANDARD_GEBINDEART],
  sortenStats: {},
};

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
  const [localExtras, setLocalExtras] = useState<Record<OptionKind, string[]>>({
    personen: [],
    felder: [],
    sorten: [],
    gebindearten: [],
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

  const addLocalOption = useCallback((kind: OptionKind, value: string) => {
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
    gebindearten: mergeUnique(
      mergeUnique(data.gebindearten, [STANDARD_GEBINDEART]),
      localExtras.gebindearten
    ),
    sortenStats: data.sortenStats,
    addLocalOption,
  };
}

export type UseReferenceDataResult = ReturnType<typeof useReferenceData>;
