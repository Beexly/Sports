import { NextResponse } from "next/server";
import { loadRushingContact } from "@/lib/intelligence/rushing-contact";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/rushing-contact");
  if (denied) return denied;
  const data = await loadRushingContact();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
