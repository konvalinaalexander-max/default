"use client";

import { useEffect, useRef, useState } from "react";
import { STANDARD_ANZAHL_KISTEN, STANDARD_GEBINDEART } from "@/lib/constants";
import { formatMenge, formatNumber, t, type Lang } from "@/lib/i18n";
import { pruefePlausibilitaet, waehlePrior } from "@/lib/plausibility";
import type { SorteStats, SorteVorwissen } from "@/lib/types";
import { BestaetigungsDialog } from "./BestaetigungsDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { NeuDialog } from "./NeuDialog";
import { QuickPicker } from "./QuickPicker";

interface WeighScreenProps {
  lang: Lang;
  sorte: string;
  schlag: string;
  gebindeart: string;
  /** Alle Schläge der Anbauplanung - auch hier wechselbar, ohne in die Einstellungen zu müssen. */
  schlaege: string[];
  sorten: string[];
  gebindearten: string[];
  /** Erlaubte Sorten je Schlag; nötig, um beim Schlagwechsel zu prüfen, ob die Sorte passt. */
  sortenFuerSchlag: (schlag: string) => string[];
  sortenStats: Record<string, SorteStats>;
  allgemeineStats: SorteStats | null;
  /** Vorwissen aus den Vorjahren, damit eine Sorte im neuen Jahr nicht bei null anfängt. */
  vorwissen: Record<string, SorteVorwissen>;
  allgemeinesVorwissen: SorteVorwissen | null;
  offeneAnzahl: number;
  /** Legt ein Schlag-Sorte-Paar in der Anbauplanung an (mit Passwort). */
  onNeuePlanung: (schlag: string, sorte: string) => void;
  /** Das Gebinde wird immer mitgegeben, damit kein noch nicht übernommener Zustand greift. */
  onSave: (draft: { anzahlKisten: number; gewichtBrutto: number; gebindeart: string }) => void;
  onChangeSchlag: (schlag: string) => void;
  /** Schlag und Sorte in einem Zug - verhindert einen Zwischenzustand ohne Sorte. */
  onChangeSchlagUndSorte: (schlag: string, sorte: string) => void;
  onChangeSorte: (sorte: string) => void;
  onChangeGebindeart: (gebindeart: string) => void;
}

type DialogZustand =
  | { art: "warnung"; von: number; bis: number; ist: number; kisten: number; gewicht: number }
  | { art: "unmoeglich" }
  | { art: "bestaetigung"; kisten: number; gewicht: number }
  | null;

