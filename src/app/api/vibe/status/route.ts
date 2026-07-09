import { NextResponse } from "next/server";
import { fetchVibeStatus, fetchVibeTools, VIBE_CATALOG } from "@/lib/vibe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [status, tools] = await Promise.all([
    fetchVibeStatus(),
    fetchVibeTools(),
  ]);
  return NextResponse.json({
    status,
    tools,
    catalog: VIBE_CATALOG,
    ts: Date.now(),
  });
}
