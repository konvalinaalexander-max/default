"use client";

import { useId, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import type { SessionConfig } from "@/lib/types";
import { ComboField } from "./ComboField";

interface SessionConfigFormProps {
  lang: Lang;
  config: SessionConfig;
  personen: string[];
  felder: string[];
  sorten: string[];
  onAddOption: (kind: "personen" | "felder" | "sorten", value: string) => void;
  onSubmit: (config: SessionConfig) => void;
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
  felder,
  sorten,
  onAddOption,
  onSubmit,
  submitLabel,
  title,
  subtitle,
  children,
}: SessionConfigFormProps) {
  const [local, setLocal] = useState<SessionConfig>(config);
  const datumId = useId();

  const complete = local.datum && local.person && local.feld && local.sorte;

  function set<K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
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
          value={local.datum}
          onChange={(e) => set("datum", e.target.value)}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-lg"
        />
      </div>

      <ComboField
        lang={lang}
        label={t(lang, "person")}
        value={local.person}
        options={personen}
        onChange={(v) => {
          set("person", v);
          onAddOption("personen", v);
        }}
      />
      <ComboField
        lang={lang}
        label={t(lang, "field")}
        value={local.feld}
        options={felder}
        onChange={(v) => {
          set("feld", v);
          onAddOption("felder", v);
        }}
      />
      <ComboField
        lang={lang}
        label={t(lang, "variety")}
        value={local.sorte}
        options={sorten}
        onChange={(v) => {
          set("sorte", v);
          onAddOption("sorten", v);
        }}
      />

      <button
        type="button"
        disabled={!complete}
        onClick={() => onSubmit(local)}
        className="mt-2 rounded-2xl bg-orange-600 py-4 text-xl font-semibold text-white shadow-sm active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {submitLabel}
      </button>

      {children}
    </div>
  );
}
