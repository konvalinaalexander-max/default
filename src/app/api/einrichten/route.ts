import { NextResponse } from "next/server";
import { ADMIN_PASSWORT } from "@/lib/constants";
import { richteSheetEin } from "@/lib/sheetSetup";

/**
 * Einmalige Einrichtung des Dokuments: Blätter anlegen und benennen, Kopfzeilen setzen
 * und schützen, Anbauplanung füllen, Ertragsformeln und Referenzwerte anlegen.
 *
 * Kann gefahrlos mehrfach laufen - jeder Schritt prüft vorher, ob er nötig ist, und
 * Datenzeilen werden nie gelöscht.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (String(body?.passwort ?? "") !== ADMIN_PASSWORT) {
      return NextResponse.json({ error: "Passwort stimmt nicht." }, { status: 403 });
    }

    const bericht = await richteSheetEin();
    return NextResponse.json(bericht);
  } catch (err) {
    console.error("POST /api/einrichten failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
