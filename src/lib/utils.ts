import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(
  n: number,
  opts: { digits?: number; prefix?: string; suffix?: string } = {}
): string {
  const { digits = 2, prefix = "", suffix = "" } = opts;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${prefix}${(n / 1_000_000_000).toFixed(digits)}B${suffix}`;
  if (abs >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(digits)}M${suffix}`;
  if (abs >= 1_000) return `${prefix}${(n / 1_000).toFixed(digits)}K${suffix}`;
  return `${prefix}${n.toFixed(digits)}${suffix}`;
}

export function formatPrice(n: number, digits = 2): string {
  if (n >= 1000) return n.toFixed(digits);
  if (n >= 1) return n.toFixed(digits);
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

export function formatPct(n: number, digits = 2): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatUsd(n: number): string {
  return `$${formatNumber(n)}`;
}

export function timeAgo(unixSec: number): string {
  const diff = Date.now() / 1000 - unixSec;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const TIME_RANGES = [
  { key: "1h", label: "1H", ms: 60 * 60 * 1000 },
  { key: "4h", label: "4H", ms: 4 * 60 * 60 * 1000 },
  { key: "24h", label: "24H", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7D", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30D", ms: 30 * 24 * 60 * 60 * 1000 },
  { key: "90d", label: "90D", ms: 90 * 24 * 60 * 60 * 1000 },
  { key: "all", label: "All", ms: null },
] as const;

export type TimeRangeKey = (typeof TIME_RANGES)[number]["key"];

export const SYMBOL_PRESETS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "DOTUSDT",
] as const;

export type SymbolPreset = (typeof SYMBOL_PRESETS)[number];