export type Lang = "de" | "en" | "hu" | "pl" | "pt";

export const LANGUAGES: { code: Lang; name: string; locale: string }[] = [
  { code: "de", name: "Deutsch", locale: "de-CH" },
  { code: "en", name: "English", locale: "en-GB" },
  { code: "hu", name: "Magyar", locale: "hu-HU" },
  { code: "pl", name: "Polski", locale: "pl-PL" },
  { code: "pt", name: "Português", locale: "pt-PT" },
];

export const DEFAULT_LANG: Lang = "de";

/**
 * Alle Texte der App. Absichtlich kurze, einfache Sätze ohne Nebensätze und ohne
 * Zahlwörter direkt vor einem Substantiv - dadurch entstehen in keiner Sprache
 * falsche Plural- oder Fallformen.
 */
const TEXTS = {
  // --- Sprachwahl ---
  chooseLanguage: {
    de: "Sprache wählen",
    en: "Choose language",
    hu: "Válassz nyelvet",
    pl: "Wybierz język",
    pt: "Escolher idioma",
  },
  language: {
    de: "Sprache",
    en: "Language",
    hu: "Nyelv",
    pl: "Język",
    pt: "Idioma",
  },

  // --- Anlieferung anlegen ---
  newDeliveryTitle: {
    de: "Neue Anlieferung",
    en: "New delivery",
    hu: "Új beszállítás",
    pl: "Nowa dostawa",
    pt: "Nova entrega",
  },
  setupHint: {
    de: "Diese Angaben gelten für alle Paletten. Du kannst sie später ändern.",
    en: "These details apply to all pallets. You can change them later.",
    hu: "Ezek az adatok minden palettára érvényesek. Később módosíthatod.",
    pl: "Te dane dotyczą wszystkich palet. Możesz je później zmienić.",
    pt: "Estes dados aplicam-se a todas as paletes. Pode alterar mais tarde.",
  },
  date: {
    de: "Datum",
    en: "Date",
    hu: "Dátum",
    pl: "Data",
    pt: "Data",
  },
  person: {
    de: "Person",
    en: "Person",
    hu: "Személy",
    pl: "Osoba",
    pt: "Pessoa",
  },
  // Heisst absichtlich "Schlag" wie in der Anbauplanung - dieselbe Sache soll überall
  // gleich heissen, im Sheet, in der App und auf dem Plan.
  field: {
    de: "Schlag",
    en: "Field",
    hu: "Terület",
    pl: "Pole",
    pt: "Campo",
  },
  variety: {
    de: "Sorte",
    en: "Variety",
    hu: "Fajta",
    pl: "Odmiana",
    pt: "Variedade",
  },
  pleaseSelect: {
    de: "Bitte wählen",
    en: "Please select",
    hu: "Válassz",
    pl: "Wybierz",
    pt: "Selecionar",
  },
  addNew: {
    de: "Neu",
    en: "New",
    hu: "Új",
    pl: "Nowy",
    pt: "Novo",
  },
  addNewAria: {
    de: "Neuen Wert hinzufügen",
    en: "Add a new value",
    hu: "Új érték hozzáadása",
    pl: "Dodaj nową wartość",
    pt: "Adicionar novo valor",
  },

  // --- Geschützte Neuanlage (nur Betriebsleiter) ---
  // Steht als letzter Eintrag im Dropdown. Die Pluszeichen heben ihn von den
  // Schlag- und Sortennamen ab; ein natives Auswahlfeld lässt sich nicht einfärben.
  addNewOption: {
    de: "+++ Neu +++",
    en: "+++ New +++",
    hu: "+++ Új +++",
    pl: "+++ Nowy +++",
    pt: "+++ Novo +++",
  },
  newFieldTitle: {
    de: "Neuer Schlag",
    en: "New field",
    hu: "Új terület",
    pl: "Nowe pole",
    pt: "Novo campo",
  },
  newVarietyTitle: {
    de: "Neue Sorte",
    en: "New variety",
    hu: "Új fajta",
    pl: "Nowa odmiana",
    pt: "Nova variedade",
  },
  adminOnly: {
    de: "Nur für den Betriebsleiter.",
    en: "For the farm manager only.",
    hu: "Csak az üzemvezetőnek.",
    pl: "Tylko dla kierownika.",
    pt: "Apenas para o gestor.",
  },
  passwordLabel: {
    de: "Passwort",
    en: "Password",
    hu: "Jelszó",
    pl: "Hasło",
    pt: "Palavra-passe",
  },
  passwordWrong: {
    de: "Passwort stimmt nicht.",
    en: "Wrong password.",
    hu: "Hibás jelszó.",
    pl: "Błędne hasło.",
    pt: "Palavra-passe errada.",
  },
  varietyOnField: {
    de: "Sorte auf diesem Schlag",
    en: "Variety on this field",
    hu: "Fajta ezen a területen",
    pl: "Odmiana na tym polu",
    pt: "Variedade neste campo",
  },
  // Ein neuer Schlag ohne Sorte wäre nicht bewiegbar - beides wird zusammen erfasst.
  newFieldNeedsVariety: {
    de: "Bitte Schlag und Sorte angeben.",
    en: "Please enter field and variety.",
    hu: "Adj meg területet és fajtát.",
    pl: "Podaj pole i odmianę.",
    pt: "Indique campo e variedade.",
  },
  selectFieldFirst: {
    de: "Zuerst den Schlag wählen.",
    en: "Choose the field first.",
    hu: "Először válassz területet.",
    pl: "Najpierw wybierz pole.",
    pt: "Escolha primeiro o campo.",
  },

  // --- Einrichtung des Dokuments ---
  setupSheet: {
    de: "Sheet einrichten",
    en: "Set up sheet",
    hu: "Táblázat beállítása",
    pl: "Skonfiguruj arkusz",
    pt: "Configurar folha",
  },
  setupRunning: {
    de: "Wird eingerichtet …",
    en: "Setting up …",
    hu: "Beállítás …",
    pl: "Konfigurowanie …",
    pt: "A configurar …",
  },
  setupDone: {
    de: "Einrichtung fertig",
    en: "Setup complete",
    hu: "A beállítás kész",
    pl: "Konfiguracja gotowa",
    pt: "Configuração concluída",
  },
  // --- Bestätigung vor dem Speichern ---
  confirmTitle: {
    de: "Stimmt das so?",
    en: "Is this correct?",
    hu: "Így helyes?",
    pl: "Czy to się zgadza?",
    pt: "Está correto?",
  },
  confirmSave: {
    de: "Ja, speichern",
    en: "Yes, save",
    hu: "Igen, mentés",
    pl: "Tak, zapisz",
    pt: "Sim, guardar",
  },
  confirmChange: {
    de: "Nein, ändern",
    en: "No, change",
    hu: "Nem, módosítás",
    pl: "Nie, zmień",
    pt: "Não, alterar",
  },
  weightLabelShort: {
    de: "Gewicht brutto",
    en: "Gross weight",
    hu: "Bruttó súly",
    pl: "Waga brutto",
    pt: "Peso bruto",
  },
  packagingLabel: {
    de: "Gebinde",
    en: "Packaging",
    hu: "Csomagolás",
    pl: "Opakowanie",
    pt: "Embalagem",
  },
  changeField: {
    de: "Schlag wechseln",
    en: "Change field",
    hu: "Terület váltása",
    pl: "Zmień pole",
    pt: "Mudar campo",
  },
  setupSkipped: {
    de: "War schon in Ordnung",
    en: "Already fine",
    hu: "Már rendben volt",
    pl: "Już było dobrze",
    pt: "Já estava bem",
  },
  setupExplain: {
    de: "Zum Jahreswechsel nicht nötig — die App richtet sich beim Öffnen selbst ein. Nur zum Reparieren. Ändert keine Daten, kann gefahrlos gedrückt werden.",
    en: "Not needed at the new year — the app sets itself up on open. For repairs only. Changes no data, safe to press.",
    hu: "Évfordulókor nem szükséges — az app induláskor magától beáll. Csak javításra. Nem módosít adatot, nyugodtan megnyomható.",
    pl: "Niepotrzebne przy zmianie roku — aplikacja konfiguruje się sama. Tylko do naprawy. Nie zmienia danych, można bezpiecznie użyć.",
    pt: "Não é preciso na virada do ano — a app configura-se sozinha. Só para reparar. Não altera dados, seguro de usar.",
  },
  // Erklärt leere Schlag- und Sortenlisten. Ohne diesen Hinweis sähe es aus, als wäre
  // die App kaputt, obwohl nur die Einrichtung noch aussteht.
  planMissing: {
    de: "Die Anbauplanung ist noch nicht eingerichtet. Schlag und Sorte sind erst danach wählbar — dazu unten „Sheet einrichten“ drücken.",
    en: "The crop plan is not set up yet. Field and variety become selectable after that — use “Set up sheet” below.",
    hu: "A termesztési terv még nincs beállítva. A terület és a fajta utána választható — lent a „Táblázat beállítása”.",
    pl: "Plan uprawy nie jest jeszcze gotowy. Pole i odmianę wybierzesz potem — użyj „Skonfiguruj arkusz” poniżej.",
    pt: "O plano de cultivo ainda não está configurado. Campo e variedade ficam disponíveis depois — use “Configurar folha” abaixo.",
  },
  startWeighing: {
    de: "Weiter zum Wiegen",
    en: "Start weighing",
    hu: "Tovább a méréshez",
    pl: "Przejdź do ważenia",
    pt: "Continuar para a pesagem",
  },

  // --- Wiegen ---
  grossWeight: {
    de: "Gewicht brutto (kg)",
    en: "Gross weight (kg)",
    hu: "Bruttó súly (kg)",
    pl: "Waga brutto (kg)",
    pt: "Peso bruto (kg)",
  },
  crateCount: {
    de: "Anzahl Kisten",
    en: "Number of crates",
    hu: "Ládák száma",
    pl: "Liczba skrzynek",
    pt: "Número de caixas",
  },
  next: {
    de: "Weiter",
    en: "Next",
    hu: "Tovább",
    pl: "Dalej",
    pt: "Continuar",
  },
  overview: {
    de: "Übersicht",
    en: "Overview",
    hu: "Áttekintés",
    pl: "Przegląd",
    pt: "Lista",
  },
  changeVariety: {
    de: "Sorte wechseln",
    en: "Change variety",
    hu: "Fajta váltása",
    pl: "Zmień odmianę",
    pt: "Mudar variedade",
  },

  // --- Zustände ---
  saving: {
    de: "wird gespeichert",
    en: "saving",
    hu: "mentés folyamatban",
    pl: "zapisywanie",
    pt: "a guardar",
  },
  saved: {
    de: "gespeichert",
    en: "saved",
    hu: "mentve",
    pl: "zapisano",
    pt: "guardado",
  },
  errorLabel: {
    de: "Fehler",
    en: "Error",
    hu: "Hiba",
    pl: "Błąd",
    pt: "Erro",
  },
  tryAgain: {
    de: "Erneut versuchen",
    en: "Try again",
    hu: "Újra",
    pl: "Ponów",
    pt: "Tentar novamente",
  },
  waitingForConnection: {
    de: "Kein Netz. Wird automatisch gesendet.",
    en: "No connection. Will be sent automatically.",
    hu: "Nincs kapcsolat. Automatikusan elküldjük.",
    pl: "Brak połączenia. Zostanie wysłane automatycznie.",
    pt: "Sem ligação. Será enviado automaticamente.",
  },
  connectionFailed: {
    de: "Verbindung zum Sheet fehlgeschlagen",
    en: "Connection to the sheet failed",
    hu: "A táblázat nem érhető el",
    pl: "Brak połączenia z arkuszem",
    pt: "Falha na ligação à folha",
  },

  // --- Plausibilitätsprüfung ---
  unusualTitle: {
    de: "Gewicht wirkt ungewöhnlich",
    en: "Weight looks unusual",
    hu: "A súly szokatlan",
    pl: "Waga wygląda nietypowo",
    pt: "O peso parece invulgar",
  },
  unusualUsual: {
    de: "Üblich pro Kiste: {von} bis {bis} kg",
    en: "Usual per crate: {von} to {bis} kg",
    hu: "Szokásos ládánként: {von} és {bis} kg között",
    pl: "Zwykle na skrzynkę: {von} do {bis} kg",
    pt: "Habitual por caixa: {von} a {bis} kg",
  },
  unusualYours: {
    de: "Deine Eingabe pro Kiste: {ist} kg",
    en: "Your entry per crate: {ist} kg",
    hu: "A beírt érték ládánként: {ist} kg",
    pl: "Twój wpis na skrzynkę: {ist} kg",
    pt: "O seu valor por caixa: {ist} kg",
  },
  unusualQuestion: {
    de: "Ist die Anzahl Kisten richtig?",
    en: "Is the number of crates correct?",
    hu: "Helyes a ládák száma?",
    pl: "Czy liczba skrzynek jest poprawna?",
    pt: "O número de caixas está correto?",
  },
  saveAnyway: {
    de: "Ja, trotzdem speichern",
    en: "Yes, save anyway",
    hu: "Igen, mentés így",
    pl: "Tak, zapisz",
    pt: "Sim, guardar assim",
  },
  fixEntry: {
    de: "Eingabe korrigieren",
    en: "Correct the entry",
    hu: "Bejegyzés javítása",
    pl: "Popraw wpis",
    pt: "Corrigir o valor",
  },
  impossibleTitle: {
    de: "Eingabe nicht möglich",
    en: "Entry not possible",
    hu: "Az érték nem lehetséges",
    pl: "Wpis niemożliwy",
    pt: "Valor impossível",
  },
  impossibleMsg: {
    de: "Das Gewicht ist zu klein für diese Anzahl Kisten. Bitte prüfe beide Werte.",
    en: "The weight is too low for this number of crates. Please check both values.",
    hu: "A súly túl kicsi ennyi ládához. Kérlek, ellenőrizd mindkét értéket.",
    pl: "Waga jest za mała dla tej liczby skrzynek. Sprawdź oba wpisy.",
    pt: "O peso é demasiado baixo para este número de caixas. Verifique os dois valores.",
  },
  ok: {
    de: "OK",
    en: "OK",
    hu: "OK",
    pl: "OK",
    pt: "OK",
  },

  // --- Übersicht ---
  backToWeighing: {
    de: "Zurück zum Wiegen",
    en: "Back to weighing",
    hu: "Vissza a méréshez",
    pl: "Powrót do ważenia",
    pt: "Voltar à pesagem",
  },
  backToOverview: {
    de: "Zurück zur Übersicht",
    en: "Back to the overview",
    hu: "Vissza az áttekintéshez",
    pl: "Powrót do przeglądu",
    pt: "Voltar à lista",
  },
  settings: {
    de: "Einstellungen",
    en: "Settings",
    hu: "Beállítások",
    pl: "Ustawienia",
    pt: "Definições",
  },
  noPallets: {
    de: "Noch keine Palette erfasst.",
    en: "No pallets saved yet.",
    hu: "Még nincs mentett paletta.",
    pl: "Brak zapisanych palet.",
    pt: "Ainda não há paletes guardadas.",
  },
  cratesLabel: {
    de: "Kisten",
    en: "Crates",
    hu: "Ládák",
    pl: "Skrzynki",
    pt: "Caixas",
  },
  /** Für Grossgebinde: dort gibt es keinen sinnvollen Wert "pro Kiste". */
  netLabel: {
    de: "netto",
    en: "net",
    hu: "nettó",
    pl: "netto",
    pt: "líquido",
  },
  perCrate: {
    de: "kg pro Kiste",
    en: "kg per crate",
    hu: "kg ládánként",
    pl: "kg na skrzynkę",
    pt: "kg por caixa",
  },
  edit: {
    de: "Bearbeiten",
    en: "Edit",
    hu: "Szerkesztés",
    pl: "Edytuj",
    pt: "Editar",
  },
  deleteLabel: {
    de: "Löschen",
    en: "Delete",
    hu: "Törlés",
    pl: "Usuń",
    pt: "Eliminar",
  },
  save: {
    de: "Speichern",
    en: "Save",
    hu: "Mentés",
    pl: "Zapisz",
    pt: "Guardar",
  },
  cancel: {
    de: "Abbrechen",
    en: "Cancel",
    hu: "Mégse",
    pl: "Anuluj",
    pt: "Cancelar",
  },
  weightKg: {
    de: "Gewicht (kg)",
    en: "Weight (kg)",
    hu: "Súly (kg)",
    pl: "Waga (kg)",
    pt: "Peso (kg)",
  },
  deletePalletTitle: {
    de: "Palette löschen?",
    en: "Delete pallet?",
    hu: "Törlöd a palettát?",
    pl: "Usunąć paletę?",
    pt: "Eliminar palete?",
  },
  deletePalletMsg: {
    de: "Die Palette wird aus dem Sheet entfernt. Das kann nicht rückgängig gemacht werden.",
    en: "The pallet will be removed from the sheet. This cannot be undone.",
    hu: "A paletta törlődik a táblázatból. Ez nem vonható vissza.",
    pl: "Paleta zostanie usunięta z arkusza. Nie można tego cofnąć.",
    pt: "A palete será removida da folha. Não é possível anular.",
  },
  yesDelete: {
    de: "Ja, löschen",
    en: "Yes, delete",
    hu: "Igen, törlés",
    pl: "Tak, usuń",
    pt: "Sim, eliminar",
  },

  // --- Neue Anlieferung / rückwirkende Änderung ---
  startNewDelivery: {
    de: "Neue Anlieferung starten",
    en: "Start a new delivery",
    hu: "Új beszállítás indítása",
    pl: "Rozpocznij nową dostawę",
    pt: "Iniciar nova entrega",
  },
  startNewDeliveryTitle: {
    de: "Neue Anlieferung starten?",
    en: "Start a new delivery?",
    hu: "Új beszállítás indítása?",
    pl: "Rozpocząć nową dostawę?",
    pt: "Iniciar nova entrega?",
  },
  startNewDeliveryMsg: {
    de: "Die erfassten Paletten bleiben im Sheet. Schlag und Sorte werden zurückgesetzt.",
    en: "The saved pallets stay in the sheet. Field and variety are reset.",
    hu: "A mentett paletták a táblázatban maradnak. A terület és a fajta törlődik.",
    pl: "Zapisane palety zostają w arkuszu. Pole i odmiana zostaną wyczyszczone.",
    pt: "As paletes guardadas ficam na folha. Campo e variedade são apagados.",
  },
  yesNewDelivery: {
    de: "Ja, neue Anlieferung",
    en: "Yes, new delivery",
    hu: "Igen, új beszállítás",
    pl: "Tak, nowa dostawa",
    pt: "Sim, nova entrega",
  },
  retroTitle: {
    de: "Erfasste Paletten auch ändern?",
    en: "Change the saved pallets too?",
    hu: "A mentett palettákat is módosítod?",
    pl: "Zmienić też zapisane palety?",
    pt: "Alterar também as paletes guardadas?",
  },
  retroMsg: {
    de: "Sollen die neuen Angaben auch für die schon gespeicherten Paletten gelten?",
    en: "Should the new details also apply to the pallets already saved?",
    hu: "Az új adatok a már mentett palettákra is érvényesek legyenek?",
    pl: "Czy nowe dane mają dotyczyć także już zapisanych palet?",
    pt: "Os novos dados também devem aplicar-se às paletes já guardadas?",
  },
  yesChangeAll: {
    de: "Ja, alle ändern",
    en: "Yes, change all",
    hu: "Igen, mindet",
    pl: "Tak, zmień wszystkie",
    pt: "Sim, alterar todas",
  },
  noOnlyNew: {
    de: "Nein, nur neue",
    en: "No, only new ones",
    hu: "Nem, csak az újakat",
    pl: "Nie, tylko nowe",
    pt: "Não, só as novas",
  },

  // --- Gebindeart ---
  packaging: {
    de: "Gebinde",
    en: "Packaging",
    hu: "Csomagolás",
    pl: "Opakowanie",
    pt: "Embalagem",
  },
  changePackaging: {
    de: "Gebinde ändern",
    en: "Change packaging",
    hu: "Csomagolás módosítása",
    pl: "Zmień opakowanie",
    pt: "Mudar embalagem",
  },
  packagingConfirmTitle: {
    de: "Anderes Gebinde?",
    en: "Different packaging?",
    hu: "Más csomagolás?",
    pl: "Inne opakowanie?",
    pt: "Embalagem diferente?",
  },
  packagingConfirmMsg: {
    de: "Diese Palette wird mit {gebinde} gespeichert, nicht mit {standard}. Ist das richtig?",
    en: "This pallet will be saved with {gebinde}, not {standard}. Is that correct?",
    hu: "Ez a paletta {gebinde} csomagolással lesz mentve, nem {standard}. Így helyes?",
    pl: "Ta paleta zostanie zapisana z {gebinde}, nie {standard}. Czy to poprawne?",
    pt: "Esta palete será guardada com {gebinde}, não {standard}. Está correto?",
  },
  packagingConfirmYes: {
    de: "Ja, {gebinde}",
    en: "Yes, {gebinde}",
    hu: "Igen, {gebinde}",
    pl: "Tak, {gebinde}",
    pt: "Sim, {gebinde}",
  },
  packagingBackToStandard: {
    de: "Zurück auf {standard}",
    en: "Back to {standard}",
    hu: "Vissza: {standard}",
    pl: "Powrót do {standard}",
    pt: "Voltar a {standard}",
  },

  // --- Anlieferung noch aktuell? ---
  stillRunningTitle: {
    de: "Läuft die Anlieferung noch?",
    en: "Is this delivery still running?",
    hu: "Folyamatban van még a beszállítás?",
    pl: "Czy ta dostawa jeszcze trwa?",
    pt: "Esta entrega ainda está a decorrer?",
  },
  stillRunningMsg: {
    de: "Letzte Eingabe: {zeit}. Weiter mit dieser Anlieferung?",
    en: "Last entry: {zeit}. Continue with this delivery?",
    hu: "Utolsó bejegyzés: {zeit}. Folytatod ezt a beszállítást?",
    pl: "Ostatni wpis: {zeit}. Kontynuować tę dostawę?",
    pt: "Último registo: {zeit}. Continuar esta entrega?",
  },
  continueDelivery: {
    de: "Ja, weiter",
    en: "Yes, continue",
    hu: "Igen, folytatom",
    pl: "Tak, kontynuuj",
    pt: "Sim, continuar",
  },
  newDeliveryShort: {
    de: "Neue Anlieferung",
    en: "New delivery",
    hu: "Új beszállítás",
    pl: "Nowa dostawa",
    pt: "Nova entrega",
  },

  // --- Datumswechsel ---
  dateChangedTitle: {
    de: "Datum prüfen",
    en: "Check the date",
    hu: "Ellenőrizd a dátumot",
    pl: "Sprawdź datę",
    pt: "Verificar a data",
  },
  dateChangedMsg: {
    de: "Die Anlieferung läuft noch mit dem Datum {alt}. Heute ist {neu}.",
    en: "The delivery still uses the date {alt}. Today is {neu}.",
    hu: "A beszállítás dátuma még {alt}. Ma {neu} van.",
    pl: "Dostawa ma jeszcze datę {alt}. Dziś jest {neu}.",
    pt: "A entrega ainda tem a data {alt}. Hoje é {neu}.",
  },
  useToday: {
    de: "Auf heute setzen",
    en: "Set to today",
    hu: "Mai dátum",
    pl: "Ustaw na dziś",
    pt: "Definir para hoje",
  },
  keepDate: {
    de: "Datum behalten",
    en: "Keep the date",
    hu: "Dátum megtartása",
    pl: "Zachowaj datę",
    pt: "Manter a data",
  },
} as const;

