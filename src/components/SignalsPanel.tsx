"use client";

import { useEffect, useState, useCallback } from "react";
import { Radar, RefreshCw, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn, safeNum } from "@/lib/utils";

interface Signal {
  symbol: string;
  side: "LONG" | "SHORT";
  strategy: string;
  price: number;
  strength: number;
  note: string;
  ts: number;
}
interface SignalsResult {
  ok: boolean;
  count: number;
  signals: Signal[];
  scanned?: string[];
  error?: string;
}

function ago(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m}dk`;
  return `${Math.floor(m / 60)}sa`;
}

export function SignalsPanel({ interval = "15m" }: { interval?: string }) {
  const [data, setData] = useState<SignalsResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/signals?interval=${interval}`, { cache: "no-store" });
      setData(await r.json());
    } catch {
      setData({ ok: false, count: 0, signals: [], error: "bağlantı hatası" });
    } finally {
      setLoading(false);
    }
  }, [interval]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const signals = data?.signals || [];

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col h-full">
      <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Radar className="w-4 h-4 text-accent-soft shrink-0" />
          <span className="font-semibold text-sm truncate">Sinyaller</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wide shrink-0">
            {interval} · canlı tarama
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {signals.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold">
              {signals.length}
            </span>
          )}
          <button
            onClick={load}
            className="p-1 rounded hover:bg-card-hover transition-colors text-text-soft"
            title="Yeniden tara"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-2 sm:p-3 overflow-y-auto max-h-[420px]">
        {!data && loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">piyasa taranıyor…</span>
          </div>
        )}

        {data && signals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted text-xs text-center px-4">
            <Radar className="w-6 h-6 opacity-40" />
            <span>Şu an aktif sinyal yok.</span>
            <span className="text-[10px]">
              {data.scanned?.length || 5} sembol tarandı · sinyal oluşunca burada belirir
            </span>
          </div>
        )}

        <div className="space-y-2">
          {signals.map((s, i) => {
            const long = s.side === "LONG";
            return (
              <div
                key={`${s.symbol}-${s.strategy}-${i}`}
                className={cn(
                  "rounded-md border p-2.5 fade-in",
                  long
                    ? "border-green/30 bg-green/5"
                    : "border-red/30 bg-red/5"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                        long ? "bg-green/20 text-green" : "bg-red/20 text-red"
                      )}
                    >
                      {long ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {s.side}
                    </span>
                    <span className="text-xs font-mono font-semibold truncate">
                      {s.symbol}
                    </span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums shrink-0">
                    {safeNum(s.price)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-[10px] text-text-soft truncate">
                    {s.strategy} · {s.note}
                  </span>
                  <span className="text-[9px] text-text-muted shrink-0">{ago(s.ts)}</span>
                </div>

                {/* strength bar */}
                <div className="mt-1.5 h-1 rounded-full bg-border/50 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", long ? "bg-green" : "bg-red")}
                    style={{ width: `${Math.min(100, s.strength)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border-soft px-3 sm:px-4 py-1.5 text-[10px] text-text-muted flex justify-between">
        <span>RSI · EMA · Bollinger · Momentum · Z-Score</span>
        <span>60sn otomatik</span>
      </div>
    </div>
  );
}
