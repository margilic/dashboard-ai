import { NextResponse } from "next/server";
import { fetchAgents } from "@/lib/paperclip";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await fetchAgents();
  return NextResponse.json({ ...data, ts: Date.now() });
}
