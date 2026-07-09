"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  title: string;
  status: string;
  model: string;
  lastHeartbeatAt: string | null;
  pauseReason: string | null;
  orgHealth: string;
}
interface AgentsResult {
  online: boolean;
  agents: AgentInfo[];
  total: number;
  running: number;
  paused: number;
  idle: number;
  error?: string;
}

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  running: { dot: "bg-green animate-pulse", label: "çalışıyor" },
  active: { dot: "bg-green animate-pulse", label: "aktif" },
  busy: { dot: "bg-green animate-pulse", label: "meşgul" },
  idle: { dot: "bg-accent-soft", label: "boşta" },
  paused: { dot: "bg-warning", label: "duraklatıldı" },
  error: { dot: "bg-red", label: "hata" },
};

function statusOf(s: string) {
  return STATUS_STYLE[s.toLowerCase()] || { dot: "bg-text-muted", label: s };
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

export function AgentsPanel() {
  const [data, setData] = useState<AgentsResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/agents", { cache: "no-store" });
      setData(await r.json());
    } catch {
      setData({ online: false, agents: [], total: 0, running: 0, paused: 0, idle: 0, error: "bağlantı hatası" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col h-full">
      <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-accent-soft shrink-0" />
          <span className="font-semibold text-sm truncate">Ajanlar</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wide shrink-0">
            Paperclip
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className={cn("w-1.5 h-1.5 rounded-full", data?.online ? "bg-green" : "bg-red")} />
            {data ? (data.online ? "online" : "offline") : "…"}
          </span>
          <button
            onClick={load}
            className="p-1 rounded hover:bg-card-hover transition-colors text-text-soft"
            title="Yenile"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* summary counters */}
      <div className="grid grid-cols-4 divide-x divide-border-soft border-b border-border text-center">
        <Counter label="Toplam" value={data?.total ?? "—"} />
        <Counter label="Çalışan" value={data?.running ?? "—"} tone="green" />
        <Counter label="Duraklı" value={data?.paused ?? "—"} tone="warning" />
        <Counter label="Boşta" value={data?.idle ?? "—"} />
      </div>

      <div className="flex-1 p-2 sm:p-3 overflow-y-auto max-h-[420px]">
        {!data && loading && (
          <div className="flex items-center justify-center py-10 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {data && !data.online && (
          <div className="text-xs text-text-muted text-center py-6 px-3">
            Paperclip erişilemedi{data.error ? ` — ${data.error}` : ""}.
          </div>
        )}
        <div className="space-y-2">
          {data?.agents.map((a) => {
            const st = statusOf(a.status);
            return (
              <div
                key={a.id}
                className="rounded-md border border-border-soft bg-card-hover/30 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", st.dot)} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{a.name}</div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide">
                        {a.role}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap shrink-0",
                      a.status.toLowerCase() === "paused"
                        ? "bg-warning/10 text-warning"
                        : a.status.toLowerCase() === "running"
                          ? "bg-green/10 text-green"
                          : "bg-border/40 text-text-muted"
                    )}
                  >
                    {st.label}
                  </span>
                </div>
                {a.title && (
                  <p className="text-[10px] text-text-soft mt-1.5 leading-snug line-clamp-2">
                    {a.title}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1.5 text-[9px] text-text-muted">
                  <span className="font-mono truncate">{a.model}</span>
                  <span className="shrink-0">hb {ago(a.lastHeartbeatAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "green" | "warning";
}) {
  return (
    <div className="py-2 px-1">
      <div
        className={cn(
          "text-base sm:text-lg font-bold tabular-nums leading-none",
          tone === "green" && "text-green",
          tone === "warning" && "text-warning"
        )}
      >
        {value}
      </div>
      <div className="text-[9px] text-text-muted uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}
