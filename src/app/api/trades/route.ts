import { NextResponse } from "next/server";
import { fetchTradeHistory, fetchBalance } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "7d";
  const symbol = url.searchParams.get("symbol") || "";

  const [trades, balance] = await Promise.all([
    fetchTradeHistory(),
    fetchBalance(),
  ]);

  const cutoff = range === "all" ? 0 : Date.now() / 1000 - parseRange(range);
  const filtered = trades.filter((t) => {
    if (t.closed_at < cutoff) return false;
    if (symbol && t.symbol !== symbol) return false;
    return true;
  });

  filtered.sort((a, b) => b.closed_at - a.closed_at);

  const wins = filtered.filter((t) => t.pnl > 0);
  const losses = filtered.filter((t) => t.pnl <= 0);
  const totalPnl = filtered.reduce((s, t) => s + t.pnl, 0);
  const totalPnlPct =
    balance && balance.total > 0 ? (totalPnl / balance.total) * 100 : 0;
  const winRate = filtered.length > 0 ? (wins.length / filtered.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;

  const sortedByPnl = [...filtered].sort((a, b) => b.pnl - a.pnl);

  // Equity curve: cumulative PnL over time
  const sortedByTime = [...filtered].sort((a, b) => a.closed_at - b.closed_at);
  let cum = 0;
  const equityCurve = sortedByTime.map((t) => {
    cum += t.pnl;
    return { t: t.closed_at, v: cum, pnl: t.pnl };
  });

  return NextResponse.json({
    range,
    symbol,
    count: filtered.length,
    wins: wins.length,
    losses: losses.length,
    win_rate: winRate,
    total_pnl: totalPnl,
    total_pnl_pct: totalPnlPct,
    avg_win: avgWin,
    avg_loss: avgLoss,
    best_trade: sortedByPnl[0]?.pnl ?? null,
    worst_trade: sortedByPnl[sortedByPnl.length - 1]?.pnl ?? null,
    equity_curve: equityCurve,
    trades: filtered.slice(0, 50),
    balance,
  });
}

function parseRange(range: string): number {
  const map: Record<string, number> = {
    "1h": 3600,
    "4h": 14400,
    "24h": 86400,
    "7d": 604800,
    "30d": 2592000,
    "90d": 7776000,
  };
  return map[range] || 604800;
}