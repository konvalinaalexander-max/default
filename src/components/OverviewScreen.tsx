"use client";

import { useState } from "react";
import { STANDARD_GEBINDEART, gewichtProKiste } from "@/lib/constants";
import { formatDate, formatMenge, formatNumber, t, type Lang } from "@/lib/i18n";
import type { PaletteEntry, SessionConfig } from "@/lib/types";
import { ComboField } from "./ComboField";
import { ConfirmDialog } from "./ConfirmDialog";
import { SessionConfigForm } from "./SessionConfigForm";

interface OverviewScreenProps {
  lang: Lang;
  /**
   * Wird von aussen gesteuert, damit die Einstellungen erhalten bleiben, während die
   * Sprachwahl angezeigt wird - sonst stünde man danach wieder in der Liste.
   */
  mode: "list" | "settings";
  onChangeMode: (mode: "list" | "settings") => void;
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
  onOpenLanguage: () => void;
}

function diffConfig(a: SessionConfig, b: SessionConfig): Partial<SessionConfig> {
  const changes: Partial<SessionConfig> = {};
  (Object.keys(a) as (keyof SessionConfig)[]).forEach((key) => {
    if (a[key] !== b[key]) changes[key] = b[key];
  });
  return changes;
}

export function OverviewScreen({
  lang,
  mode,
  onChangeMode,
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
  onOpenLanguage,
}: OverviewScreenProps) {
  const [pendingConfig, setPendingConfig] = useState<Partial<SessionConfig> | null>(null);
  const [confirmNewSession, setConfirmNewSession] = useState(false);

  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  /**
   * Nach dem Speichern der Einstellungen geht es direkt zum Wiegen weiter. Wer die
   * Sorte umstellt, will als Nächstes wiegen - nicht die Liste der schon erfassten
   * Paletten ansehen. Über den Zurück-Knopf bleibt die Liste jederzeit erreichbar.
   */
  function zurueckAnsWiegen() {
    onChangeMode("list");
    onBack();
  }

  function handleConfigSubmit(newConfig: SessionConfig) {
    const changes = diffConfig(config, newConfig);
    if (Object.keys(changes).length === 0) {
      zurueckAnsWiegen();
      return;
    }
    if (entries.length === 0) {
      onApplyConfigChange(changes, false);
      zurueckAnsWiegen();
      return;
    }
    setPendingConfig(changes);
  }

  if (mode === "settings") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <button
          type="button"
          onClick={() => onChangeMode("list")}
          className="self-start text-lg font-medium text-neutral-500"
        >
          ← {t(lang, "backToOverview")}
        </button>
        <SessionConfigForm
          lang={lang}
          config={config}
          personen={personen}
          felder={felder}
          sorten={sorten}
          onAddOption={onAddOption}
          onSubmit={handleConfigSubmit}
          submitLabel={t(lang, "save")}
          title={t(lang, "settings")}
        >
          <button
            type="button"
            onClick={onOpenLanguage}
            className="rounded-xl border border-neutral-300 bg-white py-3.5 text-lg font-medium text-neutral-700 active:bg-neutral-50"
          >
            🌐 {t(lang, "language")}
          </button>

          {/* Verrät auf den ersten Blick, welcher Stand auf diesem Gerät läuft. */}
          <p className="text-center text-xs text-neutral-400">
            Version {process.env.NEXT_PUBLIC_BUILD_ID}
          </p>
        </SessionConfigForm>

        {pendingConfig && (
          <ConfirmDialog
            title={t(lang, "retroTitle")}
            message={t(lang, "retroMsg")}
            confirmLabel={t(lang, "yesChangeAll")}
            cancelLabel={t(lang, "noOnlyNew")}
            onConfirm={() => {
              onApplyConfigChange(pendingConfig, true);
              setPendingConfig(null);
              // Rückwirkend geändert: in der Liste bleiben, damit sofort sichtbar ist,
              // was sich an den bereits erfassten Paletten geändert hat.
              onChangeMode("list");
            }}
            onCancel={() => {
              onApplyConfigChange(pendingConfig, false);
              setPendingConfig(null);
              // Nur für neue Paletten: es geht direkt weiter mit Wiegen.
              zurueckAnsWiegen();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-w-0 text-left text-lg font-medium text-neutral-500"
        >
          ← {t(lang, "backToWeighing")}
        </button>
        {/* shrink-0 verhindert, dass der lange Zurück-Text den Einstellungen-Knopf
            zusammenquetscht - in manchen Sprachen ist er deutlich länger. */}
        <button
          type="button"
          onClick={() => onChangeMode("settings")}
          className="shrink-0 whitespace-nowrap rounded-xl border border-neutral-300 px-3 py-2 text-base font-medium text-neutral-700"
        >
          ⚙ {t(lang, "settings")}
        </button>
      </div>

      <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
        {formatDate(lang, config.datum)} · {config.person} · {config.feld} · {config.sorte}
      </div>

      <div className="flex flex-col gap-3">
        {sorted.length === 0 && (
          <p className="py-8 text-center text-neutral-400">{t(lang, "noPallets")}</p>
        )}
        {sorted.map((entry) => (
          <PaletteCard
            key={entry.id}
            lang={lang}
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
        {t(lang, "startNewDelivery")}
      </button>

      {confirmNewSession && (
        <ConfirmDialog
          title={t(lang, "startNewDeliveryTitle")}
          message={t(lang, "startNewDeliveryMsg")}
          confirmLabel={t(lang, "yesNewDelivery")}
          cancelLabel={t(lang, "cancel")}
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

function statusLabel(lang: Lang, entry: PaletteEntry): { text: string; className: string } {
  switch (entry.syncStatus) {
    case "syncing":
      return { text: t(lang, "saving"), className: "text-orange-600" };
    case "error":
      return { text: t(lang, "errorLabel"), className: "text-red-600" };
    default:
      return { text: t(lang, "saved"), className: "text-green-700" };
  }
}

interface PaletteCardProps {
  lang: Lang;
  entry: PaletteEntry;
  felder: string[];
  sorten: string[];
  onAddOption: (kind: "personen" | "felder" | "sorten", value: string) => void;
  onUpdate: (changes: Partial<PaletteEntry>) => void;
  onRetry: () => void;
  onRemove: () => void;
}

function PaletteCard({
  lang,
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

  const status = statusLabel(lang, entry);
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
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 text-lg font-semibold tabular-nums">
          {formatMenge(lang, entry.gewichtBrutto)} kg
        </div>
        <span className={`shrink-0 text-sm font-medium ${status.className}`}>{status.text}</span>
      </div>
      <div className="text-sm text-neutral-500 tabular-nums">
        {t(lang, "cratesLabel")}: {entry.anzahlKisten} · {formatNumber(lang, kgProKiste, 2)}{" "}
        {t(lang, "perCrate")}
      </div>
      <div className="text-sm text-neutral-500">
        {entry.sorte} · {entry.feld} ·{" "}
        {/* Ein vom Standard abweichendes Gebinde wird hervorgehoben, damit es in der
            Liste sofort auffällt, falls es versehentlich gesetzt war. */}
        <span
          className={
            entry.gebindeart !== STANDARD_GEBINDEART
              ? "rounded bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-800"
              : undefined
          }
        >
          {entry.gebindeart}
        </span>
      </div>

      {entry.syncStatus === "error" && (
        <div className="mt-2 flex flex-col gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{t(lang, "waitingForConnection")}</span>
          {/* Technische Ursache klein dazu - hilft bei der Fehlersuche, ohne die
              wiegende Person zu verunsichern. */}
          {entry.syncError && (
            <span className="text-xs text-red-500/80">{entry.syncError}</span>
          )}
          <button type="button" onClick={onRetry} className="self-start font-semibold underline">
            {t(lang, "tryAgain")}
          </button>
        </div>
      )}

      {editing ? (
        <div className="mt-3 flex flex-col gap-3 border-t border-neutral-100 pt-3">
          {/* min-w-0 auf den Spalten und w-full auf den Feldern: ohne min-w-0 kann eine
              flex-1-Spalte nicht unter die Mindestbreite eines Eingabefelds schrumpfen,
              dadurch schob sich das zweite Feld bisher aus dem Bild. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500" htmlFor={`k-${entry.id}`}>
                {t(lang, "cratesLabel")}
              </label>
              <input
                id={`k-${entry.id}`}
                type="number"
                inputMode="numeric"
                value={kisten}
                onChange={(e) => setKisten(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-lg"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500" htmlFor={`g-${entry.id}`}>
                {t(lang, "weightKg")}
              </label>
              <input
                id={`g-${entry.id}`}
                type="number"
                inputMode="decimal"
                value={gewicht}
                onChange={(e) => setGewicht(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-lg"
              />
            </div>
          </div>
          <ComboField
            lang={lang}
            label={t(lang, "field")}
            value={feld}
            options={felder}
            onChange={(v) => {
              setFeld(v);
              onAddOption("felder", v);
            }}
          />
          <ComboField
            lang={lang}
            label={t(lang, "variety")}
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
              {t(lang, "save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-lg border border-neutral-300 py-2.5 font-medium text-neutral-600"
            >
              {t(lang, "cancel")}
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
            {t(lang, "edit")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="flex-1 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 disabled:opacity-40"
          >
            {t(lang, "deleteLabel")}
          </button>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t(lang, "deletePalletTitle")}
          message={t(lang, "deletePalletMsg")}
          confirmLabel={t(lang, "yesDelete")}
          cancelLabel={t(lang, "cancel")}
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
