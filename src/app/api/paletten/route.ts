import { NextResponse } from "next/server";
import { netGewichtProPalette, statistikSchluessel } from "@/lib/constants";
import { appendPalette, schreibeReferenzwertFort } from "@/lib/googleSheets";
import type { PaletteEntry } from "@/lib/types";
import { pruefePalette } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pruefung = pruefePalette(body);
    if (!pruefung.ok) {
      return NextResponse.json({ error: pruefung.fehler }, { status: 400 });
    }

    const entry = body as PaletteEntry & { istWiederholung?: boolean };
    const result = await appendPalette(entry, entry.istWiederholung === true);

    // Referenzwerte nur bei einer wirklich neu geschriebenen Zeile fortschreiben - bei
    // einem Wiederholversuch, der die Palette schon im Sheet findet, wäre es doppelt.
    if (!result.schonVorhanden) {
      await schreibeReferenzwertFort(
        // Grossgebinde bekommen eine eigene Zeile im Referenzwerte-Blatt. Sonst würde
        // ein Palox mit 300 kg auf ein Gebinde den Schnitt pro Kiste der Sorte anheben -
        // und damit den Erwartungsbereich der nächsten Saison verschieben.
        statistikSchluessel(entry.sorte, entry.gebindeart),
        entry.anzahlKisten,
        netGewichtProPalette(entry.gewichtBrutto, entry.anzahlKisten, entry.gebindeart)
      ).catch((err) => {
        // Die Palette steht im Journal - das ist das Wichtige. Ein Fehler beim
        // Fortschreiben der Statistik darf die Erfassung nicht scheitern lassen.
        console.error("Referenzwert konnte nicht fortgeschrieben werden", err);
      });
    }

    return NextResponse.json({ sheetRow: result.sheetRow });
  } catch (err) {
    console.error("POST /api/paletten failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
