import { NextResponse } from "next/server";
import { appendPalette } from "@/lib/googleSheets";
import type { PaletteEntry } from "@/lib/types";
import { pruefePalette } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pruefung = pruefePalette(body);
    if (!pruefung.ok) {
      return NextResponse.json({ error: pruefung.fehler }, { status: 400 });
    }

    const result = await appendPalette(body as PaletteEntry);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/paletten failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
