/**
 * Vibe-Trading integration — server-side fetchers to the local bridge
 * (vibe-bridge, FastAPI on :8768 which wraps the vibe-trading MCP stdio server).
 *
 * Falls back gracefully: if the bridge is unreachable the panel still renders
 * the static capability catalog and shows an "offline" status.
 */

const VIBE_BRIDGE =
  process.env.VIBE_BRIDGE_URL || "http://localhost:8768";

export interface VibeStatus {
  online: boolean;
  tools_count: number;
  error?: string | null;
  bridge: string;
}

export interface VibeTool {
  name: string;
  description: string;
}

export interface OHLCV {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

async function bridge(path: string, timeoutMs = 20000): Promise<unknown> {
  const res = await fetch(`${VIBE_BRIDGE}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`bridge ${res.status}`);
  return res.json();
}

export async function fetchVibeStatus(): Promise<VibeStatus> {
  try {
    const d = (await bridge("/health", 6000)) as {
      ok: boolean;
      tools_count: number;
      error?: string | null;
    };
    return {
      online: !!d.ok,
      tools_count: Number(d.tools_count || 0),
      error: d.error,
      bridge: VIBE_BRIDGE,
    };
  } catch (e) {
    return {
      online: false,
      tools_count: 0,
      error: e instanceof Error ? e.message : String(e),
      bridge: VIBE_BRIDGE,
    };
  }
}

export async function fetchVibeTools(): Promise<VibeTool[]> {
  try {
    const d = (await bridge("/tools", 8000)) as { tools: VibeTool[] };
    return d.tools || [];
  } catch {
    return [];
  }
}

/** Parse the bridge's stringified get_market_data payload into OHLCV rows. */
export async function fetchVibeMarket(
  code: string,
  interval = "1D",
  days = 90,
  source = "auto"
): Promise<OHLCV[]> {
  const d = (await bridge(
    `/market?code=${encodeURIComponent(code)}&interval=${interval}&days=${days}&source=${source}`,
    60000
  )) as { result?: { result?: string } | Record<string, unknown> };

  // bridge → { result: { result: "<json string of {code:[rows]}>" } }
  let inner: unknown = d?.result;
  if (inner && typeof inner === "object" && "result" in inner) {
    inner = (inner as { result: unknown }).result;
  }
  let parsed: Record<string, RawBar[]> = {};
  if (typeof inner === "string") {
    try {
      parsed = JSON.parse(inner);
    } catch {
      parsed = {};
    }
  } else if (inner && typeof inner === "object") {
    parsed = inner as Record<string, RawBar[]>;
  }
  const rows = parsed[code] || Object.values(parsed)[0] || [];
  return (rows as RawBar[]).map((r) => ({
    t: String(r.trade_date ?? r.date ?? ""),
    o: Number(r.open),
    h: Number(r.high),
    l: Number(r.low),
    c: Number(r.close),
    v: Number(r.volume),
  }));
}

interface RawBar {
  trade_date?: string;
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ------------------------------------------------------------- static catalog
// Grouped capability catalog (bundled so the panel renders even when the
// bridge is offline). Counts reflect the vibe-trading 0.1.10 MCP surface.
export interface CatalogGroup {
  key: string;
  label: string;
  emoji: string;
  desc: string;
  tools: string[];
}

export const VIBE_CATALOG: CatalogGroup[] = [
  {
    key: "market",
    label: "Piyasa Verisi",
    emoji: "📈",
    desc: "OHLCV, ticker, sektör, opsiyon zinciri, tarama",
    tools: [
      "get_market_data",
      "screen_market",
      "search_symbol",
      "get_options_chain",
      "get_sector_info",
      "get_macro_series",
    ],
  },
  {
    key: "research",
    label: "Araştırma & Haber",
    emoji: "📰",
    desc: "Haber, SEC dosyaları, analist raporları, web arama",
    tools: [
      "get_stock_news",
      "get_sec_filings",
      "get_research_reports",
      "get_financial_statements",
      "get_stock_profile",
      "web_search",
      "read_url",
      "iwencai_search",
    ],
  },
  {
    key: "swarm",
    label: "Ajan Swarm",
    emoji: "🐝",
    desc: "Çok ajanlı yatırım komitesi, run yönetimi",
    tools: [
      "run_swarm",
      "get_swarm_status",
      "get_run_result",
      "list_runs",
      "retry_run",
      "reap_stale_runs",
    ],
  },
  {
    key: "backtest",
    label: "Backtest & Alpha",
    emoji: "🧪",
    desc: "Strateji backtest, alpha kütüphanesi, faktör analizi",
    tools: [
      "run_shadow_backtest",
      "scan_shadow_signals",
      "extract_shadow_strategy",
      "analyze_trade_journal",
      "render_shadow_report",
    ],
  },
  {
    key: "trading",
    label: "Broker Konnektör",
    emoji: "🔌",
    desc: "Hesap, pozisyon, emir okuma (salt-okunur profiller)",
    tools: [
      "trading_connections",
      "trading_select_connection",
      "trading_check",
      "trading_account",
      "trading_positions",
      "trading_orders",
      "trading_history",
    ],
  },
  {
    key: "research_goal",
    label: "Skill & Hedef",
    emoji: "🎯",
    desc: "Skill yükleme, araştırma hedefi takibi",
    tools: [
      "list_skills",
      "load_skill",
      "start_research_goal",
      "get_research_goal",
      "add_goal_evidence",
      "update_research_goal_status",
    ],
  },
];
