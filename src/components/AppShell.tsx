"use client";

import { useState } from "react";
import { formatDate, formatTime, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useReferenceData } from "@/lib/useReferenceData";
import { useSession } from "@/lib/useSession";
import { ConfirmDialog } from "./ConfirmDialog";
import { LanguagePicker } from "./LanguagePicker";
import { EinrichtenKnopf } from "./EinrichtenKnopf";
import { OverviewScreen } from "./OverviewScreen";
import { SessionConfigForm } from "./SessionConfigForm";
import { WeighScreen } from "./WeighScreen";

export function AppShell() {
  const { lang, setLang } = useLanguage();
  const session = useSession();
  const ref = useReferenceData();
  // Die Ansicht liegt hier und nicht in der Übersicht, damit sie das Anzeigen der
  // Sprachwahl übersteht: nach der Sprachwahl geht es genau dort weiter.
  const [view, setView] = useState<"wiegen" | "uebersicht" | "einstellungen">("wiegen");
  const [sprachwahlOffen, setSprachwahlOffen] = useState(false);
  const [datumHinweisWeg, setDatumHinweisWeg] = useState(false);

  const needsSetup = !session.config.person || !session.config.schlag || !session.config.sorte;

  // Vor allem anderen die Sprache klären - ohne sie versteht die Person den Rest nicht.
  if (!lang) {
    return (
      <Frame>
        <LanguagePicker onSelect={setLang} />
      </Frame>
    );
  }

  if (sprachwahlOffen) {
    return (
      <Frame>
        <LanguagePicker
          current={lang}
          headingLang={lang}
          onSelect={(neu) => {
            setLang(neu);
            setSprachwahlOffen(false);
          }}
          onBack={() => setSprachwahlOffen(false)}
        />
      </Frame>
    );
  }

  return (
    <Frame>
      {ref.error && (
        <div className="mb-3 flex flex-col gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>
            {t(lang, "connectionFailed")}{" "}
            <button type="button" onClick={ref.reload} className="font-semibold underline">
              {t(lang, "tryAgain")}
            </button>
          </span>
          {/* Der technische Grund gehört sichtbar dazu. Ohne ihn liess sich von aussen
              nicht unterscheiden, ob das Netz fehlt, die Zugangsdaten falsch sind oder
              ein Tabellenblatt anders heisst als erwartet. */}
          <span className="text-xs text-red-500/90">{ref.error}</span>
        </div>
      )}

      {/* Ohne Anbauplanung gibt es keine Schläge zur Auswahl - dann muss erkennbar sein,
          dass zuerst die Einrichtung fehlt, und nicht etwa die Liste leer ist. */}
      {!ref.loading && !ref.planungGelesen && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t(lang, "planMissing")}
        </div>
      )}

      {needsSetup ? (
        <SessionConfigForm
          lang={lang}
          config={session.config}
          personen={ref.personen}
          schlaege={ref.schlaege}
          sortenFuerSchlag={ref.sortenFuerSchlag}
          onAddPerson={ref.addLocalPerson}
          onNeuePlanung={ref.addLocalPlanung}
          onSubmit={(cfg) => session.applyConfigChange(cfg, false)}
          // Ohne erfasste Palette gibt es kein Datum, das man schützen müsste - dann
          // gilt immer heute, selbst wenn das Formular seit gestern offen liegt.
          datumAutoHeute={session.entries.length === 0}
          submitLabel={t(lang, "startWeighing")}
          title={t(lang, "newDeliveryTitle")}
          subtitle={t(lang, "setupHint")}
        >
          <button
            type="button"
            onClick={() => setSprachwahlOffen(true)}
            className="rounded-xl border border-neutral-300 bg-white py-3.5 text-lg font-medium text-neutral-700 active:bg-neutral-50"
          >
            🌐 {t(lang, "language")}
          </button>

          {/* Nur sichtbar, wenn die Anbauplanung fehlt - also genau in der Klemme, aus der
              der Knopf heraushilft. Läuft alles, sieht der Erntehelfer einen aufgeräumten
              Bildschirm ohne Technik-Knopf, den er nicht braucht. In den Einstellungen
              bleibt der Knopf für den Betriebsleiter immer erreichbar. */}
          {!ref.planungGelesen && <EinrichtenKnopf lang={lang} onFertig={ref.reload} />}
        </SessionConfigForm>
      ) : view === "wiegen" ? (
        <>
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setView("uebersicht")}
              className="rounded-lg px-3 py-2 text-base font-medium text-neutral-500"
            >
              📋 {t(lang, "overview")} ({session.entries.length})
            </button>
          </div>
          <WeighScreen
            lang={lang}
            sorte={session.config.sorte}
            schlag={session.config.schlag}
            gebindeart={session.config.gebindeart}
            schlaege={ref.schlaege}
            // Nur die Sorten, die auf diesem Schlag stehen.
            sorten={ref.sortenFuerSchlag(session.config.schlag)}
            sortenFuerSchlag={ref.sortenFuerSchlag}
            gebindearten={ref.gebindearten}
            sortenStats={ref.sortenStats}
            allgemeineStats={ref.allgemeineStats}
            vorwissen={ref.vorwissen}
            allgemeinesVorwissen={ref.allgemeinesVorwissen}
            offeneAnzahl={session.offeneAnzahl}
            onNeuePlanung={ref.addLocalPlanung}
            onSave={session.addEntry}
            onChangeSchlag={(schlag) => {
              // Nur für neue Paletten - die bereits erfassten behalten ihren Schlag.
              session.applyConfigChange({ schlag }, false);
            }}
            onChangeSchlagUndSorte={(schlag, sorte) => {
              // Beides zusammen: sonst wäre die Anlieferung kurz ohne Sorte und die App
              // würde zurück ins Einrichtungsformular springen.
              session.applyConfigChange({ schlag, sorte }, false);
            }}
            onChangeSorte={(sorte) => {
              // Nur für neue Paletten - die bereits erfassten behalten ihre Sorte.
              session.applyConfigChange({ sorte }, false);
            }}
            onChangeGebindeart={(gebindeart) => {
              session.applyConfigChange({ gebindeart }, false);
            }}
          />
        </>
      ) : (
        <OverviewScreen
          lang={lang}
          mode={view === "einstellungen" ? "settings" : "list"}
          onChangeMode={(m) => setView(m === "settings" ? "einstellungen" : "uebersicht")}
          config={session.config}
          entries={session.entries}
          personen={ref.personen}
          schlaege={ref.schlaege}
          sortenFuerSchlag={ref.sortenFuerSchlag}
          onAddPerson={ref.addLocalPerson}
          onNeuePlanung={ref.addLocalPlanung}
          onApplyConfigChange={session.applyConfigChange}
          onUpdateEntry={session.updateEntry}
          onRetryEntry={session.retryEntry}
          onRemoveEntry={session.removeEntry}
          onBack={() => setView("wiegen")}
          onStartNewSession={session.startNewSession}
          onOpenLanguage={() => setSprachwahlOffen(true)}
          datumAutoHeute={session.entries.length === 0}
          onEinrichtungFertig={ref.reload}
        />
      )}

      {/* Lange Pause: wahrscheinlich ein neuer Lastwagen. Es wird gefragt, nie
          automatisch zurückgesetzt - erfasste Paletten dürfen nicht ungefragt
          aus der Übersicht verschwinden. */}
      {session.pauseZuLang && (
        <ConfirmDialog
          title={t(lang, "stillRunningTitle")}
          message={t(lang, "stillRunningMsg", {
            zeit: formatTime(lang, session.letzteAktivitaet),
          })}
          confirmLabel={t(lang, "continueDelivery")}
          cancelLabel={t(lang, "newDeliveryShort")}
          onConfirm={session.bestaetigeWeiterlauf}
          onCancel={() => {
            session.startNewSession();
            setView("wiegen");
          }}
        />
      )}

      {/* Handy lag über Nacht offen: das Datum der Anlieferung stimmt dann nicht mehr. */}
      {session.datumIstVeraltet && !datumHinweisWeg && !session.pauseZuLang && (
        <ConfirmDialog
          title={t(lang, "dateChangedTitle")}
          message={t(lang, "dateChangedMsg", {
            alt: formatDate(lang, session.config.datum),
            neu: formatDate(lang, session.heute),
          })}
          confirmLabel={t(lang, "useToday")}
          cancelLabel={t(lang, "keepDate")}
          onConfirm={() => {
            session.setDatum(session.heute);
            setDatumHinweisWeg(true);
          }}
          onCancel={() => setDatumHinweisWeg(true)}
        />
      )}
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col px-4 py-4">
      {children}
    </div>
  );
}
