"use client";

import { t, type Lang } from "@/lib/i18n";

export interface BestaetigungsZeile {
  label: string;
  wert: string;
  /** Hebt eine Zeile hervor, z.B. ein vom Standard abweichendes Gebinde. */
  betont?: boolean;
}

interface BestaetigungsDialogProps {
  lang: Lang;
  zeilen: BestaetigungsZeile[];
  onBestaetigen: () => void;
  onAendern: () => void;
}

/**
 * Letzter Blick vor dem Speichern: zeigt Schlag, Sorte, Gebinde, Kisten und Gewicht
 * gross und ruhig untereinander.
 *
 * Sinn ist nicht die technische Prüfung - die läuft vorher - sondern der bewusste Moment,
 * in dem das Auge die Angaben nochmals überfliegt. Genau dort fällt auf, dass gerade eine
 * andere Sorte oder ein anderer Schlag geerntet wurde als noch eingestellt ist. Deshalb
 * stehen Bezeichnung und Wert untereinander statt nebeneinander, in grosser Schrift, und
 * die beiden Antworten sind farblich eindeutig getrennt.
 */
export function BestaetigungsDialog({
  lang,
  zeilen,
  onBestaetigen,
  onAendern,
}: BestaetigungsDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92dvh] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border-2 border-neutral-300 bg-white p-3 shadow-2xl"
      >
        <h2 className="text-center text-lg font-bold text-neutral-900">
          {t(lang, "confirmTitle")}
        </h2>

        <div className="mt-2 flex flex-col gap-1.5">
          {zeilen.map((z) => (
            <div
              key={z.label}
              className={`rounded-xl px-3 py-1.5 ${
                z.betont ? "bg-orange-100 ring-2 ring-orange-400" : "bg-neutral-100"
              }`}
            >
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {z.label}
              </div>
              {/* Der Wert ist die eigentliche Botschaft - deshalb deutlich grösser als
                  die Bezeichnung darüber und umbruchfähig, damit auch lange Namen
                  vollständig lesbar bleiben statt abgeschnitten zu werden. */}
              <div
                className={`break-words text-2xl font-bold leading-tight ${
                  z.betont ? "text-orange-900" : "text-neutral-900"
                }`}
              >
                {z.wert}
              </div>
            </div>
          ))}
        </div>

        {/* Klebt am unteren Rand des Dialogs: Auch wenn ein langer Schlagname die Liste
            wachsen lässt, bleiben beide Antworten sichtbar. Ohne das lag "Nein, ändern"
            auf kleinen Bildschirmen unterhalb des Randes - also ausgerechnet der Ausweg,
            der die Fehleingabe verhindern soll. */}
        <div className="sticky bottom-0 mt-3 flex flex-col gap-2 bg-white pt-1">
          <button
            type="button"
            onClick={onBestaetigen}
            className="rounded-xl bg-green-600 py-3.5 text-xl font-bold text-white active:bg-green-700"
          >
            ✓ {t(lang, "confirmSave")}
          </button>
          <button
            type="button"
            onClick={onAendern}
            className="rounded-xl border-2 border-red-500 bg-white py-3 text-lg font-semibold text-red-600 active:bg-red-50"
          >
            ✕ {t(lang, "confirmChange")}
          </button>
        </div>
      </div>
    </div>
  );
}
