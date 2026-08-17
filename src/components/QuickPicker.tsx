"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";

interface QuickPickerProps {
  lang: Lang;
  title: string;
  options: string[];
  current: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
}

/**
 * Auswahl aus einer Liste in einem Rutsch - für den häufigen Fall, dass mitten in
 * einer Anlieferung die Sorte wechselt und niemand dafür in die Einstellungen soll.
 */
export function QuickPicker({ lang, title, options, current, onSelect, onCancel }: QuickPickerProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commitNew() {
    const trimmed = draft.trim();
    if (trimmed) onSelect(trimmed);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85dvh] w-full max-w-sm flex-col gap-3 rounded-2xl border-2 border-neutral-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-xl font-bold">{title}</h2>

        <div className="flex flex-col gap-2 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(opt)}
              className={`rounded-xl border-2 px-4 py-3.5 text-left text-lg font-medium active:bg-neutral-50 ${
                opt === current ? "border-orange-500 bg-orange-50" : "border-neutral-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {adding ? (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitNew()}
              className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-lg"
            />
            <button
              type="button"
              onClick={commitNew}
              className="shrink-0 rounded-xl bg-orange-600 px-4 py-3 text-lg font-medium text-white"
            >
              {t(lang, "ok")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-xl border border-orange-300 bg-orange-50 py-3 text-lg font-medium text-orange-700"
          >
            + {t(lang, "addNew")}
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-neutral-300 py-3 text-lg font-medium text-neutral-700"
        >
          {t(lang, "cancel")}
        </button>
      </div>
    </div>
  );
}
