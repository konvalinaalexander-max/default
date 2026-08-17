import { NextResponse } from "next/server";
import { deletePaletteRow, updatePalette } from "@/lib/googleSheets";
import type { PaletteEntry } from "@/lib/types";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/paletten/[row]">
) {
  try {
    const { row } = await ctx.params;
    const sheetRow = Number(row);
    if (!Number.isInteger(sheetRow) || sheetRow < 2) {
      return NextResponse.json({ error: "Ungültige Zeilennummer" }, { status: 400 });
    }

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

    await updatePalette(sheetRow, body as PaletteEntry);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/paletten/[row] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/paletten/[row]">
) {
  try {
    const { row } = await ctx.params;
    const sheetRow = Number(row);
    if (!Number.isInteger(sheetRow) || sheetRow < 2) {
      return NextResponse.json({ error: "Ungültige Zeilennummer" }, { status: 400 });
    }
    await deletePaletteRow(sheetRow);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/paletten/[row] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
