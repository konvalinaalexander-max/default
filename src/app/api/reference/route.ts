import { NextResponse } from "next/server";
import { getReferenceData } from "@/lib/googleSheets";
import { ergaenzeErtragsformeln } from "@/lib/sheetSetup";

export async function GET() {
  try {
    const data = await getReferenceData();

    // Knopffreier Saisonstart: Wurde die Anbauplanung neu eingegeben, fehlen die
    // Ertragsformeln in Spalte C. Die App ergänzt sie hier von selbst - ohne dass jemand
    // "Sheet einrichten" drücken muss. Nur wenn wirklich etwas fehlt, und best-effort:
    // ein Fehler dabei darf das Laden der Auswahl nicht verhindern.
    if (data.formelnFehlen) {
      await ergaenzeErtragsformeln().catch((err) =>
        console.error("Ertragsformeln konnten nicht ergänzt werden", err)
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/reference failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
