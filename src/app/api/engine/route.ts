import { NextResponse } from "next/server";
import { fetchEngineState } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const state = await fetchEngineState();
  return NextResponse.json({ ...state, ts: Date.now() });
}
