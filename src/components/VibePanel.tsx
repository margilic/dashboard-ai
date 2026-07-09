"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Search, Boxes } from "lucide-react";
import { cn, safeNum } from "@/lib/utils";

interface CatalogGroup {
  key: string;
  label: string;
  emoji: string;
  desc: string;
  tools: string[];
}
interface VibeStatus {
  online: boolean;
  tools_count: number;
  error?: string | null;
  bridge: string;
}
interface OHLCV {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

const PRESETS = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "AAPL.US", "NVDA.US", "00700.HK"];

export function VibePanel() {
  const [status, setStatus] = useState<VibeStatus | null>(null);
  const [catalog, setCatalog] = useState<CatalogGroup[]>([]);
  const [liveTools, setLiveTools] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"catalog" | "research">("catalog");

  const [code, setCode] = useState("BTC-USDT");
  const [rows, setRows] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/vibe/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setStatus(d.status);
        setCatalog(d.catalog || []);
        setLiveTools(new Set((d.tools || []).map((t: { name: string }) => t.name)));
      })
      .catch(() => {
        if (!cancelled) setStatus({ online: false, tools_count: 0, bridge: "" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runResearch(sym: string) {
    setLoading(true);
    setErr(null);
    setRows([]);
    setCode(sym);
    try {
      const src = sym.includes("-USDT") ? "okx" : "auto";
      const res = await fetch(
        `/api/vibe/market?code=${encodeURIComponent(sym)}&interval=1D&days=90&source=${src}`,
        { cache: "no-store" }
      );
      const d = await res.json();
      if (!d.ok || !d.rows?.length) {
        setErr(d.error || "Veri gelmedi (köprü offline olabilir)");
        return;
      }
      setRows(d.rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const last = rows[rows.length - 1];
  const first = rows[0];
  const chg = last && first ? ((last.c - first.c) / first.c) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col h-full">
      {/* header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-soft" />
          <span className="font-semibold text-sm">Vibe-Trading</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wide">
            MCP · 54 tool
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              status?.online ? "bg-green" : "bg-red"
            )}
          />
          {status ? (status.online ? "bridge online" : "offline") : "…"}
        </div>
      </div>

      {/* tabs */}
      <div className="flex border-b border-border text-xs">
        <TabBtn active={tab === "catalog"} onClick={() => setTab("catalog")}>
          <Boxes className="w-3 h-3" /> Yetenekler
        </TabBtn>
        <TabBtn active={tab === "research"} onClick={() => setTab("research")}>
          <Search className="w-3 h-3" /> Araştırma
        </TabBtn>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {tab === "catalog" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 fade-in">
            {catalog.map((g) => (
              <div
                key={g.key}
                className="rounded-md border border-border-soft bg-card-hover/40 p-2.5"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{g.emoji}</span>
                  <span className="text-xs font-semibold">{g.label}</span>
                  <span className="text-[10px] text-text-muted ml-auto">
                    {g.tools.length}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted mb-1.5 leading-snug">
                  {g.desc}
                </p>
                <div className="flex flex-wrap gap-1">
                  {g.tools.map((t) => (
                    <span
                      key={t}
                      title={liveTools.has(t) ? "aktif" : t}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-mono",
                        liveTools.has(t)
                          ? "bg-green/10 text-green"
                          : "bg-border/40 text-text-muted"
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {catalog.length === 0 && (
              <div className="text-text-muted text-xs col-span-full text-center py-6">
                katalog yükleniyor…
              </div>
            )}
          </div>
        )}

        {tab === "research" && (
          <div className="fade-in">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => runResearch(p)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono border transition-colors",
                    code === p
                      ? "border-accent text-accent"
                      : "border-border text-text-soft hover:bg-card-hover"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin text-accent-soft" />
                <span className="text-xs">{code} verisi çekiliyor…</span>
                <span className="text-[10px]">vibe-trading · get_market_data</span>
              </div>
            )}

            {err && !loading && (
              <div className="text-red text-xs py-4">
                <strong>Hata:</strong> {err}
              </div>
            )}

            {!loading && !err && rows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted text-xs">
                <Search className="w-6 h-6 opacity-40" />
                <span>Bir sembol seç — vibe-trading canlı OHLCV çeker.</span>
                <span className="text-[10px]">
                  Kripto (OKX), ABD/HK hisse (yfinance), A-share
                </span>
              </div>
            )}

            {!loading && rows.length > 0 && last && (
              <div className="space-y-3 fade-in">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-sm font-semibold">{code}</span>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      {safeNum(last.c)}
                    </div>
                    <div
                      className={cn(
                        "text-[10px] tabular-nums",
                        chg >= 0 ? "text-green" : "text-red"
                      )}
                    >
                      {chg >= 0 ? "+" : ""}
                      {safeNum(chg)}% · 90g
                    </div>
                  </div>
                </div>
                <Sparkline rows={rows} />
                <div className="grid grid-cols-4 gap-2 text-[10px] pt-1 border-t border-border-soft">
                  <Stat label="Açılış" value={first?.c} />
                  <Stat label="Yüksek" value={Math.max(...rows.map((r) => r.h))} />
                  <Stat label="Düşük" value={Math.min(...rows.map((r) => r.l))} />
                  <Stat label="Bar" value={rows.length} raw />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border-soft px-4 py-1.5 text-[10px] text-text-muted flex justify-between">
        <span>bridge :8768 → MCP stdio</span>
        <span>{status?.online ? `${status.tools_count} tool aktif` : "katalog modu"}</span>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1 py-2 transition-colors",
        active
          ? "text-accent border-b-2 border-accent -mb-px font-medium"
          : "text-text-muted hover:text-text-soft"
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, raw }: { label: string; value?: number; raw?: boolean }) {
  return (
    <div>
      <div className="text-text-muted uppercase tracking-wide">{label}</div>
      <div className="font-semibold tabular-nums text-text">
        {value == null ? "—" : raw ? value : safeNum(value)}
      </div>
    </div>
  );
}

function Sparkline({ rows }: { rows: OHLCV[] }) {
  const W = 320;
  const H = 70;
  const closes = rows.map((r) => r.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const pts = closes.map((c, i) => {
    const x = (i / (closes.length - 1 || 1)) * W;
    const y = H - ((c - min) / span) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = closes[closes.length - 1] >= closes[0];
  const stroke = up ? "#22c55e" : "#ef4444";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-[70px]"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
