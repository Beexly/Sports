import { NextResponse } from "next/server";
import { loadRushingContact } from "@/lib/intelligence/rushing-contact";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadRushingContact();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
