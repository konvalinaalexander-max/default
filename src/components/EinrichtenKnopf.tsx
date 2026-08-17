"use client";

import { useState } from "react";
import { richteSheetEin, type EinrichtungsBericht } from "@/lib/api";
import { ADMIN_PASSWORT } from "@/lib/constants";
import { t, type Lang } from "@/lib/i18n";
import { NeuDialog } from "./NeuDialog";

/**
 * Löst die einmalige Einrichtung des Dokuments aus: Blätter anlegen und benennen,
 * Kopfzeilen setzen und schützen, Anbauplanung füllen, Ertragsformeln und Referenzwerte.
 *
 * Läuft auf dem Server, wo die Zugangsdaten des Google-Kontos ohnehin liegen - so muss
 * niemand einen Schlüssel von Hand irgendwohin kopieren. Mehrfaches Drücken ist
 * unschädlich: Jeder Schritt prüft vorher, ob er nötig ist.
 */
export function EinrichtenKnopf({ lang }: { lang: Lang }) {
  const [dialogOffen, setDialogOffen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [bericht, setBericht] = useState<EinrichtungsBericht | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  function starte() {
    setDialogOffen(false);
    setLaeuft(true);
    setFehler(null);
    setBericht(null);
    richteSheetEin(ADMIN_PASSWORT)
      .then(setBericht)
      .catch((err: Error) => setFehler(err.message))
      .finally(() => setLaeuft(false));
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={laeuft}
        onClick={() => setDialogOffen(true)}
        className="rounded-xl border border-neutral-300 bg-white py-3.5 text-lg font-medium text-neutral-700 active:bg-neutral-50 disabled:opacity-50"
      >
        🛠 {laeuft ? t(lang, "setupRunning") : t(lang, "setupSheet")}
      </button>

      {fehler && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fehler}</div>
      )}

      {bericht && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
          <p className="font-semibold">{t(lang, "setupDone")}</p>
          <ul className="mt-1 list-disc pl-4">
            {bericht.erledigt.map((z) => (
              <li key={z}>{z}</li>
            ))}
          </ul>
          {bericht.uebersprungen.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-green-800">
                {t(lang, "setupSkipped")} ({bericht.uebersprungen.length})
              </summary>
              <ul className="mt-1 list-disc pl-4 text-green-800">
                {bericht.uebersprungen.map((z) => (
                  <li key={z}>{z}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {dialogOffen && (
        <NeuDialog
          lang={lang}
          titel={t(lang, "setupSheet")}
          // Nur das Passwort; die Einrichtung braucht keine weiteren Angaben.
          felder={[]}
          onAbbrechen={() => setDialogOffen(false)}
          onSpeichern={starte}
        />
      )}
    </div>
  );
}
