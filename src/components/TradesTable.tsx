"use client";

import { useEffect, useState } from "react";
import { cn, safeInt, safeNum, safeNumSigned } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";

interface Trade {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  entry: number;
  exit: number;
  pnl: number;
  pnl_pct: number;
  closed_at: number;
  duration_s: number;
}

interface Props {
  range: string;
  symbol: string;
}

export function TradesTable({ range, symbol }: Props) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<{
    total_pnl: number;
    wins: number;
    losses: number;
    win_rate: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/trades?range=${range}&symbol=${symbol}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setTrades(data.trades || []);
          setTotals({
            total_pnl: data.total_pnl,
            wins: data.wins,
            losses: data.losses,
            win_rate: data.win_rate,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [range, symbol]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm">Son Trade&apos;ler</span>
        {totals && (
          <div className="flex gap-4 text-xs">
            <span className="text-text-muted">
              {totals.wins}W / {totals.losses}L
            </span>
            <span className="text-text-muted">
              {safeNum(totals.win_rate, 0)}%
            </span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                totals.total_pnl >= 0 ? "text-green" : "text-red"
              )}
            >
              {safeNumSigned(totals.total_pnl)} USDT
            </span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="text-text-muted text-xs border-b border-border-soft">
              <th className="text-left px-4 py-2 font-medium">Time</th>
              <th className="text-left px-4 py-2 font-medium">Symbol</th>
              <th className="text-left px-4 py-2 font-medium">Side</th>
              <th className="text-right px-4 py-2 font-medium">Entry</th>
              <th className="text-right px-4 py-2 font-medium">Exit</th>
              <th className="text-right px-4 py-2 font-medium">Dur</th>
              <th className="text-right px-4 py-2 font-medium">PnL</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-text-muted">
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading && trades.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-text-muted">
                  Bu aralıkta trade yok
                </td>
              </tr>
            )}
            {trades.map((t) => {
              const positive = t.pnl >= 0;
              return (
                <tr
                  key={t.id}
                  className="border-b border-border-soft last:border-0 hover:bg-card-hover transition-colors"
                >
                  <td className="px-4 py-2 text-text-muted text-xs">
                    {timeAgo(t.closed_at)}
                  </td>
                  <td className="px-4 py-2 font-medium">{t.symbol}</td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-semibold",
                        t.side === "LONG" || t.side === "BUY"
                          ? "bg-green/10 text-green"
                          : "bg-red/10 text-red"
                      )}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-soft">
                    {safeNum(t.entry)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-soft">
                    {safeNum(t.exit)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-muted text-xs">
                    {fmtDuration(t.duration_s)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right tabular-nums font-semibold",
                      positive ? "text-green" : "text-red"
                    )}
                  >
                    {safeNumSigned(t.pnl)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtDuration(s: number): string {
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}