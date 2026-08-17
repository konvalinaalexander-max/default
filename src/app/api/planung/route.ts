import { NextResponse } from "next/server";
import { ADMIN_PASSWORT } from "@/lib/constants";
import { appendPlanungszeile } from "@/lib/googleSheets";
import { ergaenzeErtragsformeln } from "@/lib/sheetSetup";

/**
 * Legt ein Schlag-Sorte-Paar in der Anbauplanung an.
 *
 * Das Passwort wird hier ein zweites Mal geprüft. In der App muss die Prüfung im Browser
 * stattfinden, damit ein neuer Schlag auch ohne Netz angelegt werden kann - deshalb ist
 * sie dort umgehbar. Diese Prüfung verhindert, dass jemand die Schnittstelle direkt
 * anspricht und die Planung ohne Passwort erweitert.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const schlag = String(body?.schlag ?? "").trim();
    const sorte = String(body?.sorte ?? "").trim();
    const passwort = String(body?.passwort ?? "");

    if (passwort !== ADMIN_PASSWORT) {
      return NextResponse.json({ error: "Passwort stimmt nicht." }, { status: 403 });
    }
    if (!schlag || !sorte) {
      return NextResponse.json({ error: "Schlag und Sorte sind nötig." }, { status: 400 });
    }

    await appendPlanungszeile(schlag, sorte);
    // Die neue Zeile braucht ihre Ertragsformel, sonst bliebe die Spalte dort leer.
    await ergaenzeErtragsformeln();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/planung failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
