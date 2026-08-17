import { NextResponse } from "next/server";
import { getReferenceData } from "@/lib/googleSheets";

export async function GET() {
  try {
    const data = await getReferenceData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/reference failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
