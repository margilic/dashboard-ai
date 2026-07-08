"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Position {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  entry: number;
  current: number;
  pnl: number;
  pnl_pct: number;
  opened_at: number;
}

export function PositionsTable() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/positions");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPositions(data.positions || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Açık Pozisyonlar</span>
          {positions.length > 0 && (
            <span className="pulse-dot" title="canlı" />
          )}
        </div>
        <span className="text-xs text-text-muted">
          {positions.length} aktif
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs border-b border-border-soft">
              <th className="text-left px-4 py-2 font-medium">Symbol</th>
              <th className="text-left px-4 py-2 font-medium">Side</th>
              <th className="text-right px-4 py-2 font-medium">Qty</th>
              <th className="text-right px-4 py-2 font-medium">Entry</th>
              <th className="text-right px-4 py-2 font-medium">Current</th>
              <th className="text-right px-4 py-2 font-medium">PnL</th>
              <th className="text-right px-4 py-2 font-medium">PnL %</th>
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
            {!loading && positions.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-text-muted">
                  Açık pozisyon yok
                </td>
              </tr>
            )}
            {positions.map((p) => {
              const positive = p.pnl >= 0;
              return (
                <tr
                  key={p.id}
                  className="border-b border-border-soft last:border-0 hover:bg-card-hover transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{p.symbol}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-semibold",
                        p.side === "LONG" || p.side === "BUY"
                          ? "bg-green/10 text-green"
                          : "bg-red/10 text-red"
                      )}
                    >
                      {p.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.qty.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.entry.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.current.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums font-semibold",
                      positive ? "text-green" : "text-red"
                    )}
                  >
                    {positive ? "+" : ""}
                    {p.pnl.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums",
                      positive ? "text-green" : "text-red"
                    )}
                  >
                    {positive ? "+" : ""}
                    {p.pnl_pct.toFixed(2)}%
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