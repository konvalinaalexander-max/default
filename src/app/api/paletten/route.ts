import { NextResponse } from "next/server";
import { appendPalette } from "@/lib/googleSheets";
import type { PaletteEntry } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<PaletteEntry>;

    if (
      !body.datum ||
      !body.person ||
      !body.feld ||
      !body.sorte ||
      typeof body.gewichtBrutto !== "number" ||
      typeof body.anzahlKisten !== "number"
    ) {
      return NextResponse.json({ error: "Unvollständige Palette" }, { status: 400 });
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
