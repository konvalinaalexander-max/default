"use client";

import { useId, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

interface ComboFieldProps {
  lang: Lang;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

/**
 * Dropdown mit bestehenden Werten + Möglichkeit, direkt einen neuen Wert
 * hinzuzufügen (z.B. eine neue Person oder ein neues Feld).
 */
export function ComboField({ lang, label, value, options, onChange }: ComboFieldProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const selectId = useId();

  // Ein gerade neu eingegebener Wert steht noch in keiner Sheet-Zeile und wäre sonst
  // nicht in der Liste - er wird deshalb vorangestellt.
  const allOptions = value && !options.includes(value) ? [value, ...options] : options;

  function commitNew() {
    const trimmed = draft.trim();
    if (trimmed) onChange(trimmed);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-neutral-600">
        {label}
      </label>
      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitNew()}
            placeholder={label}
            className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-lg"
          />
          <button
            type="button"
            onClick={commitNew}
            className="shrink-0 rounded-xl bg-orange-600 px-4 py-3 text-lg font-medium text-white active:bg-orange-700"
          >
            {t(lang, "ok")}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setDraft("");
            }}
            aria-label={t(lang, "cancel")}
            className="shrink-0 rounded-xl border border-neutral-300 px-3 py-3 text-lg text-neutral-500"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            id={selectId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-w-0 flex-1 appearance-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-lg"
          >
            <option value="" disabled>
              {t(lang, "pleaseSelect")}
            </option>
            {allOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label={`${t(lang, "addNewAria")}: ${label}`}
            className="shrink-0 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-lg font-medium text-orange-700 active:bg-orange-100"
          >
            + {t(lang, "addNew")}
          </button>
        </div>
      )}
    </div>
  );
}
