import { NextResponse } from "next/server";
import { fetchTradeHistory } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "7d";

  const trades = await fetchTradeHistory();
  const cutoff = range === "all" ? 0 : Date.now() / 1000 - parseRange(range);
  const filtered = trades.filter((t) => t.closed_at >= cutoff);
  filtered.sort((a, b) => a.closed_at - b.closed_at);

  let cum = 0;
  const points = filtered.map((t) => {
    cum += t.pnl;
    return { t: t.closed_at, pnl: t.pnl, cum };
  });

  // Bucket by hour/day depending on range
  const bucketSec =
    range === "1h" || range === "4h" ? 300 : range === "24h" ? 3600 : 86400;
  const buckets = new Map<number, { t: number; cum: number }>();
  let last = 0;
  for (const p of points) {
    const b = Math.floor(p.t / bucketSec) * bucketSec;
    if (!buckets.has(b)) {
      buckets.set(b, { t: b, cum: last });
    }
    last = p.cum;
    buckets.set(b, { t: b, cum: p.cum });
  }

  return NextResponse.json({
    range,
    points: Array.from(buckets.values()),
    final: cum,
    count: filtered.length,
  });
}

function parseRange(range: string): number {
  const map: Record<string, number> = {
    "1h": 3600,
    "4h": 14400,
    "24h": 86400,
    "7d": 604800,
    "30d": 2592000,
    "90d": 7776000,
  };
  return map[range] || 604800;
}