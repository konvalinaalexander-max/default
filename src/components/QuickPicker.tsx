"use client";

import { t, type Lang } from "@/lib/i18n";

interface QuickPickerProps {
  lang: Lang;
  title: string;
  options: string[];
  current: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
  /**
   * "geschuetzt": Eintrag "+++ Neu +++" am Ende, der die Passwortabfrage öffnet.
   * "keine": nur auswählen - richtig bei den Gebindearten, deren Liste mit ihren
   * Leergewichten fest hinterlegt ist.
   *
   * Eine freie Eingabe gibt es hier nicht mehr: Über diesen Weg liess sich vorher eine
   * Sorte anlegen, ohne dass die Anbauplanung davon wusste.
   */
  neuModus?: "geschuetzt" | "keine";
  onNeuAngefragt?: () => void;
  /**
   * Anzeigetext zu einem Eintrag. Nur nötig, wo der gespeicherte Wert und der angezeigte
   * auseinanderfallen - bei den Gebindearten, deren Name im Sheet gleich bleiben muss,
   * auf dem Bildschirm aber in der Sprache der Person steht.
   */
  label?: (value: string) => string;
}

/**
 * Auswahl aus einer Liste in einem Rutsch - für den häufigen Fall, dass mitten in
 * einer Anlieferung die Sorte wechselt und niemand dafür in die Einstellungen soll.
 */
export function QuickPicker({
  lang,
  title,
  options,
  current,
  onSelect,
  onCancel,
  neuModus = "keine",
  onNeuAngefragt,
  label = (v) => v,
}: QuickPickerProps) {
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
              {label(opt)}
            </button>
          ))}
        </div>

        {neuModus === "geschuetzt" && (
          <button
            type="button"
            onClick={onNeuAngefragt}
            className="rounded-xl border border-orange-300 bg-orange-50 py-3 text-lg font-medium text-orange-700"
          >
            {t(lang, "addNewOption")}
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
