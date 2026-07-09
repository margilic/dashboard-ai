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

  const startEquity = st.balance?.initial_balance ?? 100000;
  const unrealized = st.balance?.unrealized_pnl ?? 0;

  // Equity curve = starting equity + running realized PnL.
  // Seed with a point at the start so the line begins at initial balance.
  // lightweight-charts needs strictly-increasing unique timestamps, so we
  // bump colliding closed_at values (trades closed in the same cycle).
  const equity_curve: { t: number; v: number; pnl: number }[] = [];
  let cum = 0;
  let lastT = 0;
  const pushPt = (t: number, v: number, pnl: number) => {
    let tt = Math.floor(t);
    if (tt <= lastT) tt = lastT + 1;
    lastT = tt;
    equity_curve.push({ t: tt, v: Math.round(v * 100) / 100, pnl });
  };
  const firstT = filtered.length ? Number(filtered[0].opened_at || filtered[0].closed_at) : Math.floor(Date.now() / 1000);
  pushPt(firstT - 1, startEquity, 0);
  for (const t of filtered) {
    cum += t.pnl;
    pushPt(Number(t.closed_at), startEquity + cum, t.pnl);
  }
  // Live tail: current equity incl. unrealized
  pushPt(Math.floor(Date.now() / 1000), startEquity + cum + unrealized, 0);

  const wins = filtered.filter((t) => t.pnl > 0).length;
  const losses = filtered.filter((t) => t.pnl <= 0).length;
  const total_pnl = cum;
  const win_rate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0;

  return NextResponse.json({
    range,
    equity_curve,
    total_pnl,
    wins,
    losses,
    win_rate,
    count: filtered.length,
    start_equity: startEquity,
    current_equity: startEquity + cum + unrealized,
  });
}
