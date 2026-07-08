import { NextResponse } from "next/server";
import { fetchKlines, fetchTicker } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") || "BTCUSDT").toUpperCase();
  const interval = url.searchParams.get("interval") || "15m";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500);

  const [klines, ticker] = await Promise.all([
    fetchKlines(symbol, interval, limit),
    fetchTicker(symbol),
  ]);

  return NextResponse.json({
    symbol,
    interval,
    klines,
    ticker,
  });
}