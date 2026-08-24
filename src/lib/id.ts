export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * Uhrzeit der Erfassung als "HH:MM" in der Zeitzone des Geräts.
 *
 * Bewusst als Text und nicht als Zeitwert: So kann Google Sheets die Zelle nicht je nach
 * Region als Zahl oder Datum umdeuten, und die Spalte bleibt in jedem Dokument lesbar.
 */
export function nowHhMm(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
