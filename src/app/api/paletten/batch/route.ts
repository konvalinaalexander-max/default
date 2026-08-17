import { NextResponse } from "next/server";
import { batchUpdateSessionFields } from "@/lib/googleSheets";

interface BatchUpdateRequest {
  updates: { sheetRow: number; datum: string; person: string; feld: string; sorte: string }[];
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<BatchUpdateRequest>;
    if (!Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json({ error: "Keine Updates übergeben" }, { status: 400 });
    }
    for (const u of body.updates) {
      if (
        !Number.isInteger(u.sheetRow) ||
        u.sheetRow < 2 ||
        !u.datum ||
        !u.person ||
        !u.feld ||
        !u.sorte
      ) {
        return NextResponse.json({ error: "Ungültiges Update in Liste" }, { status: 400 });
      }
    }

    await batchUpdateSessionFields(body.updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/paletten/batch failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
