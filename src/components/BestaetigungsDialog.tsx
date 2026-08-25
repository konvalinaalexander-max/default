"use client";

import { t, type Lang } from "@/lib/i18n";

export interface BestaetigungsZeile {
  label: string;
  wert: string;
}

interface BestaetigungsDialogProps {
  lang: Lang;
  zeilen: BestaetigungsZeile[];
  onBestaetigen: () => void;
  onAendern: () => void;
}

/**
 * Schriftgrösse nach Textlänge.
 *
 * Alle Angaben sollen ohne Scrollen auf den Bildschirm passen - besonders das Gewicht,
 * das ganz unten steht. Statt jede Zeile klein zu machen, bleiben die üblichen Namen
 * gross und nur auffällig lange schrumpfen. Die Schwellen sind an der schmalsten
 * Bildschirmbreite (320 px) ausgerichtet, bei der rund 20 Zeichen in eine Zeile passen.
 */
function schriftGroesse(text: string): string {
  const n = text.length;
  if (n <= 16) return "text-2xl";
  if (n <= 22) return "text-xl";
  if (n <= 32) return "text-lg";
  return "text-base";
}

/**
 * Letzter Blick vor dem Speichern: zeigt Schlag, Sorte, Gebinde, Kisten und Gewicht
 * gross und ruhig untereinander.
 *
 * Sinn ist nicht die technische Prüfung - die läuft vorher - sondern der bewusste Moment,
 * in dem das Auge die Angaben nochmals überfliegt. Genau dort fällt auf, dass gerade eine
 * andere Sorte oder ein anderer Schlag geerntet wurde als noch eingestellt ist.
 *
 * Deshalb sind alle fünf Zeilen bewusst gleich gestaltet: gleiche Höhe, gleicher
 * Farbstreifen, gleiche Schriftgrösse. Würde eine einzelne Zeile hervorgehoben, zöge sie
 * den Blick auf sich und die übrigen vier würden überflogen - dabei kann der Fehler in
 * jeder von ihnen stecken. Gleichwertig dargestellt liest das Auge die Liste als Ganzes.
 */
export function BestaetigungsDialog({
  lang,
  zeilen,
  onBestaetigen,
  onAendern,
}: BestaetigungsDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[96dvh] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border-2 border-neutral-300 bg-white p-3 shadow-2xl"
      >
        <h2 className="text-center text-lg font-bold text-neutral-900">
          {t(lang, "confirmTitle")}
        </h2>

        <div className="mt-2 flex flex-col gap-1.5">
          {zeilen.map((z) => (
            <div
              key={z.label}
              // Feste Mindesthöhe und ein Farbstreifen links an jeder Zeile: Alle fünf
              // Angaben bekommen optisch gleich viel Gewicht, und der Streifen gibt dem
              // Auge auf jeder Zeile denselben Ansatzpunkt zum Lesen.
              className="flex min-h-[3.25rem] flex-col justify-center rounded-lg border-l-4 border-orange-500 bg-neutral-100 py-1 pl-3 pr-3"
            >
              <div className="text-[11px] font-medium uppercase leading-tight tracking-wide text-neutral-500">
                {z.label}
              </div>
              {/* Der Wert ist die eigentliche Botschaft - deshalb deutlich grösser als
                  die Bezeichnung darüber und umbruchfähig, damit auch lange Namen
                  vollständig lesbar bleiben statt abgeschnitten zu werden. */}
              <div
                className={`break-words font-bold leading-tight text-neutral-900 ${schriftGroesse(
                  z.wert,
                )}`}
              >
                {z.wert}
              </div>
            </div>
          ))}
        </div>

        {/* Klebt am unteren Rand des Dialogs: Auch wenn ein ungewöhnlich langer Name die
            Liste wachsen lässt, bleiben beide Antworten sichtbar. Ohne das lag
            "Nein, ändern" auf kleinen Bildschirmen unterhalb des Randes - also
            ausgerechnet der Ausweg, der die Fehleingabe verhindern soll. */}
        <div className="sticky bottom-0 mt-2.5 flex flex-col gap-2 bg-white pt-1">
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
