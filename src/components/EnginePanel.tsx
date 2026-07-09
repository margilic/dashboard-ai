"use client";

import { useEffect, useState, useCallback } from "react";
import { Cpu, RefreshCw, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn, safeNum, safeNumSigned } from "@/lib/utils";

interface Position {
  symbol: string;
  side: "LONG" | "SHORT";
  strategy: string;
  entry: number;
  current: number;
  unrealized: number;
  pnl_pct: number;
}
interface EngineState {
  engine: string;
  status: string;
  cycle_at: string | null;
  interval: string;
  universe: string[];
  balance: { equity: number; initial_balance: number; unrealized_pnl: number; realized_today: number } | null;
  open_positions: Position[];
  stats: {
    open: number; total_trades: number; wins: number; losses: number;
    win_rate: number; total_pnl: number; equity: number; unrealized: number;
  };
}

function ago(iso: string | null): string {
  if (!iso) return "—";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa önce`;
  return `${Math.floor(h / 24)}g önce`;
}

export function EnginePanel() {
  const [data, setData] = useState<EngineState | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/engine", { cache: "no-store" });
      setData(await r.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const s = data?.stats;
  // stale if last cycle > 12 min ago
  const stale = data?.cycle_at ? Date.now() - new Date(data.cycle_at).getTime() > 12 * 60000 : true;
  const online = !!data && data.engine !== "offline" && !stale;
  const totalPnl = (s?.total_pnl ?? 0) + (s?.unrealized ?? 0);

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col h-full">
      <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu className="w-4 h-4 text-accent-soft shrink-0" />
          <span className="font-semibold text-sm truncate">Trade Motoru</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wide shrink-0">
            Hermes · paper
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className={cn("w-1.5 h-1.5 rounded-full", online ? "bg-green animate-pulse" : "bg-warning")} />
            {data ? (online ? "çalışıyor" : "beklemede") : "…"}
          </span>
          <button onClick={load} className="p-1 rounded hover:bg-card-hover transition-colors text-text-soft" title="Yenile">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 divide-x divide-border-soft border-b border-border text-center">
        <Counter label="Açık" value={s?.open ?? "—"} />
        <Counter label="Trade" value={s?.total_trades ?? "—"} />
        <Counter label="WR" value={s ? `${safeNum(s.win_rate, 0)}%` : "—"} tone={s && s.win_rate >= 50 ? "green" : undefined} />
        <Counter
          label="PnL"
          value={s ? safeNumSigned(totalPnl, 0) : "—"}
          tone={totalPnl >= 0 ? "green" : "red"}
        />
      </div>

      {/* equity row */}
      <div className="px-3 sm:px-4 py-2 border-b border-border-soft flex items-center justify-between text-[11px]">
        <span className="text-text-muted">
          Equity <span className="text-text font-semibold tabular-nums">${safeNum(s?.equity ?? 100000, 0)}</span>
        </span>
        <span className="text-text-muted">
          Unreal{" "}
          <span className={cn("font-semibold tabular-nums", (s?.unrealized ?? 0) >= 0 ? "text-green" : "text-red")}>
            {safeNumSigned(s?.unrealized ?? 0)}
          </span>
        </span>
        <span className="text-text-muted">cycle {ago(data?.cycle_at ?? null)}</span>
      </div>

      {/* open positions */}
      <div className="flex-1 p-2 sm:p-3 overflow-y-auto max-h-[360px]">
        {!data && loading && (
          <div className="flex items-center justify-center py-10 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {data && data.open_positions.length === 0 && (
          <div className="text-xs text-text-muted text-center py-8 px-4">
            Açık pozisyon yok. Motor {data.universe?.length || 10} sembolü {data.interval} tarıyor;
            güçlü sinyal oluşunca pozisyon açar.
          </div>
        )}
        <div className="space-y-2">
          {data?.open_positions.map((p, i) => {
            const long = p.side === "LONG";
            const up = p.unrealized >= 0;
            return (
              <div key={`${p.symbol}-${i}`} className="rounded-md border border-border-soft bg-card-hover/30 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                      long ? "bg-green/20 text-green" : "bg-red/20 text-red")}>
                      {long ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {p.side}
                    </span>
                    <span className="text-xs font-mono font-semibold truncate">{p.symbol}</span>
                  </div>
                  <span className={cn("text-xs font-semibold tabular-nums shrink-0", up ? "text-green" : "text-red")}>
                    {safeNumSigned(p.unrealized)} ({safeNumSigned(p.pnl_pct)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-text-muted">
                  <span className="truncate">{p.strategy}</span>
                  <span className="font-mono shrink-0">giriş {safeNum(p.entry)} → {safeNum(p.current)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border-soft px-3 sm:px-4 py-1.5 text-[10px] text-text-muted flex justify-between">
        <span>Hermes cron · 5dk</span>
        <span>5 strateji · %2 risk · TP1.5/SL1</span>
      </div>
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: number | string; tone?: "green" | "red" }) {
  return (
    <div className="py-2 px-1">
      <div className={cn("text-base sm:text-lg font-bold tabular-nums leading-none",
        tone === "green" && "text-green", tone === "red" && "text-red")}>
        {value}
      </div>
      <div className="text-[9px] text-text-muted uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
