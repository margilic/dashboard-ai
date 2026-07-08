"use client";

import { useEffect, useState } from "react";
import { cn, safeNum, safePct, safeInt, safeNumSigned } from "@/lib/utils";

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

interface PnlStats {
  total_pnl: number;
  win_rate: number;
  wins: number;
  losses: number;
  best_trade: number | null;
  worst_trade: number | null;
}

export function KPICards({ range, symbol }: Props) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [pnl, setPnl] = useState<PnlStats | null>(null);
  const [positionsCount, setPositionsCount] = useState(0);
  const [unrealized, setUnrealized] = useState(0);
  const [ticker, setTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tRes, pRes, kRes] = await Promise.all([
          fetch(`/api/trades?range=${range}&symbol=${symbol}`, { cache: "no-store" }),
          fetch(`/api/positions`, { cache: "no-store" }),
          fetch(`/api/klines?symbol=${symbol}&interval=1m&limit=2`, {
            cache: "no-store",
          }),
        ]);
        const [tData, pData, kData] = await Promise.all([
          tRes.json().catch(() => ({})),
          pRes.json().catch(() => ({})),
          kRes.json().catch(() => ({})),
        ]);
        if (cancelled) return;
        setPnl({
          total_pnl: Number(tData.total_pnl) || 0,
          win_rate: Number(tData.win_rate) || 0,
          wins: Number(tData.wins) || 0,
          losses: Number(tData.losses) || 0,
          best_trade: tData.best_trade == null ? null : Number(tData.best_trade),
          worst_trade: tData.worst_trade == null ? null : Number(tData.worst_trade),
        });
        setBalance(tData.balance ?? null);
        setPositionsCount(Number(pData.count) || 0);
        setUnrealized(
          (pData.positions || []).reduce(
            (s: number, p: { pnl?: number }) => s + (Number(p?.pnl) || 0),
            0
          )
        );
        setTicker(kData.ticker ?? null);
      } catch (e) {
        console.error("[KPICards] load failed", e);
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [range, symbol]);

  const totalPnl = (pnl?.total_pnl ?? 0) + unrealized;
  const pnlPct =
    balance && balance.total > 0 ? (totalPnl / balance.total) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <KPI
        label={`${symbol} Fiyat`}
        value={ticker ? safeNum(ticker.price) : "—"}
        sub={
          ticker
            ? `${safePct(ticker.change_pct)} 24h`
            : "—"
        }
        subColor={ticker ? (ticker.change_pct >= 0 ? "green" : "red") : "muted"}
      />
      <KPI
        label="Bakiye"
        value={balance ? safeNum(balance.total) : "—"}
        sub={
          balance
            ? `${balance.currency || "USDT"} • ${safeNum(balance.available)} free`
            : "—"
        }
      />
      <KPI
        label="Net PnL"
        value={safeNumSigned(totalPnl)}
        sub={`${safePct(pnlPct)} • unrealized ${safeNumSigned(unrealized)}`}
        color={totalPnl >= 0 ? "green" : "red"}
      />
      <KPI
        label="Win Rate"
        value={pnl ? `${safeNum(pnl.win_rate, 0)}%` : "—"}
        sub={pnl ? `${pnl.wins}W / ${pnl.losses}L` : "—"}
      />
      <KPI
        label="Açık Pozisyon"
        value={safeInt(positionsCount, "0")}
        sub={positionsCount === 0 ? "—" : "canlı"}
      />
      <KPI
        label="En İyi / En Kötü"
        value={
          pnl && pnl.best_trade != null && pnl.worst_trade != null
            ? `+${safeNum(pnl.best_trade)} / ${safeNum(pnl.worst_trade)}`
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