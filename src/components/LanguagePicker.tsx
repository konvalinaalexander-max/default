"use client";

import { LANGUAGES, t, type Lang } from "@/lib/i18n";
import { Flag } from "./Flags";

interface LanguagePickerProps {
  /** Aktuell gewählte Sprache; beim ersten Start noch nicht gesetzt. */
  current?: Lang;
  onSelect: (lang: Lang) => void;
  /** Wird beim Aufruf aus den Einstellungen gesetzt, beim ersten Start nicht. */
  onBack?: () => void;
  /** Sprache für die Überschrift; beim ersten Start bewusst mehrsprachig gelöst. */
  headingLang?: Lang;
}

export function LanguagePicker({ current, onSelect, onBack, headingLang }: LanguagePickerProps) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="self-start text-lg font-medium text-neutral-500"
        >
          ← {t(headingLang ?? current ?? "de", "backToOverview")}
        </button>
      )}

      {headingLang ? (
        <h1 className="text-2xl font-semibold">{t(headingLang, "chooseLanguage")}</h1>
      ) : (
        // Beim allerersten Start ist noch keine Sprache bekannt - daher die Frage
        // in allen fünf Sprachen, damit jede Person sie versteht.
        <div className="flex flex-col gap-1 pt-2">
          {LANGUAGES.map((l) => (
            <p key={l.code} className="text-center text-sm text-neutral-500">
              {t(l.code, "chooseLanguage")}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center gap-3">
        {LANGUAGES.map((l) => {
          const active = l.code === current;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => onSelect(l.code)}
              lang={l.code}
              className={`flex items-center gap-4 rounded-2xl border-2 bg-white px-4 py-4 text-left active:bg-neutral-50 ${
                active ? "border-orange-500" : "border-neutral-200"
              }`}
            >
              <span className="h-9 w-14 shrink-0 overflow-hidden rounded-md border border-neutral-300">
                <Flag lang={l.code} />
              </span>
              <span className="flex-1 text-xl font-semibold">{l.name}</span>
              {active && <span className="text-xl text-orange-600">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
