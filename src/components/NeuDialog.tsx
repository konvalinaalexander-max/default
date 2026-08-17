"use client";

import { useState } from "react";
import { ADMIN_PASSWORT } from "@/lib/constants";
import { t, type Lang } from "@/lib/i18n";

export interface NeuFeld {
  key: string;
  label: string;
}

interface NeuDialogProps {
  lang: Lang;
  titel: string;
  /** Optionaler Erklärtext unter dem Titel (statt des Standard-Hinweises "nur für Betriebsleiter"). */
  beschreibung?: string;
  felder: NeuFeld[];
  onAbbrechen: () => void;
  /** Wird erst nach richtigem Passwort aufgerufen; alle Felder sind dann gefüllt. */
  onSpeichern: (werte: Record<string, string>) => void;
}

/**
 * Neuanlage von Schlag oder Sorte. Das Passwort steht oben und nicht in einem eigenen
 * Schritt davor: So ist sofort sichtbar, dass die Neuanlage nicht für alle gedacht ist,
 * und es bleibt bei einer einzigen Bestätigung.
 */
export function NeuDialog({
  lang,
  titel,
  beschreibung,
  felder,
  onAbbrechen,
  onSpeichern,
}: NeuDialogProps) {
  const [passwort, setPasswort] = useState("");
  const [werte, setWerte] = useState<Record<string, string>>({});
  const [fehler, setFehler] = useState<string | null>(null);

  function speichern() {
    if (passwort !== ADMIN_PASSWORT) {
      setFehler(t(lang, "passwordWrong"));
      return;
    }
    const getrimmt: Record<string, string> = {};
    for (const f of felder) {
      const wert = (werte[f.key] ?? "").trim();
      if (!wert) {
        setFehler(t(lang, "newFieldNeedsVariety"));
        return;
      }
      getrimmt[f.key] = wert;
    }
    onSpeichern(getrimmt);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border-2 border-neutral-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-xl font-bold text-neutral-900">{titel}</h2>
        <p className="mt-1 text-sm text-neutral-500">{beschreibung ?? t(lang, "adminOnly")}</p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-600">
              {t(lang, "passwordLabel")}
            </span>
            <input
              autoFocus
              type="password"
              value={passwort}
              onChange={(e) => {
                setPasswort(e.target.value);
                setFehler(null);
              }}
              className="w-full min-w-0 rounded-xl border border-neutral-300 px-4 py-3 text-lg"
            />
          </label>

          {felder.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-600">{f.label}</span>
              <input
                type="text"
                value={werte[f.key] ?? ""}
                onChange={(e) => {
                  setWerte((prev) => ({ ...prev, [f.key]: e.target.value }));
                  setFehler(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && speichern()}
                className="w-full min-w-0 rounded-xl border border-neutral-300 px-4 py-3 text-lg"
              />
            </label>
          ))}
        </div>

        {fehler && <p className="mt-3 text-base font-medium text-red-600">{fehler}</p>}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={speichern}
            className="rounded-xl bg-orange-600 py-3.5 text-lg font-semibold text-white active:bg-orange-700"
          >
            {t(lang, "ok")}
          </button>
          <button
            type="button"
            onClick={onAbbrechen}
            className="rounded-xl border border-neutral-300 py-3.5 text-lg font-medium text-neutral-700"
          >
            {t(lang, "cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
