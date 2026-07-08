"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Balance {
  total: number;
  available: number;
  margin_used: number;
  unrealized_pnl: number;
  currency: string;
}

interface Props {
  range: string;
  symbol: string;
}

interface Ticker {
  price: number;
  change_pct: number;
}

export function KPICards({ range, symbol }: Props) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [pnl, setPnl] = useState<{
    total_pnl: number;
    win_rate: number;
    wins: number;
    losses: number;
    best_trade: number | null;
    worst_trade: number | null;
  } | null>(null);
  const [positionsCount, setPositionsCount] = useState(0);
  const [unrealized, setUnrealized] = useState(0);
  const [ticker, setTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tRes, pRes, bRes, kRes] = await Promise.all([
          fetch(`/api/trades?range=${range}&symbol=${symbol}`),
          fetch("/api/positions"),
          fetch("/api/positions").then(() => null).catch(() => null), // balance comes via trades response
          fetch(`/api/klines?symbol=${symbol}&interval=1m&limit=2`),
        ]);
        const [tData, pData, kData] = await Promise.all([
          tRes.json(),
          pRes.json(),
          kRes.json(),
        ]);
        if (cancelled) return;
        if (!cancelled) {
          setPnl({
            total_pnl: tData.total_pnl || 0,
            win_rate: tData.win_rate || 0,
            wins: tData.wins || 0,
            losses: tData.losses || 0,
            best_trade: tData.best_trade,
            worst_trade: tData.worst_trade,
          });
          setBalance(tData.balance);
          setPositionsCount(pData.count || 0);
          setUnrealized(
            (pData.positions || []).reduce(
              (s: number, p: { pnl: number }) => s + p.pnl,
              0
            )
          );
          setTicker(kData.ticker);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [range, symbol]);

  const totalPnl = (pnl?.total_pnl || 0) + unrealized;
  const pnlPct =
    balance && balance.total > 0 ? (totalPnl / balance.total) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <KPI
        label={`${symbol} Fiyat`}
        value={ticker?.price.toFixed(2) ?? "—"}
        sub={
          ticker
            ? `${ticker.change_pct >= 0 ? "+" : ""}${ticker.change_pct.toFixed(2)}% 24h`
            : "—"
        }
        subColor={ticker ? (ticker.change_pct >= 0 ? "green" : "red") : "muted"}
      />
      <KPI
        label="Bakiye"
        value={balance ? balance.total.toFixed(2) : "—"}
        sub={balance ? `${balance.currency} • ${balance.available.toFixed(2)} free` : "—"}
      />
      <KPI
        label="Net PnL"
        value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}`}
        sub={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% • unrealized ${unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)}`}
        color={totalPnl >= 0 ? "green" : "red"}
      />
      <KPI
        label="Win Rate"
        value={pnl ? `${pnl.win_rate.toFixed(0)}%` : "—"}
        sub={pnl ? `${pnl.wins}W / ${pnl.losses}L` : "—"}
      />
      <KPI
        label="Açık Pozisyon"
        value={String(positionsCount)}
        sub={positionsCount === 0 ? "—" : "canlı"}
      />
      <KPI
        label="En İyi / En Kötü"
        value={
          pnl && pnl.best_trade !== null
            ? `+${pnl.best_trade!.toFixed(2)} / ${pnl.worst_trade!.toFixed(2)}`
            : "—"
        }
        sub="range içi"
      />
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  color,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "red";
  subColor?: "green" | "red" | "muted";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-[10px] text-text-muted uppercase tracking-wide">
        {label}
      </div>
      <div
        className={cn(
          "text-lg font-bold tabular-nums mt-1",
          color === "green" && "text-green",
          color === "red" && "text-red",
          !color && "text-text"
        )}
      >
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "text-[10px] mt-0.5 tabular-nums",
            subColor === "green" && "text-green",
            subColor === "red" && "text-red",
            (!subColor || subColor === "muted") && "text-text-muted"
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}