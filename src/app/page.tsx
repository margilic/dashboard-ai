"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { cn, type TimeRangeKey } from "@/lib/utils";
import { SymbolPicker } from "@/components/SymbolPicker";
import { TimeFilter } from "@/components/TimeFilter";
import { KPICards } from "@/components/KPICards";
import { CoinChart } from "@/components/CoinChart";
import { PnlCurve } from "@/components/PnlCurve";
import { PositionsTable } from "@/components/PositionsTable";
import { TradesTable } from "@/components/TradesTable";
import { AIAnalysisPanel } from "@/components/AIAnalysisPanel";
import { AgentPanel } from "@/components/AgentPanel";

interface PnlData {
  equity_curve: { t: number; v: number }[];
  total_pnl: number;
  wins: number;
  losses: number;
  win_rate: number;
}

export default function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [range, setRange] = useState<TimeRangeKey>("7d");
  const [pnlData, setPnlData] = useState<PnlData | null>(null);
  const [health, setHealth] = useState<"ok" | "degraded" | "down">("ok");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/pnl?range=${range}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setHealth("degraded");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setPnlData(data);
        setHealth("ok");
      } catch {
        if (!cancelled) setHealth("down");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <main className="min-h-screen px-4 md:px-6 lg:px-8 py-5 max-w-[1600px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-accent to-accent-soft flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Margilic AI Trading Dashboard
            </h1>
            <p className="text-xs text-text-muted">
              AI-analyzed PnL, pozisyonlar ve pattern analizi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <HealthDot status={health} />
          <button
            onClick={() => {
              setPnlData(null);
              setRange(range); // trigger reload by toggling
              const evt = new Event("refresh");
              window.dispatchEvent(evt);
              fetch(`/api/pnl?range=${range}`, { cache: "no-store" })
                .then((r) => r.json())
                .then((d) => setPnlData(d))
                .catch(() => setHealth("degraded"));
            }}
            title="Yenile"
            className="text-xs px-2 py-1 rounded border border-border hover:bg-card-hover transition-colors text-text-soft"
          >
            ↻
          </button>
          <SymbolPicker value={symbol} onChange={setSymbol} />
          <TimeFilter value={range} onChange={setRange} />
        </div>
      </header>

      <section className="mb-5">
        <KPICards range={range} symbol={symbol} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{symbol}</span>
              <span className="text-[10px] text-text-muted uppercase">
                15m chart • Binance
              </span>
            </div>
          </div>
          <CoinChart symbol={symbol} interval="15m" height={340} />
        </div>

        <div className="rounded-lg border border-border bg-card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">Equity Curve</span>
            <span className="text-[10px] text-text-muted uppercase">
              {range}
            </span>
          </div>
          <PnlCurve data={pnlData?.equity_curve || []} height={300} />
          {pnlData && (
            <div className="border-t border-border-soft mt-3 pt-3 grid grid-cols-3 gap-3 text-xs">
              <Mini
                label="Net"
                value={pnlData.total_pnl}
                positive
                suffix=" USDT"
              />
              <Mini label="Trades" value={pnlData.wins + pnlData.losses} />
              <Mini
                label="WR"
                value={pnlData.win_rate}
                positive
                suffix="%"
              />
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2">
          <PositionsTable />
        </div>
        <AIAnalysisPanel symbol={symbol} range={range} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2">
          <TradesTable range={range} symbol={symbol} />
        </div>
        <AgentPanel range={range} />
      </section>

      <footer className="text-center text-[10px] text-text-muted py-4">
        Binance public API • SMC Engine :8767 • MiniMax-M3 / DeepSeek •{" "}
        {new Date().toLocaleDateString("tr-TR")}
      </footer>
    </main>
  );
}

function HealthDot({ status }: { status: "ok" | "degraded" | "down" }) {
  const map = {
    ok: { color: "bg-green", label: "online" },
    degraded: { color: "bg-warning", label: "degraded" },
    down: { color: "bg-red", label: "offline" },
  } as const;
  const m = map[status];
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
      <span className={cn("w-1.5 h-1.5 rounded-full", m.color)} />
      {m.label}
    </div>
  );
}

function Mini({
  label,
  value,
  suffix,
  positive,
}: {
  label: string;
  value: number;
  suffix?: string;
  positive?: boolean;
}) {
  const isPos = value >= 0;
  return (
    <div>
      <div className="text-text-muted text-[10px] uppercase tracking-wide">
        {label}
      </div>
      <div
        className={cn(
          "font-semibold tabular-nums",
          positive && (isPos ? "text-green" : "text-red"),
          !positive && "text-text"
        )}
      >
        {positive && isPos ? "+" : ""}
        {value.toFixed(2)}
        {suffix || ""}
      </div>
    </div>
  );
}