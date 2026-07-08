import { NextResponse } from "next/server";
import { fetchPositions } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const positions = await fetchPositions();
  return NextResponse.json({
    positions,
    count: positions.length,
    ts: Date.now(),
  });
}