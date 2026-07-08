/**
 * Server-side data fetchers — proxy to SMC Engine + Binance public REST.
 * All timestamps are seconds (unix).
 */

const SMC_ENGINE = process.env.SMC_ENGINE_URL || "http://localhost:8767";
const BINANCE_DEMO = process.env.BINANCE_DEMO_BASE || "https://demo-api.binance.com";
const BINANCE_LIVE = "https://api.binance.com";

const BINANCE_BASE = process.env.BINANCE_DEMO === "true" ? BINANCE_DEMO : BINANCE_LIVE;

export interface Position {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT" | "BUY" | "SELL";
  qty: number;
  entry: number;
  current: number;
  pnl: number;
  pnl_pct: number;
  opened_at: number;
  sl?: number | null;
  tp?: number | null;
}

export interface Trade {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT" | "BUY" | "SELL";
  qty: number;
  entry: number;
  exit: number;
  pnl: number;
  pnl_pct: number;
  opened_at: number;
  closed_at: number;
  duration_s: number;
  strategy?: string;
}

export interface Kline {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface BalanceInfo {
  total: number;
  available: number;
  margin_used: number;
  unrealized_pnl: number;
  currency: string;
}

export async function fetchPositions(): Promise<Position[]> {
  try {
    const res = await fetch(`${SMC_ENGINE}/api/trade/positions`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.positions || data || [];
    return raw.map(normalizePosition);
  } catch {
    return [];
  }
}

export async function fetchOrders(): Promise<unknown[]> {
  try {
    const res = await fetch(`${SMC_ENGINE}/api/trade/orders`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.orders || data || [];
  } catch {
    return [];
  }
}

export async function fetchTradeHistory(): Promise<Trade[]> {
  try {
    const res = await fetch(`${SMC_ENGINE}/api/trade/history`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.trades || data.history || data || [];
    return raw.map(normalizeTrade);
  } catch {
    return [];
  }
}

export async function fetchBalance(): Promise<BalanceInfo | null> {
  try {
    const res = await fetch(`${SMC_ENGINE}/api/trade/balance`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const balances = data.balances || data;
    if (Array.isArray(balances)) {
      const usdt = balances.find((b: { asset?: string }) => b.asset === "USDT");
      if (usdt) {
        return {
          total: Number(usdt.balance || usdt.total || 0),
          available: Number(usdt.available || usdt.free || 0),
          margin_used: Number(usdt.margin_used || 0),
          unrealized_pnl: Number(usdt.unrealized_pnl || 0),
          currency: "USDT",
        };
      }
      return {
        total: Number(balances[0]?.balance || 0),
        available: Number(balances[0]?.available || 0),
        margin_used: 0,
        unrealized_pnl: 0,
        currency: balances[0]?.asset || "USDT",
      };
    }
    return {
      total: Number(balances.total || balances.balance || 0),
      available: Number(balances.available || balances.free || 0),
      margin_used: Number(balances.margin_used || 0),
      unrealized_pnl: Number(balances.unrealized_pnl || 0),
      currency: balances.currency || "USDT",
    };
  } catch {
    return null;
  }
}

export async function fetchKlines(
  symbol: string,
  interval: string = "15m",
  limit: number = 200
): Promise<Kline[]> {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const raw: unknown[][] = await res.json();
    return raw.map((k) => ({
      t: Math.floor(Number(k[0]) / 1000),
      o: Number(k[1]),
      h: Number(k[2]),
      l: Number(k[3]),
      c: Number(k[4]),
      v: Number(k[5]),
    }));
  } catch {
    return [];
  }
}

export async function fetchTicker(symbol: string): Promise<{
  symbol: string;
  price: number;
  change_pct: number;
  volume: number;
} | null> {
  const url = `${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      symbol,
      price: Number(data.lastPrice),
      change_pct: Number(data.priceChangePercent),
      volume: Number(data.volume),
    };
  } catch {
    return null;
  }
}

// --------- normalizers (best-effort, accept multiple shapes) ---------

function normalizePosition(p: Record<string, unknown>): Position {
  return {
    id: String(p.id || p.position_id || `${p.symbol}-${p.opened_at || Date.now()}`),
    symbol: String(p.symbol || ""),
    side: ((p.side as string) || "LONG").toUpperCase() as Position["side"],
    qty: Number(p.qty || p.quantity || p.size || 0),
    entry: Number(p.entry || p.entry_price || p.avg_price || 0),
    current: Number(p.current || p.mark_price || p.entry || 0),
    pnl: Number(p.pnl || p.unrealized_pnl || 0),
    pnl_pct: Number(p.pnl_pct || p.roe || 0),
    opened_at: Number(p.opened_at || p.create_time || p.time || 0),
    sl: p.sl != null ? Number(p.sl) : null,
    tp: p.tp != null ? Number(p.tp) : null,
  };
}

function normalizeTrade(t: Record<string, unknown>): Trade {
  const opened = Number(t.opened_at || t.time || t.create_time || 0);
  const closed = Number(t.closed_at || t.close_time || opened);
  return {
    id: String(t.id || t.trade_id || `${t.symbol}-${closed}`),
    symbol: String(t.symbol || ""),
    side: ((t.side as string) || "LONG").toUpperCase() as Trade["side"],
    qty: Number(t.qty || t.quantity || t.size || 0),
    entry: Number(t.entry || t.entry_price || 0),
    exit: Number(t.exit || t.exit_price || t.close_price || 0),
    pnl: Number(t.pnl || 0),
    pnl_pct: Number(t.pnl_pct || t.roe || 0),
    opened_at: opened,
    closed_at: closed,
    duration_s: Math.max(0, closed - opened),
    strategy: t.strategy as string | undefined,
  };
}