export function WeighScreen({
  lang,
  sorte,
  schlag,
  gebindeart,
  schlaege,
  sorten,
  gebindearten,
  sortenFuerSchlag,
  sortenStats,
  allgemeineStats,
  vorwissen,
  allgemeinesVorwissen,
  offeneAnzahl,
  onNeuePlanung,
  onSave,
  onChangeSchlag,
  onChangeSchlagUndSorte,
  onChangeSorte,
  onChangeGebindeart,
}: WeighScreenProps) {
  const [kisten, setKisten] = useState(String(STANDARD_ANZAHL_KISTEN));
  const [gewicht, setGewicht] = useState("");
  const [dialog, setDialog] = useState<DialogZustand>(null);
  const [schlagwahlOffen, setSchlagwahlOffen] = useState(false);
  const [sortenwahlOffen, setSortenwahlOffen] = useState(false);
  const [gebindewahlOffen, setGebindewahlOffen] = useState(false);
  const [neuSorteOffen, setNeuSorteOffen] = useState(false);
  const [neuSchlagOffen, setNeuSchlagOffen] = useState(false);
  /**
   * Ein gewählter Schlag, zu dem die Sorte noch fehlt. Er wird bewusst erst übernommen,
   * wenn auch die Sorte feststeht: Würde die Sorte zwischenzeitlich geleert, gälte die
   * Anlieferung als unvollständig und die App spränge zurück ins Einrichtungsformular -
   * mitten im Wiegen.
   */
  const [offenerSchlag, setOffenerSchlag] = useState<string | null>(null);
  const gewichtRef = useRef<HTMLInputElement>(null);
  const kistenRef = useRef<HTMLInputElement>(null);

  const gebindeAbweichend = gebindeart !== STANDARD_GEBINDEART;

  useEffect(() => {
    gewichtRef.current?.focus();
  }, []);

  const zahl = (text: string) => Number(text.replace(",", "."));

  function speichern() {
    const anzahlKisten = zahl(kisten);
    const gewichtBrutto = zahl(gewicht);
    if (!anzahlKisten || !gewichtBrutto) return;

    const check = pruefePlausibilitaet(
      gewichtBrutto,
      anzahlKisten,
      gebindeart,
      sortenStats[sorte],
      waehlePrior(sorte, vorwissen, allgemeineStats, allgemeinesVorwissen)
    );

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
        gewicht: gewichtBrutto,
      });
      return;
    }
    setDialog({ art: "bestaetigung", kisten: anzahlKisten, gewicht: gewichtBrutto });
  }

  function commit(anzahlKisten: number, gewichtBrutto: number) {
    onSave({ anzahlKisten, gewichtBrutto, gebindeart });
    setGewicht("");
    setKisten(String(STANDARD_ANZAHL_KISTEN));
    setDialog(null);
    gewichtRef.current?.focus();
  }

  /**
   * Nach einem Schlagwechsel muss die Sorte dazu passen. Wächst sie dort nicht, wird sie
   * geleert und die Sortenwahl gleich geöffnet - so kann gar keine Kombination entstehen,
   * die es in der Anbauplanung nicht gibt.
   */
  function waehleSchlag(neuerSchlag: string) {
    setSchlagwahlOffen(false);
    if (neuerSchlag === schlag) return;

    const erlaubt = sortenFuerSchlag(neuerSchlag);
    if (erlaubt.includes(sorte)) {
      onChangeSchlag(neuerSchlag);
      return;
    }
    // Wächst dort nur eine Sorte, ist die Wahl eindeutig - dann ohne Rückfrage beides setzen.
    if (erlaubt.length === 1) {
      onChangeSchlagUndSorte(neuerSchlag, erlaubt[0]);
      return;
    }
    // Sonst zuerst die Sorte klären; bis dahin bleibt die Anlieferung unverändert.
    setOffenerSchlag(neuerSchlag);
    setSortenwahlOffen(true);
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Kopf: Schlag, Sorte und Gebinde bewusst als grosse, gut sichtbare Knöpfe.
          Genau hier entstehen die teuren Fehler - eine falsch stehende Angabe wird
          sonst über viele Paletten hinweg mitgeschleppt. */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSchlagwahlOffen(true)}
          aria-label={t(lang, "changeField")}
          className="w-full truncate rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-xl font-bold active:bg-neutral-50"
        >
          {schlag || t(lang, "pleaseSelect")} ▾
        </button>

        <div className="flex items-stretch gap-2">
          {/* Die Sorte bekommt den Platz, das Gebinde bleibt schmal - es ist fast immer
              der Standard. Weicht es ab, springt es durch die Farbe sofort ins Auge. */}
          <button
            type="button"
            onClick={() => setSortenwahlOffen(true)}
            aria-label={t(lang, "changeVariety")}
            className="min-w-0 flex-1 truncate rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-xl font-bold active:bg-neutral-50"
          >
            {sorte || t(lang, "pleaseSelect")} ▾
          </button>
          <button
            type="button"
            onClick={() => setGebindewahlOffen(true)}
            aria-label={t(lang, "changePackaging")}
            className={`shrink-0 whitespace-nowrap rounded-xl border-2 px-3 py-3 text-lg font-bold active:opacity-80 ${
              gebindeAbweichend
                ? "border-orange-500 bg-orange-100 text-orange-800"
                : "border-neutral-300 bg-white text-neutral-500"
            }`}
          >
            {gebindeart} ▾
          </button>
        </div>

        {offeneAnzahl > 0 && (
          <span className="text-center text-sm text-orange-600">
            {t(lang, "saving")} ({offeneAnzahl})
          </span>
        )}
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
          // Auch ein bewusst bestätigtes Ausreisser-Gewicht läuft noch über die
          // Schlussbestätigung - dort steht, worauf es gebucht wird.
          onConfirm={() =>
            setDialog({ art: "bestaetigung", kisten: dialog.kisten, gewicht: dialog.gewicht })
          }
          onCancel={() => {
            setDialog(null);
            gewichtRef.current?.focus();
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

      {dialog?.art === "bestaetigung" && (
        <BestaetigungsDialog
          lang={lang}
          zeilen={[
            { label: t(lang, "field"), wert: schlag },
            { label: t(lang, "variety"), wert: sorte },
            { label: t(lang, "packagingLabel"), wert: gebindeart },
            { label: t(lang, "cratesLabel"), wert: formatNumber(lang, dialog.kisten, 0) },
            {
              label: t(lang, "weightLabelShort"),
              wert: `${formatMenge(lang, dialog.gewicht)} kg`,
            },
          ]}
          onBestaetigen={() => commit(dialog.kisten, dialog.gewicht)}
          onAendern={() => {
            setDialog(null);
            gewichtRef.current?.focus();
          }}
        />
      )}

      {schlagwahlOffen && (
        <QuickPicker
          lang={lang}
          title={t(lang, "changeField")}
          options={schlaege}
          current={schlag}
          neuModus="geschuetzt"
          onNeuAngefragt={() => {
            setSchlagwahlOffen(false);
            setNeuSchlagOffen(true);
          }}
          onSelect={waehleSchlag}
          onCancel={() => setSchlagwahlOffen(false)}
        />
      )}

      {neuSchlagOffen && (
        <NeuDialog
          lang={lang}
          titel={t(lang, "newFieldTitle")}
          felder={[
            { key: "schlag", label: t(lang, "field") },
            { key: "sorte", label: t(lang, "varietyOnField") },
          ]}
          onAbbrechen={() => setNeuSchlagOffen(false)}
          onSpeichern={({ schlag: neuerSchlag, sorte: neueSorte }) => {
            onNeuePlanung(neuerSchlag, neueSorte);
            onChangeSchlag(neuerSchlag);
            onChangeSorte(neueSorte);
            setNeuSchlagOffen(false);
          }}
        />
      )}

      {sortenwahlOffen && (
        <QuickPicker
          lang={lang}
          title={t(lang, "changeVariety")}
          options={offenerSchlag ? sortenFuerSchlag(offenerSchlag) : sorten}
          current={offenerSchlag ? "" : sorte}
          neuModus="geschuetzt"
          onNeuAngefragt={() => {
            setSortenwahlOffen(false);
            setNeuSorteOffen(true);
          }}
          onSelect={(neu) => {
            if (offenerSchlag) onChangeSchlagUndSorte(offenerSchlag, neu);
            else onChangeSorte(neu);
            setOffenerSchlag(null);
            setSortenwahlOffen(false);
          }}
          // Abbrechen lässt alles wie es war - auch den bisherigen Schlag.
          onCancel={() => {
            setOffenerSchlag(null);
            setSortenwahlOffen(false);
          }}
        />
      )}

      {neuSorteOffen && (
        <NeuDialog
          lang={lang}
          titel={t(lang, "newVarietyTitle")}
          felder={[{ key: "sorte", label: t(lang, "varietyOnField") }]}
          onAbbrechen={() => {
            setOffenerSchlag(null);
            setNeuSorteOffen(false);
          }}
          onSpeichern={({ sorte: neu }) => {
            const zielSchlag = offenerSchlag ?? schlag;
            onNeuePlanung(zielSchlag, neu);
            if (offenerSchlag) onChangeSchlagUndSorte(offenerSchlag, neu);
            else onChangeSorte(neu);
            setOffenerSchlag(null);
            setNeuSorteOffen(false);
          }}
        />
      )}

      {gebindewahlOffen && (
        <QuickPicker
          lang={lang}
          title={t(lang, "changePackaging")}
          options={gebindearten}
          current={gebindeart}
          // Die Gebindearten liegen mit ihrem Leergewicht fest - hier gibt es nichts
          // hinzuzufügen, was die App nicht ausrechnen könnte.
          neuModus="keine"
          onSelect={(neu) => {
            onChangeGebindeart(neu);
            setGebindewahlOffen(false);
          }}
          onCancel={() => setGebindewahlOffen(false)}
        />
      )}
    </div>
  );
}
