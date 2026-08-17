"use client";

import { useState } from "react";
import { gewichtProKiste } from "@/lib/constants";
import type { PaletteEntry, SessionConfig } from "@/lib/types";
import { ComboField } from "./ComboField";
import { ConfirmDialog } from "./ConfirmDialog";
import { SessionConfigForm } from "./SessionConfigForm";

interface OverviewScreenProps {
  config: SessionConfig;
  entries: PaletteEntry[];
  personen: string[];
  felder: string[];
  sorten: string[];
  onAddOption: (kind: "personen" | "felder" | "sorten", value: string) => void;
  onApplyConfigChange: (changes: Partial<SessionConfig>, retro: boolean) => void;
  onUpdateEntry: (id: string, changes: Partial<PaletteEntry>) => void;
  onRetryEntry: (id: string) => void;
  onRemoveEntry: (id: string) => void;
  onBack: () => void;
  onStartNewSession: () => void;
}

function diffConfig(a: SessionConfig, b: SessionConfig): Partial<SessionConfig> {
  const changes: Partial<SessionConfig> = {};
  (Object.keys(a) as (keyof SessionConfig)[]).forEach((key) => {
    if (a[key] !== b[key]) changes[key] = b[key];
  });
  return changes;
}

export function OverviewScreen({
  config,
  entries,
  personen,
  felder,
  sorten,
  onAddOption,
  onApplyConfigChange,
  onUpdateEntry,
  onRetryEntry,
  onRemoveEntry,
  onBack,
  onStartNewSession,
}: OverviewScreenProps) {
  const [mode, setMode] = useState<"list" | "settings">("list");
  const [pendingConfig, setPendingConfig] = useState<Partial<SessionConfig> | null>(null);
  const [confirmNewSession, setConfirmNewSession] = useState(false);

  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  function handleConfigSubmit(newConfig: SessionConfig) {
    const changes = diffConfig(config, newConfig);
    if (Object.keys(changes).length === 0) {
      setMode("list");
      return;
    }
    if (entries.length === 0) {
      onApplyConfigChange(changes, false);
      setMode("list");
      return;
    }
    setPendingConfig(changes);
  }

  if (mode === "settings") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <button
          type="button"
          onClick={() => setMode("list")}
          className="self-start text-lg font-medium text-neutral-500"
        >
          ← Zurück zur Übersicht
        </button>
        <SessionConfigForm
          config={config}
          personen={personen}
          felder={felder}
          sorten={sorten}
          onAddOption={onAddOption}
          onSubmit={handleConfigSubmit}
          submitLabel="Speichern"
          title="Einstellungen"
        />

        {pendingConfig && (
          <ConfirmDialog
            title="Bereits erfasste Paletten auch anpassen?"
            message={`Es sind bereits ${entries.length} Palette(n) in dieser Anlieferung erfasst.\n\nSollen die geänderten Angaben auch auf diese bereits erfassten Paletten übernommen werden?`}
            confirmLabel="Ja, alle anpassen"
            cancelLabel="Nein, nur ab jetzt"
            onConfirm={() => {
              onApplyConfigChange(pendingConfig, true);
              setPendingConfig(null);
              setMode("list");
            }}
            onCancel={() => {
              onApplyConfigChange(pendingConfig, false);
              setPendingConfig(null);
              setMode("list");
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-lg font-medium text-neutral-500">
          ← Zurück zum Wiegen
        </button>
        <button
          type="button"
          onClick={() => setMode("settings")}
          className="rounded-xl border border-neutral-300 px-3 py-2 text-base font-medium text-neutral-700"
        >
          ⚙ Einstellungen
        </button>
      </div>

      <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
        {config.datum} · {config.person} · {config.feld} · {config.sorte}
      </div>

      <div className="flex flex-col gap-3">
        {sorted.length === 0 && (
          <p className="py-8 text-center text-neutral-400">Noch keine Palette erfasst.</p>
        )}
        {sorted.map((entry) => (
          <PaletteCard
            key={entry.id}
            entry={entry}
            felder={felder}
            sorten={sorten}
            onAddOption={onAddOption}
            onUpdate={(changes) => onUpdateEntry(entry.id, changes)}
            onRetry={() => onRetryEntry(entry.id)}
            onRemove={() => onRemoveEntry(entry.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setConfirmNewSession(true)}
        className="mt-4 rounded-xl border border-neutral-300 py-3 text-lg font-medium text-neutral-600"
      >
        Neue Anlieferung starten
      </button>

      {confirmNewSession && (
        <ConfirmDialog
          title="Neue Anlieferung starten?"
          message="Die bisherigen Paletten bleiben im Sheet gespeichert, werden hier aber nicht mehr angezeigt. Feld und Sorte werden zurückgesetzt."
          confirmLabel="Ja, neue Anlieferung"
          cancelLabel="Abbrechen"
          onConfirm={() => {
            onStartNewSession();
            setConfirmNewSession(false);
            onBack();
          }}
          onCancel={() => setConfirmNewSession(false)}
        />
      )}
    </div>
  );
}

function statusLabel(entry: PaletteEntry): { text: string; className: string } {
  switch (entry.syncStatus) {
    case "syncing":
      return { text: "speichert…", className: "text-orange-600" };
    case "error":
      return { text: "Fehler", className: "text-red-600" };
    default:
      return { text: "gespeichert", className: "text-green-700" };
  }
}

interface PaletteCardProps {
  entry: PaletteEntry;
  felder: string[];
  sorten: string[];
  onAddOption: (kind: "personen" | "felder" | "sorten", value: string) => void;
  onUpdate: (changes: Partial<PaletteEntry>) => void;
  onRetry: () => void;
  onRemove: () => void;
}

function PaletteCard({
  entry,
  felder,
  sorten,
  onAddOption,
  onUpdate,
  onRetry,
  onRemove,
}: PaletteCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [kisten, setKisten] = useState(String(entry.anzahlKisten));
  const [gewicht, setGewicht] = useState(String(entry.gewichtBrutto));
  const [feld, setFeld] = useState(entry.feld);
  const [sorte, setSorte] = useState(entry.sorte);

  const status = statusLabel(entry);
  const kgProKiste = gewichtProKiste(entry.gewichtBrutto, entry.anzahlKisten);
  const busy = entry.syncStatus === "syncing";

  function save() {
    onUpdate({
      anzahlKisten: Number(kisten.replace(",", ".")) || entry.anzahlKisten,
      gewichtBrutto: Number(gewicht.replace(",", ".")) || entry.gewichtBrutto,
      feld,
      sorte,
    });
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">
          {entry.anzahlKisten} Kisten · {entry.gewichtBrutto} kg
        </div>
        <span className={`text-sm font-medium ${status.className}`}>{status.text}</span>
      </div>
      <div className="text-sm text-neutral-500">
        {entry.sorte} · {entry.feld} · {kgProKiste.toFixed(2)} kg/Kiste
      </div>

      {entry.syncStatus === "error" && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{entry.syncError ?? "Synchronisierung fehlgeschlagen"}</span>
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Erneut versuchen
          </button>
        </div>
      )}

      {editing ? (
        <div className="mt-3 flex flex-col gap-3 border-t border-neutral-100 pt-3">
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Kisten</label>
              <input
                type="number"
                inputMode="numeric"
                value={kisten}
                onChange={(e) => setKisten(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-lg"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Gewicht (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                value={gewicht}
                onChange={(e) => setGewicht(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-lg"
              />
            </div>
          </div>
          <ComboField
            label="Feld"
            value={feld}
            options={felder}
            onChange={(v) => {
              setFeld(v);
              onAddOption("felder", v);
            }}
          />
          <ComboField
            label="Sorte"
            value={sorte}
            options={sorten}
            onChange={(v) => {
              setSorte(v);
              onAddOption("sorten", v);
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="flex-1 rounded-lg bg-orange-600 py-2.5 font-semibold text-white"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-lg border border-neutral-300 py-2.5 font-medium text-neutral-600"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(true)}
            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 disabled:opacity-40"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="flex-1 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 disabled:opacity-40"
          >
            Löschen
          </button>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Palette löschen?"
          message="Diese Palette wird aus dem Sheet entfernt. Das kann nicht rückgängig gemacht werden."
          confirmLabel="Ja, löschen"
          cancelLabel="Abbrechen"
          onConfirm={() => {
            onRemove();
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
