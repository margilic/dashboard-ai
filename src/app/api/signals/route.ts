import { NextRequest, NextResponse } from "next/server";
import { scanSignals } from "@/lib/signals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "ADAUSDT", "ARBUSDT",
];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const interval = sp.get("interval") || "15m";
  const symbols = (sp.get("symbols")?.split(",").filter(Boolean)) || DEFAULT_SYMBOLS;
  try {
    const signals = await scanSignals(symbols, interval);
    return NextResponse.json({
      ok: true,
      interval,
      scanned: symbols,
      count: signals.length,
      signals,
      ts: Date.now(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, signals: [], error: e instanceof Error ? e.message : String(e) },
      { status: 200 }
    );
  }
}
