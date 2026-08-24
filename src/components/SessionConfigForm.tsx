"use client";

import { useId, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { todayIso } from "@/lib/id";
import type { SessionConfig } from "@/lib/types";
import { ComboField } from "./ComboField";
import { NeuDialog } from "./NeuDialog";

interface SessionConfigFormProps {
  lang: Lang;
  config: SessionConfig;
  personen: string[];
  schlaege: string[];
  /** Erlaubte Sorten für den gerade gewählten Schlag. */
  sortenFuerSchlag: (schlag: string) => string[];
  onAddPerson: (name: string) => void;
  /** Legt ein neues Schlag-Sorte-Paar in der Anbauplanung an. */
  onNeuePlanung: (schlag: string, sorte: string) => void;
  onSubmit: (config: SessionConfig) => void;
  /**
   * Wenn true, gilt ohne bewusste Änderung immer das heutige Datum - auch wenn das
   * Formular seit gestern offen liegt. Wird gesetzt, solange die Anlieferung noch keine
   * erfasste Palette hat; dann gibt es kein Datum, das man schützen müsste.
   */
  datumAutoHeute?: boolean;
  submitLabel: string;
  title?: string;
  subtitle?: string;
  /** Zusätzliche Bedienelemente unter dem Formular (z.B. Sprachwahl). */
  children?: React.ReactNode;
}

export function SessionConfigForm({
  lang,
  config,
  personen,
  schlaege,
  sortenFuerSchlag,
  onAddPerson,
  onNeuePlanung,
  onSubmit,
  datumAutoHeute = false,
  submitLabel,
  title,
  subtitle,
  children,
}: SessionConfigFormProps) {
  const [local, setLocal] = useState<SessionConfig>(config);
  const [neuDialog, setNeuDialog] = useState<"schlag" | "sorte" | null>(null);
  /** Ob die Person das Datumsfeld selbst angefasst hat (dann nie überschreiben). */
  const [datumBeruehrt, setDatumBeruehrt] = useState(false);
  const datumId = useId();

  // Angezeigt und gespeichert wird heute, solange niemand das Feld bewusst geändert hat.
  const datumWert = !datumBeruehrt && datumAutoHeute ? todayIso() : local.datum;

  const complete = datumWert && local.person && local.schlag && local.sorte;
  const sorten = local.schlag ? sortenFuerSchlag(local.schlag) : [];

  function set<K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  /**
   * Beim Wechsel des Schlags wird die Sorte zurückgesetzt, sofern sie auf dem neuen
   * Schlag nicht vorkommt. Sonst bliebe eine Sorte stehen, die dort nicht wächst - und
   * ihre Kilos würden in der Anbauplanung unter einer Kombination landen, die es
   * gar nicht gibt.
   */
  function waehleSchlag(schlag: string) {
    setLocal((prev) => {
      const erlaubt = sortenFuerSchlag(schlag);
      return {
        ...prev,
        schlag,
        sorte: erlaubt.includes(prev.sorte) ? prev.sorte : "",
      };
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {title && <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>}
      {subtitle && <p className="-mt-3 text-neutral-500">{subtitle}</p>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={datumId} className="text-sm font-medium text-neutral-600">
          {t(lang, "date")}
        </label>
        <input
          id={datumId}
          type="date"
          value={datumWert}
          onChange={(e) => {
            setDatumBeruehrt(true);
            set("datum", e.target.value);
          }}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-lg"
        />
      </div>

      <ComboField
        lang={lang}
        label={t(lang, "person")}
        value={local.person}
        options={personen}
        neuModus="frei"
        onChange={(v) => {
          set("person", v);
          onAddPerson(v);
        }}
      />
      <ComboField
        lang={lang}
        label={t(lang, "field")}
        value={local.schlag}
        options={schlaege}
        neuModus="geschuetzt"
        onNeuAngefragt={() => setNeuDialog("schlag")}
        onChange={waehleSchlag}
      />
      <ComboField
        lang={lang}
        label={t(lang, "variety")}
        value={local.sorte}
        options={sorten}
        neuModus="geschuetzt"
        onNeuAngefragt={() => setNeuDialog("sorte")}
        onChange={(v) => set("sorte", v)}
        hinweis={local.schlag ? null : t(lang, "selectFieldFirst")}
      />

      <button
        type="button"
        disabled={!complete}
        onClick={() => onSubmit({ ...local, datum: datumWert })}
        className="mt-2 rounded-2xl bg-orange-600 py-4 text-xl font-semibold text-white shadow-sm active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {submitLabel}
      </button>

      {children}

      {neuDialog === "schlag" && (
        <NeuDialog
          lang={lang}
          titel={t(lang, "newFieldTitle")}
          // Ein Schlag ohne Sorte liesse sich nicht bewiegen, darum beides zusammen.
          felder={[
            { key: "schlag", label: t(lang, "field") },
            { key: "sorte", label: t(lang, "varietyOnField") },
          ]}
          onAbbrechen={() => setNeuDialog(null)}
          onSpeichern={({ schlag, sorte }) => {
            onNeuePlanung(schlag, sorte);
            setLocal((prev) => ({ ...prev, schlag, sorte }));
            setNeuDialog(null);
          }}
        />
      )}

      {neuDialog === "sorte" && (
        <NeuDialog
          lang={lang}
          titel={t(lang, "newVarietyTitle")}
          felder={[{ key: "sorte", label: t(lang, "varietyOnField") }]}
          onAbbrechen={() => setNeuDialog(null)}
          onSpeichern={({ sorte }) => {
            onNeuePlanung(local.schlag, sorte);
            set("sorte", sorte);
            setNeuDialog(null);
          }}
        />
      )}
    </div>
  );
}
