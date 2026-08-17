"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LANG, LANGUAGES, type Lang } from "./i18n";

const STORAGE_KEY = "kuerbis-sprache-v1";

function istLang(wert: string | null): wert is Lang {
  return !!wert && LANGUAGES.some((l) => l.code === wert);
}

function ladeSprache(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const wert = window.localStorage.getItem(STORAGE_KEY);
    return istLang(wert) ? wert : null;
  } catch {
    return null;
  }
}

/**
 * Die Sprache wird getrennt von der Anlieferung gespeichert: sie soll auch nach
 * "Neue Anlieferung" und nach dem Schliessen des Browsers erhalten bleiben.
 */
export function useLanguage() {
  // Wird nur clientseitig gerendert (siehe AppShellLoader), daher ist das
  // synchrone Lesen beim ersten Render sicher.
  const [lang, setLangState] = useState<Lang | null>(ladeSprache);

  const setLang = useCallback((neu: Lang) => setLangState(neu), []);

  useEffect(() => {
    if (!lang) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* Speicher nicht verfügbar - Sprache gilt dann nur für diese Sitzung */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  return {
    /** null, solange die Person noch keine Sprache gewählt hat. */
    lang,
    /** Für Texte immer nutzbar, auch vor der Wahl. */
    langOrDefault: lang ?? DEFAULT_LANG,
    setLang,
  };
}
