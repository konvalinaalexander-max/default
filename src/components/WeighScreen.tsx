"use client";

import { useEffect, useRef, useState } from "react";
import { STANDARD_ANZAHL_KISTEN } from "@/lib/constants";
import { formatNumber, t, type Lang } from "@/lib/i18n";
import { pruefePlausibilitaet } from "@/lib/plausibility";
import type { SorteStats } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { QuickPicker } from "./QuickPicker";

interface WeighScreenProps {
  lang: Lang;
  sorte: string;
  feld: string;
  sorten: string[];
  sortenStats: Record<string, SorteStats>;
  offeneAnzahl: number;
  onSave: (draft: { anzahlKisten: number; gewichtBrutto: number }) => void;
  onChangeSorte: (sorte: string) => void;
}

type DialogZustand =
  | { art: "warnung"; von: number; bis: number; ist: number; kisten: number }
  | { art: "unmoeglich" }
  | null;

export function WeighScreen({
  lang,
  sorte,
  feld,
  sorten,
  sortenStats,
  offeneAnzahl,
  onSave,
  onChangeSorte,
}: WeighScreenProps) {
  const [kisten, setKisten] = useState(String(STANDARD_ANZAHL_KISTEN));
  const [gewicht, setGewicht] = useState("");
  const [dialog, setDialog] = useState<DialogZustand>(null);
  const [sortenwahlOffen, setSortenwahlOffen] = useState(false);
  const gewichtRef = useRef<HTMLInputElement>(null);
  const kistenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    gewichtRef.current?.focus();
  }, []);

  const zahl = (text: string) => Number(text.replace(",", "."));

  function speichern() {
    const anzahlKisten = zahl(kisten);
    const gewichtBrutto = zahl(gewicht);
    if (!anzahlKisten || !gewichtBrutto) return;

    const check = pruefePlausibilitaet(gewichtBrutto, anzahlKisten, sortenStats[sorte]);

    if (check.status === "unmoeglich") {
      setDialog({ art: "unmoeglich" });
      return;
    }
    if (check.status === "warnung") {
      setDialog({
        art: "warnung",
        von: check.erwartetVon,
        bis: check.erwartetBis,
        ist: check.istWertProKiste,
        kisten: anzahlKisten,
      });
      return;
    }
    commit(anzahlKisten, gewichtBrutto);
  }

  function commit(anzahlKisten: number, gewichtBrutto: number) {
    onSave({ anzahlKisten, gewichtBrutto });
    setGewicht("");
    setKisten(String(STANDARD_ANZAHL_KISTEN));
    setDialog(null);
    gewichtRef.current?.focus();
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setSortenwahlOffen(true)}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-lg font-semibold active:bg-neutral-50"
        >
          {sorte} ▾
        </button>
        <span className="text-sm text-neutral-500">
          {feld}
          {offeneAnzahl > 0 && (
            <span className="ml-2 text-orange-600">
              · {t(lang, "saving")} ({offeneAnzahl})
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="gewicht" className="text-center text-lg font-medium text-neutral-600">
            {t(lang, "grossWeight")}
          </label>
          <input
            id="gewicht"
            ref={gewichtRef}
            type="number"
            inputMode="decimal"
            value={gewicht}
            onChange={(e) => setGewicht(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && kistenRef.current?.focus()}
            placeholder="0"
            className="rounded-2xl border-2 border-neutral-300 bg-white py-6 text-center text-6xl font-bold tabular-nums focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="kisten" className="text-center text-lg font-medium text-neutral-600">
            {t(lang, "crateCount")}
          </label>
          <input
            id="kisten"
            ref={kistenRef}
            type="number"
            inputMode="numeric"
            value={kisten}
            onChange={(e) => setKisten(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === "Enter" && speichern()}
            className="rounded-2xl border-2 border-neutral-300 bg-white py-6 text-center text-6xl font-bold tabular-nums focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={speichern}
        disabled={!kisten || !gewicht}
        className="rounded-2xl bg-orange-600 py-6 text-2xl font-bold text-white shadow-sm active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {t(lang, "next")} →
      </button>

      {dialog?.art === "warnung" && (
        <ConfirmDialog
          tone="warning"
          title={t(lang, "unusualTitle")}
          message={[
            t(lang, "unusualUsual", {
              von: formatNumber(lang, dialog.von, 1),
              bis: formatNumber(lang, dialog.bis, 1),
            }),
            t(lang, "unusualYours", { ist: formatNumber(lang, dialog.ist, 1) }),
            "",
            t(lang, "unusualQuestion"),
          ].join("\n")}
          confirmLabel={t(lang, "saveAnyway")}
          cancelLabel={t(lang, "fixEntry")}
          onConfirm={() => commit(zahl(kisten), zahl(gewicht))}
          onCancel={() => {
            setDialog(null);
            kistenRef.current?.focus();
            kistenRef.current?.select();
          }}
        />
      )}

      {dialog?.art === "unmoeglich" && (
        <ConfirmDialog
          tone="warning"
          title={t(lang, "impossibleTitle")}
          message={t(lang, "impossibleMsg")}
          confirmLabel={t(lang, "ok")}
          onConfirm={() => {
            setDialog(null);
            gewichtRef.current?.focus();
          }}
          onCancel={() => setDialog(null)}
        />
      )}

      {sortenwahlOffen && (
        <QuickPicker
          lang={lang}
          title={t(lang, "changeVariety")}
          options={sorten}
          current={sorte}
          onSelect={(neu) => {
            onChangeSorte(neu);
            setSortenwahlOffen(false);
          }}
          onCancel={() => setSortenwahlOffen(false)}
        />
      )}
    </div>
  );
}
