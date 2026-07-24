import { NextResponse } from "next/server";
import { loadClvBacktest } from "@/lib/intelligence/clv-calibration";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { redactUnpublishedClvBacktest } from "@/lib/intelligence/clv-calibration-public-redaction";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/clv-calibration");
  if (denied) return denied;
  const data = await loadClvBacktest();
  return NextResponse.json({ success: data.status !== "source-error", data: redactUnpublishedClvBacktest(data) });
}
