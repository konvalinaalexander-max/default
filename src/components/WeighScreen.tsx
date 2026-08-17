"use client";

import { useEffect, useRef, useState } from "react";
import { STANDARD_ANZAHL_KISTEN } from "@/lib/constants";
import { pruefePlausibilitaet } from "@/lib/plausibility";
import type { SorteStats } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";

interface WeighScreenProps {
  sorte: string;
  feld: string;
  sortenStats: Record<string, SorteStats>;
  offeneAnzahl: number;
  onSave: (draft: { anzahlKisten: number; gewichtBrutto: number }) => void;
}

export function WeighScreen({ sorte, feld, sortenStats, offeneAnzahl, onSave }: WeighScreenProps) {
  const [kisten, setKisten] = useState(String(STANDARD_ANZAHL_KISTEN));
  const [gewicht, setGewicht] = useState("");
  const [pendingWarning, setPendingWarning] = useState<{
    erwartetVon: number;
    erwartetBis: number;
    istWert: number;
  } | null>(null);
  const gewichtRef = useRef<HTMLInputElement>(null);
  const kistenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    gewichtRef.current?.focus();
  }, []);

  function speichern() {
    const anzahlKisten = Number(kisten.replace(",", "."));
    const gewichtBrutto = Number(gewicht.replace(",", "."));
    if (!anzahlKisten || !gewichtBrutto) return;

    const check = pruefePlausibilitaet(gewichtBrutto, anzahlKisten, sortenStats[sorte]);
    if (check.status === "warnung") {
      setPendingWarning({
        erwartetVon: check.erwartetVon,
        erwartetBis: check.erwartetBis,
        istWert: check.istWertProKiste,
      });
      return;
    }
    commit(anzahlKisten, gewichtBrutto);
  }

  function commit(anzahlKisten: number, gewichtBrutto: number) {
    onSave({ anzahlKisten, gewichtBrutto });
    setGewicht("");
    setKisten(String(STANDARD_ANZAHL_KISTEN));
    setPendingWarning(null);
    gewichtRef.current?.focus();
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="text-center text-neutral-500">
        <span className="font-medium text-neutral-800">{sorte}</span>
        {" · "}
        {feld}
        {offeneAnzahl > 0 && (
          <span className="ml-2 text-orange-600">· {offeneAnzahl} wird noch gespeichert…</span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="gewicht" className="text-center text-lg font-medium text-neutral-600">
            Gewicht brutto (kg)
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
            Anzahl Kisten
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
        Weiter →
      </button>

      {pendingWarning && (
        <ConfirmDialog
          tone="warning"
          title="Gewicht wirkt ungewöhnlich"
          message={`Üblich für ${sorte}: ${pendingWarning.erwartetVon.toFixed(1)}–${pendingWarning.erwartetBis.toFixed(
            1
          )} kg pro Kiste.\nAktuell eingegeben: ${pendingWarning.istWert.toFixed(1)} kg pro Kiste bei ${kisten} Kisten.\n\nStimmt die Anzahl Kisten wirklich?`}
          confirmLabel="Ja, trotzdem speichern"
          cancelLabel="Kisten-Anzahl korrigieren"
          onConfirm={() => commit(Number(kisten.replace(",", ".")), Number(gewicht.replace(",", ".")))}
          onCancel={() => {
            setPendingWarning(null);
            kistenRef.current?.focus();
            kistenRef.current?.select();
          }}
        />
      )}
    </div>
  );
}
