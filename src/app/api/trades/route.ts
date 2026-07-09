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
  const symbol = url.searchParams.get("symbol") || "";

  const st = await fetchEngineState();
  const balance = st.balance
    ? { total: st.balance.equity, available: st.balance.USD.free, unrealized_pnl: st.balance.unrealized_pnl, currency: "USD" }
    : null;

  const cutoff = range === "all" ? 0 : Date.now() / 1000 - parseRange(range);
  const filtered = (st.recent_trades || []).filter((t) => {
    if (Number(t.closed_at) < cutoff) return false;
    if (symbol && t.symbol !== symbol) return false;
    return true;
  });
  filtered.sort((a, b) => b.closed_at - a.closed_at);

  const wins = filtered.filter((t) => t.pnl > 0);
  const losses = filtered.filter((t) => t.pnl <= 0);
  const totalPnl = filtered.reduce((s, t) => s + t.pnl, 0);
  const totalPnlPct = balance && balance.total > 0 ? (totalPnl / balance.total) * 100 : 0;
  const winRate = filtered.length > 0 ? (wins.length / filtered.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const sortedByPnl = [...filtered].sort((a, b) => b.pnl - a.pnl);
  // Equity curve — with initial balance baseline, unique timestamps
  let equityCurve: { t: number; v: number }[] = [];
  const startEquity = st.balance?.initial_balance ?? 100000;
  const unrealized = st.balance?.unrealized_pnl ?? 0;
  const sortedByTime = [...filtered].sort((a, b) => a.closed_at - b.closed_at);
  let cum = 0;
  let lastT = 0;
  const pushPt = (t: number, v: number) => {
    let tt = Math.floor(t);
    if (tt <= lastT) tt = lastT + 1;
    lastT = tt;
    equityCurve.push({ t: tt, v: Math.round(v * 100) / 100 });
  };
  equityCurve.push({ t: 0, v: 0 }); // lightweight-charts placeholder
  if (sortedByTime.length) pushPt(sortedByTime[0].opened_at || sortedByTime[0].closed_at, startEquity);
  for (const t of sortedByTime) {
    cum += t.pnl;
    pushPt(Number(t.closed_at), startEquity + cum);
  }
  pushPt(Math.floor(Date.now() / 1000), startEquity + cum + unrealized);
  // remove placeholder
  equityCurve = equityCurve.filter((p) => p.t > 0);

  // normalize trade rows to the shape TradesTable expects
  const trades = filtered.slice(0, 50).map((t) => ({
    id: t.id,
    symbol: t.symbol,
    side: (t.side || "LONG").toUpperCase(),
    qty: 0,
    entry: Number(t.entry || 0),
    exit: Number(t.exit || 0),
    pnl: Number(t.pnl || 0),
    pnl_pct: Number(t.pnl_pct || 0),
    opened_at: Number(t.opened_at || 0),
    closed_at: Number(t.closed_at || 0),
    duration_s: Number(t.duration_s || 0),
    strategy: t.strategy,
  }));

  return NextResponse.json({
    range, symbol, count: filtered.length,
    wins: wins.length, losses: losses.length, win_rate: winRate,
    total_pnl: totalPnl, total_pnl_pct: totalPnlPct,
    avg_win: avgWin, avg_loss: avgLoss,
    best_trade: sortedByPnl[0]?.pnl ?? null,
    worst_trade: sortedByPnl[sortedByPnl.length - 1]?.pnl ?? null,
    equity_curve: equityCurve,
    trades,
    balance,
  });
}
