import { NextResponse } from "next/server";
import {
  fetchTradeHistory,
  fetchBalance,
  fetchPositions,
  fetchTicker,
} from "@/lib/data";
import { analyzeWithMinimax, type PnlContext } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request) {
  let body: { symbol?: string; range?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const symbol = (body.symbol || "BTCUSDT").toUpperCase();
  const range = body.range || "7d";

  try {
    const [trades, balance, positions, ticker] = await Promise.all([
      fetchTradeHistory(),
      fetchBalance(),
      fetchPositions(),
      fetchTicker(symbol),
    ]);

    const cutoff = Date.now() / 1000 - parseRangeSec(range);
    const filtered = trades.filter(
      (t) => t.closed_at >= cutoff && (symbol === "ALL" || t.symbol === symbol)
    );

    const wins = filtered.filter((t) => t.pnl > 0);
    const losses = filtered.filter((t) => t.pnl <= 0);
    const totalPnl = filtered.reduce((s, t) => s + t.pnl, 0);
    const totalPnlPct =
      balance && balance.total > 0 ? (totalPnl / balance.total) * 100 : 0;
    const winRate = filtered.length > 0 ? (wins.length / filtered.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
    const sortedByPnl = [...filtered].sort((a, b) => b.pnl - a.pnl);

    const ctx: PnlContext = {
      symbol,
      range,
      total_pnl: round2(totalPnl),
      total_pnl_pct: round2(totalPnlPct),
      win_rate: round2(winRate),
      wins: wins.length,
      losses: losses.length,
      total_trades: filtered.length,
      avg_win: round2(avgWin),
      avg_loss: round2(avgLoss),
      best_trade: sortedByPnl[0] ? round2(sortedByPnl[0].pnl) : null,
      worst_trade: sortedByPnl[sortedByPnl.length - 1]
        ? round2(sortedByPnl[sortedByPnl.length - 1].pnl)
        : null,
      open_positions: positions.filter((p) => p.symbol === symbol).length,
      unrealized_pnl: round2(
        positions.filter((p) => p.symbol === symbol).reduce((s, p) => s + p.pnl, 0)
      ),
      balance: balance ? round2(balance.total) : 0,
      recent_trades: filtered.slice(0, 10).map((t) => ({
        symbol: t.symbol,
        side: t.side,
        pnl: round2(t.pnl),
        pnl_pct: round2(t.pnl_pct),
        closed_at: t.closed_at,
        duration_min: Math.round(t.duration_s / 60),
      })),
      current_price: ticker?.price ?? 0,
      price_change_pct: ticker?.change_pct ?? 0,
    };

    const analysis = await analyzeWithMinimax(ctx);

    return NextResponse.json({
      ok: true,
      analysis,
      context: ctx,
      ts: Date.now(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseRangeSec(range: string): number {
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