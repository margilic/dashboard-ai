"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, Play, Search } from "lucide-react";
import { cn, safeNum } from "@/lib/utils";

interface HourBucket {
  hour_utc: number;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
}

interface SymbolStat {
  symbol: string;
  trades: number;
  pnl: number;
  win_rate: number;
}

interface Props {
  range: string;
}

export function AgentPanel({ range }: Props) {
  const [report, setReport] = useState<string>("");
  const [hours, setHours] = useState<HourBucket[]>([]);
  const [symbols, setSymbols] = useState<SymbolStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<number | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range, focus: "patterns" }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Agent başarısız");
        return;
      }
      setReport(data.report || "");
      setHours(data.context?.hour_distribution || []);
      setSymbols(data.context?.symbol_breakdown || []);
      setLastRun(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-accent-soft" />
          <span className="font-semibold text-sm">Pattern Agent</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wide">
            DeepSeek
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
            <>
              <Play className="w-3 h-3" />
              Çalıştır
            </>
          )}
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto text-sm leading-relaxed">
        {!report && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted text-xs">
            <Search className="w-6 h-6 opacity-40" />
            <span>Pattern analizi için &quot;Çalıştır&quot; bas.</span>
            <span className="text-[10px]">
              DeepSeek trade geçmişini tarar, saat/coin korelasyonu çıkarır.
            </span>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-accent-soft" />
            <span className="text-xs">DeepSeek pattern arıyor…</span>
          </div>
        )}
        {error && (
          <div className="text-red text-xs">
            <strong>Hata:</strong> {error}
          </div>
        )}
        {report && (
          <div className="fade-in whitespace-pre-wrap text-text">{report}</div>
        )}
      </div>

      {(hours.length > 0 || symbols.length > 0) && (
        <div className="border-t border-border px-4 py-3 space-y-2 text-xs">
          {hours.length > 0 && (
            <div>
              <div className="text-text-muted text-[10px] uppercase tracking-wide mb-1">
                Saat dağılımı (UTC)
              </div>
              <div className="flex gap-0.5 items-end h-8">
                {hours.map((h) => {
                  const max = Math.max(...hours.map((x) => Math.abs(x.pnl)));
                  const h_pct = max > 0 ? (Math.abs(h.pnl) / max) * 100 : 0;
                  return (
                    <div
                      key={h.hour_utc}
                      title={`${h.hour_utc}UTC • ${h.trades} trade • ${h.pnl >= 0 ? "+" : ""}${safeNum(h.pnl)}`}
                      className={cn(
                        "flex-1 rounded-sm transition-opacity hover:opacity-100 opacity-70",
                        h.pnl >= 0 ? "bg-green" : "bg-red"
                      )}
                      style={{ height: `${Math.max(4, h_pct)}%` }}
                    />
                  );
                })}
              </div>
            </div>
          )}
          {symbols.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {symbols.slice(0, 6).map((s) => (
                <span
                  key={s.symbol}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px]",
                    s.pnl >= 0
                      ? "bg-green/10 text-green"
                      : "bg-red/10 text-red"
                  )}
                >
                  {s.symbol}: {s.pnl >= 0 ? "+" : ""}
                  {safeNum(s.pnl)} ({safeNum(s.win_rate, 0)}%)
                </span>
              ))}
            </div>
          )}
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