export type TextKey = keyof typeof TEXTS;

export function t(lang: Lang, key: TextKey, params?: Record<string, string | number>): string {
  const entry = TEXTS[key] as Record<Lang, string>;
  let text = entry[lang] ?? entry[DEFAULT_LANG];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/**
 * Anzeigenamen der Gebindearten.
 *
 * Nur was auf dem Bildschirm steht, wird übersetzt - ins Sheet geht immer der Name aus
 * GEBINDEARTEN. Stünde je nach Handysprache eine andere Bezeichnung in Spalte G, fände
 * die Zuordnung des Leergewichts sie nicht mehr und würde auf die Standardkiste
 * zurückfallen: 43,5 kg zu viel Netto auf jeder Palox-Zeile.
 *
 * "G2" und die IFCO-Nummern sind Typenbezeichnungen und in jeder Sprache gleich - sie
 * stehen deshalb gar nicht in dieser Tabelle und bleiben unverändert.
 */
const GEBINDE_NAMEN: Record<string, Record<Lang, string>> = {
  "Holz Palox": {
    de: "Holz Palox",
    en: "Wood palox",
    hu: "Fa palox",
    pl: "Palox drewniany",
    pt: "Palox de madeira",
  },
};

/** Gebindeart so, wie sie auf dem Bildschirm stehen soll. */
export function gebindeLabel(lang: Lang, name: string): string {
  return GEBINDE_NAMEN[name]?.[lang] ?? name;
}

export function localeOf(lang: Lang): string {
  return LANGUAGES.find((l) => l.code === lang)?.locale ?? "de-CH";
}

/** Zahl in der Schreibweise der gewählten Sprache (Komma bzw. Punkt als Dezimaltrennzeichen). */
export function formatNumber(lang: Lang, value: number, digits = 2): string {
  return new Intl.NumberFormat(localeOf(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Menge ohne erzwungene Nachkommastellen: 393 bleibt 393, 393,5 bleibt 393,5.
 * Wichtig beim Gewicht - eine feste Rundung auf 0 Stellen würde eine eingegebene
 * halbe Kilo-Angabe in der Übersicht verschwinden lassen.
 */
export function formatMenge(lang: Lang, value: number): string {
  return new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 2 }).format(value);
}

/** Uhrzeit in der gewählten Sprache, z.B. 14:32. */
export function formatTime(lang: Lang, timestamp: number): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/** Datum lesbar in der gewählten Sprache, z.B. 17.08.2026 bzw. 17/08/2026. */
export function formatDate(lang: Lang, iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}
