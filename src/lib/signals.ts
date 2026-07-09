/**
 * Live technical signal engine — computes trade signals from Binance klines.
 * Pure functions, no external state; runs on Vercel (Binance public API).
 *
 * Strategies (mirroring the user's scalping set):
 *  - RSI Reversal      (RSI < 30 long / > 70 short)
 *  - EMA Cross         (EMA9 crosses EMA21)
 *  - Bollinger Breakout(close breaks 20/2σ band)
 *  - Momentum Breakout (close breaks N-bar high/low with volume)
 *  - Z-Score Reversion (close z-score vs SMA20 beyond ±2)
 */
import { fetchKlines, type Kline } from "@/lib/data";

export type SignalSide = "LONG" | "SHORT";

export interface Signal {
  symbol: string;
  side: SignalSide;
  strategy: string;
  price: number;
  strength: number; // 0-100
  note: string;
  ts: number;
}

function ema(vals: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = vals[0];
  for (let i = 0; i < vals.length; i++) {
    prev = i === 0 ? vals[0] : vals[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  const rs = loss === 0 ? 100 : gain / loss;
  return 100 - 100 / (1 + rs);
}

function mean(a: number[]) {
  return a.reduce((s, x) => s + x, 0) / a.length;
}
function std(a: number[], m: number) {
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
}

export function detectSignals(symbol: string, k: Kline[]): Signal[] {
  const out: Signal[] = [];
  if (k.length < 30) return out;
  const closes = k.map((x) => x.c);
  const vols = k.map((x) => x.v);
  const n = closes.length;
  const price = closes[n - 1];
  const ts = k[n - 1].t * 1000;

  // --- RSI Reversal
  const r = rsi(closes);
  if (r <= 30)
    out.push({
      symbol,
      side: "LONG",
      strategy: "RSI Reversal",
      price,
      strength: Math.round(Math.min(100, (30 - r) * 3 + 55)),
      note: `RSI ${r.toFixed(1)} aşırı satım`,
      ts,
    });
  else if (r >= 70)
    out.push({
      symbol,
      side: "SHORT",
      strategy: "RSI Reversal",
      price,
      strength: Math.round(Math.min(100, (r - 70) * 3 + 55)),
      note: `RSI ${r.toFixed(1)} aşırı alım`,
      ts,
    });

  // --- EMA9/21 cross
  const e9 = ema(closes, 9);
  const e21 = ema(closes, 21);
  const crossUp = e9[n - 2] <= e21[n - 2] && e9[n - 1] > e21[n - 1];
  const crossDn = e9[n - 2] >= e21[n - 2] && e9[n - 1] < e21[n - 1];
  if (crossUp)
    out.push({
      symbol,
      side: "LONG",
      strategy: "EMA Cross",
      price,
      strength: 70,
      note: "EMA9 > EMA21 yukarı kesişim",
      ts,
    });
  if (crossDn)
    out.push({
      symbol,
      side: "SHORT",
      strategy: "EMA Cross",
      price,
      strength: 70,
      note: "EMA9 < EMA21 aşağı kesişim",
      ts,
    });

  // --- Bollinger breakout (20, 2σ)
  const win = closes.slice(-20);
  const m = mean(win);
  const sd = std(win, m);
  if (price > m + 2 * sd)
    out.push({
      symbol,
      side: "LONG",
      strategy: "Bollinger Breakout",
      price,
      strength: 65,
      note: "Üst banttan kırılım",
      ts,
    });
  else if (price < m - 2 * sd)
    out.push({
      symbol,
      side: "SHORT",
      strategy: "Bollinger Breakout",
      price,
      strength: 65,
      note: "Alt banttan kırılım",
      ts,
    });

  // --- Momentum breakout (20-bar high/low + volume confirm)
  const look = closes.slice(-21, -1);
  const hi = Math.max(...look);
  const lo = Math.min(...look);
  const volAvg = mean(vols.slice(-21, -1));
  const volOk = vols[n - 1] > volAvg * 1.2;
  if (price > hi && volOk)
    out.push({
      symbol,
      side: "LONG",
      strategy: "Momentum Breakout",
      price,
      strength: 75,
      note: "20-bar tepe + hacim",
      ts,
    });
  else if (price < lo && volOk)
    out.push({
      symbol,
      side: "SHORT",
      strategy: "Momentum Breakout",
      price,
      strength: 75,
      note: "20-bar dip + hacim",
      ts,
    });

  // --- Z-Score reversion (SMA20)
  const z = sd === 0 ? 0 : (price - m) / sd;
  if (z <= -2)
    out.push({
      symbol,
      side: "LONG",
      strategy: "Z-Score Reversion",
      price,
      strength: Math.round(Math.min(100, Math.abs(z) * 25)),
      note: `z=${z.toFixed(2)} ortalamaya dönüş`,
      ts,
    });
  else if (z >= 2)
    out.push({
      symbol,
      side: "SHORT",
      strategy: "Z-Score Reversion",
      price,
      strength: Math.round(Math.min(100, Math.abs(z) * 25)),
      note: `z=${z.toFixed(2)} ortalamaya dönüş`,
      ts,
    });

  return out;
}

export async function scanSignals(
  symbols: string[],
  interval = "15m"
): Promise<Signal[]> {
  const results = await Promise.all(
    symbols.map(async (s) => {
      try {
        const k = await fetchKlines(s, interval, 120);
        return detectSignals(s, k);
      } catch {
        return [];
      }
    })
  );
  return results.flat().sort((a, b) => b.strength - a.strength);
}
