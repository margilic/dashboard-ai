import { NextResponse } from "next/server";
import { fetchEngineState } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const st = await fetchEngineState();
  const positions = (st.open_positions || []).map((p) => ({
    id: p.id,
    symbol: p.symbol,
    side: p.side,
    strategy: p.strategy,
    qty: Number(p.qty || 0),
    entry: Number(p.entry || 0),
    current: Number(p.current || 0),
    pnl: Number(p.unrealized || 0),
    pnl_pct: Number(p.pnl_pct || 0),
    opened_at: Number(p.opened_at || 0),
    sl: p.sl ?? null,
    tp: p.tp ?? null,
  }));
  return NextResponse.json({ positions, count: positions.length, ts: Date.now() });
}
