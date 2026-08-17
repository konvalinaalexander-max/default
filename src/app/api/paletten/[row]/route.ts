import { NextResponse } from "next/server";
import { deletePaletteRow, updatePalette } from "@/lib/googleSheets";
import type { PaletteEntry } from "@/lib/types";
import { pruefePalette, pruefeZeilennummer } from "@/lib/validation";

function fehlerAntwort(err: unknown) {
  console.error("api/paletten/[row] failed", err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
    { status: 500 }
  );
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/paletten/[row]">) {
  try {
    const { row } = await ctx.params;
    const zeilePruefung = pruefeZeilennummer(row);
    if (!zeilePruefung.ok) {
      return NextResponse.json({ error: zeilePruefung.fehler }, { status: 400 });
    }

    const body = await request.json();
    const pruefung = pruefePalette(body);
    if (!pruefung.ok) {
      return NextResponse.json({ error: pruefung.fehler }, { status: 400 });
    }

    await updatePalette(Number(row), body as PaletteEntry);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fehlerAntwort(err);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/paletten/[row]">) {
  try {
    const { row } = await ctx.params;
    const zeilePruefung = pruefeZeilennummer(row);
    if (!zeilePruefung.ok) {
      return NextResponse.json({ error: zeilePruefung.fehler }, { status: 400 });
    }

    // Auch beim Löschen wird der erwartete Inhalt mitgeschickt: nur wenn die Zeile
    // wirklich zu dieser Palette gehört, wird sie entfernt.
    const body = await request.json();
    const pruefung = pruefePalette(body);
    if (!pruefung.ok) {
      return NextResponse.json({ error: pruefung.fehler }, { status: 400 });
    }

    await deletePaletteRow(Number(row), body as PaletteEntry);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fehlerAntwort(err);
  }
}
