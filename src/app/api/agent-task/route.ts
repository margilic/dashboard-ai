import { NextResponse } from "next/server";
import { fetchTradeHistory } from "@/lib/data";
import { runAgentWithDeepseek } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 150;

export async function POST(req: Request) {
  let body: { range?: string; focus?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const range = body.range || "30d";
  const focus = body.focus || "patterns";

  try {
    const trades = await fetchTradeHistory();
    const cutoff = Date.now() / 1000 - parseRangeSec(range);
    const filtered = trades.filter((t) => t.closed_at >= cutoff);

    // Hour-of-day distribution
    const byHour = new Array(24).fill(0).map(() => ({ wins: 0, losses: 0, pnl: 0 }));
    const bySymbol = new Map<string, { trades: number; pnl: number; wins: number }>();
    let totalPnl = 0;
    let losses = 0;
    let stopOutStreak = 0;
    let maxStopStreak = 0;

    for (const t of filtered) {
      const h = new Date(t.closed_at * 1000).getUTCHours();
      if (t.pnl > 0) byHour[h].wins += 1;
      else byHour[h].losses += 1;
      byHour[h].pnl += t.pnl;

      const sym = t.symbol || "UNKNOWN";
      const s = bySymbol.get(sym) || { trades: 0, pnl: 0, wins: 0 };
      s.trades += 1;
      s.pnl += t.pnl;
      if (t.pnl > 0) s.wins += 1;
      bySymbol.set(sym, s);

      totalPnl += t.pnl;
      if (t.pnl < 0) {
        losses += 1;
        stopOutStreak += 1;
        maxStopStreak = Math.max(maxStopStreak, stopOutStreak);
      } else {
        stopOutStreak = 0;
      }
    }

    const ctx = {
      focus,
      range,
      total_trades: filtered.length,
      total_pnl: round2(totalPnl),
      losing_trades: losses,
      max_consecutive_losses: maxStopStreak,
      hour_distribution: byHour.map((h, i) => ({
        hour_utc: i,
        trades: h.wins + h.losses,
        wins: h.wins,
        losses: h.losses,
        pnl: round2(h.pnl),
      })),
      symbol_breakdown: Array.from(bySymbol.entries()).map(([sym, s]) => ({
        symbol: sym,
        trades: s.trades,
        pnl: round2(s.pnl),
        win_rate: s.trades > 0 ? round2((s.wins / s.trades) * 100) : 0,
      })),
      last_10_trades: filtered.slice(0, 10).map((t) => ({
        symbol: t.symbol,
        side: t.side,
        pnl: round2(t.pnl),
        hour_utc: new Date(t.closed_at * 1000).getUTCHours(),
        duration_min: Math.round(t.duration_s / 60),
      })),
    };

    const report = await runAgentWithDeepseek(ctx);

    return NextResponse.json({
      ok: true,
      report,
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
  return map[range] || 2592000;
}