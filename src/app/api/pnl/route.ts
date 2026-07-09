import { NextResponse } from "next/server";
import { fetchEngineState } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseRange(range: string): number {
  const map: Record<string, number> = {
    "1h": 3600, "4h": 14400, "24h": 86400,
    "7d": 604800, "30d": 2592000, "90d": 7776000,
  };
  return map[range] || 604800;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "7d";

  const st = await fetchEngineState();
  const cutoff = range === "all" ? 0 : Date.now() / 1000 - parseRange(range);
  const filtered = (st.recent_trades || [])
    .filter((t) => Number(t.closed_at) >= cutoff)
    .sort((a, b) => a.closed_at - b.closed_at);

  let cum = 0;
  const equity_curve = filtered.map((t) => {
    cum += t.pnl;
    return { t: Number(t.closed_at), v: cum, pnl: t.pnl };
  });

  const wins = filtered.filter((t) => t.pnl > 0).length;
  const losses = filtered.filter((t) => t.pnl <= 0).length;
  const total_pnl = filtered.reduce((s, t) => s + t.pnl, 0);
  const win_rate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0;

  return NextResponse.json({
    range,
    equity_curve,
    total_pnl,
    wins,
    losses,
    win_rate,
    count: filtered.length,
  });
}
