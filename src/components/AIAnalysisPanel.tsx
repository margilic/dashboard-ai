"use client";

import { useEffect, useState } from "react";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { cn, safeNum, safeNumSigned } from "@/lib/utils";

interface AnalysisContext {
  total_pnl: number;
  total_pnl_pct: number;
  win_rate: number;
  total_trades: number;
  wins: number;
  losses: number;
  best_trade: number | null;
  worst_trade: number | null;
  open_positions: number;
  unrealized_pnl: number;
}

interface Props {
  symbol: string;
  range: string;
}

export function AIAnalysisPanel({ symbol, range }: Props) {
  const [analysis, setAnalysis] = useState<string>("");
  const [context, setContext] = useState<AnalysisContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<number | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, range }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Analiz başarısız");
        return;
      }
      setAnalysis(data.analysis || "");
      setContext(data.context);
      setLastRun(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, range]);

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="font-semibold text-sm">AI Analiz</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wide">
            MiniMax-M3
          </span>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className={cn(
            "text-xs px-2 py-1 rounded border border-border hover:bg-card-hover transition-colors flex items-center gap-1",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              çalışıyor
            </>
          ) : (
            "Yenile"
          )}
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto text-sm leading-relaxed">
        {loading && !analysis && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="text-xs">MiniMax-M3 analiz ediyor…</span>
          </div>
        )}
        {error && (
          <div className="text-red text-xs">
            <strong>Hata:</strong> {error}
          </div>
        )}
        {analysis && (
          <div className="fade-in whitespace-pre-wrap text-text">
            {analysis}
          </div>
        )}
      </div>

      {context && (
        <div className="border-t border-border px-4 py-3 grid grid-cols-3 gap-3 text-xs">
          <Stat label="Net PnL" value={context.total_pnl} suffix=" USDT" positive />
          <Stat label="Win Rate" value={context.win_rate} suffix="%" positive />
          <Stat label="Trades" value={context.total_trades} />
          <Stat label="W/L" value={`${context.wins}/${context.losses}`} />
          <Stat
            label="Best"
            value={context.best_trade ?? 0}
            suffix=" USDT"
            positive
          />
          <Stat
            label="Worst"
            value={context.worst_trade ?? 0}
            suffix=" USDT"
          />
        </div>
      )}

      {lastRun && (
        <div className="border-t border-border-soft px-4 py-1.5 text-[10px] text-text-muted text-right">
          Son: {new Date(lastRun).toLocaleTimeString("tr-TR")}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  positive,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  positive?: boolean;
}) {
  const isNum = typeof value === "number";
  const v = isNum ? value : null;
  const isPos = v !== null && v >= 0;
  return (
    <div>
      <div className="text-text-muted text-[10px] uppercase tracking-wide">
        {label}
      </div>
      <div
        className={cn(
          "font-semibold tabular-nums",
          positive && isNum && (isPos ? "text-green" : "text-red"),
          !positive && "text-text"
        )}
      >
        {typeof value === "number"
                    ? `${isPos && positive ? "+" : ""}${safeNum(value)}${suffix || ""}`
                    : `${value}${suffix || ""}`}
      </div>
    </div>
  );
}