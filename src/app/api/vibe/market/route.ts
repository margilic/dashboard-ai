import { NextRequest, NextResponse } from "next/server";
import { fetchVibeMarket } from "@/lib/vibe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code") || "BTC-USDT";
  const interval = sp.get("interval") || "1D";
  const days = Number(sp.get("days") || "90");
  const source = sp.get("source") || "auto";
  try {
    const rows = await fetchVibeMarket(code, interval, days, source);
    return NextResponse.json({ ok: true, code, count: rows.length, rows });
  } catch (e) {
    return NextResponse.json(
      { ok: false, code, rows: [], error: e instanceof Error ? e.message : String(e) },
      { status: 200 }
    );
  }
}
