/**
 * Engine state fetcher — reads state.json from the engine-state git branch
 * via the GitHub API (authenticated, cache-bypass). Falls back to the public
 * raw URL on failure.
 */

const RAW_URL =
  "https://raw.githubusercontent.com/margilic/dashboard-ai/engine-state/state.json";
const API_BASE = "https://api.github.com";

export interface Position {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  strategy: string;
  entry: number;
  current: number;
  qty: number;
  notional: number;
  unrealized: number;
  pnl_pct: number;
  sl?: number | null;
  tp?: number | null;
  note?: string;
  opened_at: number;
  opened_iso: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: string;
  strategy: string;
  entry: number;
  exit: number;
  notional: number;
  pnl: number;
  pnl_pct: number;
  exit_reason: string;
  duration_s: number;
  opened_at: number;
  closed_at: number;
}

export interface EngineState {
  engine: string;
  status: string;
  cycle_at: string | null;
  interval: string;
  universe: string[];
  balance: {
    USD: { free: number; locked: number };
    equity: number;
    initial_balance: number;
    unrealized_pnl: number;
    realized_today: number;
    updated_at: string;
  } | null;
  open_positions: Position[];
  recent_trades: Trade[];
  signals: unknown[];
  stats: {
    open: number;
    total_trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    total_pnl: number;
    equity: number;
    unrealized: number;
    closed_this_cycle: number;
  };
}

const emptyState: EngineState = {
  engine: "offline",
  status: "offline",
  cycle_at: null,
  interval: "15m",
  universe: [],
  balance: null,
  open_positions: [],
  recent_trades: [],
  signals: [],
  stats: {
    open: 0, total_trades: 0, wins: 0, losses: 0, win_rate: 0,
    total_pnl: 0, equity: 100000, unrealized: 0, closed_this_cycle: 0,
  },
};

export async function fetchEngineState(): Promise<EngineState> {
  const token = process.env.GH_TOKEN;
  if (token) {
    try {
      const res = await fetch(
        `${API_BASE}/repos/margilic/dashboard-ai/contents/state.json?ref=engine-state`,
        {
          headers: { Authorization: `token ${token}`, "User-Agent": "dashboard-ai" },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          const dec = atob(data.content);
          return JSON.parse(dec);
        }
      }
    } catch {
      // fall through to raw url
    }
  }
  // fallback: public raw (cached ≤5min)
  try {
    const res = await fetch(`${RAW_URL}?t=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) return res.json();
  } catch { /* ignore */ }
  return emptyState;
}
