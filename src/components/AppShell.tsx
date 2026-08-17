"use client";

import { useState } from "react";
import { useReferenceData } from "@/lib/useReferenceData";
import { useSession } from "@/lib/useSession";
import { OverviewScreen } from "./OverviewScreen";
import { SessionConfigForm } from "./SessionConfigForm";
import { WeighScreen } from "./WeighScreen";

export function AppShell() {
  const session = useSession();
  const ref = useReferenceData();
  const [view, setView] = useState<"wiegen" | "uebersicht">("wiegen");

  const needsSetup = !session.config.person || !session.config.feld || !session.config.sorte;
  const offeneAnzahl = session.entries.filter((e) => e.syncStatus === "syncing").length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col px-4 py-4">
      {ref.error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Verbindung zum Sheet fehlgeschlagen: {ref.error}{" "}
          <button type="button" onClick={ref.reload} className="font-semibold underline">
            Erneut versuchen
          </button>
        </div>
      )}

      {needsSetup ? (
        <SessionConfigForm
          config={session.config}
          personen={ref.personen}
          felder={ref.felder}
          sorten={ref.sorten}
          onAddOption={ref.addLocalOption}
          onSubmit={(cfg) => session.applyConfigChange(cfg, false)}
          submitLabel="Weiter zum Wiegen"
          title="Neue Anlieferung"
          subtitle="Diese Angaben gelten für alle Paletten dieser Anlieferung. Sie lassen sich später jederzeit korrigieren."
        />
      ) : view === "wiegen" ? (
        <>
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setView("uebersicht")}
              className="rounded-lg px-3 py-2 text-base font-medium text-neutral-500"
            >
              📋 Übersicht ({session.entries.length})
            </button>
          </div>
          <WeighScreen
            sorte={session.config.sorte}
            feld={session.config.feld}
            sortenStats={ref.sortenStats}
            offeneAnzahl={offeneAnzahl}
            onSave={session.addEntry}
          />
        </>
      ) : (
        <OverviewScreen
          config={session.config}
          entries={session.entries}
          personen={ref.personen}
          felder={ref.felder}
          sorten={ref.sorten}
          onAddOption={ref.addLocalOption}
          onApplyConfigChange={session.applyConfigChange}
          onUpdateEntry={session.updateEntry}
          onRetryEntry={session.retryEntry}
          onRemoveEntry={session.removeEntry}
          onBack={() => setView("wiegen")}
          onStartNewSession={session.startNewSession}
        />
      )}
    </div>
  );
}
