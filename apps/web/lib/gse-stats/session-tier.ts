/**
 * Resolve billing tier for GSE Stats API.
 * Session (auth + Stripe entitlements) wins. Query ?tier= alone cannot elevate.
 * Matches partner-stack / packet anti-spoof doctrine.
 */
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { getEntitlements } from "@sports/types";
import { parseBillingTier, type BillingTier } from "@sports/stats-api";

export type ResolvedTier = {
  tier: BillingTier;
  source: "session" | "default" | "query_ignored" | "query_dev";
  spoofBlocked: boolean;
};

export async function resolveStatsBillingTier(
  req: NextRequest,
  opts: { allowQueryOnly?: boolean } = {},
): Promise<ResolvedTier> {
  const queryRaw = req.nextUrl.searchParams.get("tier");

  // 1) Authenticated session — authority
  try {
    const userId = (await auth())?.user?.id;
    if (userId) {
      let entitlements;
      try {
        entitlements = await getUserEntitlements(userId);
      } catch {
        entitlements = getEntitlements("FREE");
      }
      const tier = parseBillingTier(entitlements.tier);
      return { tier, source: "session", spoofBlocked: false };
    }
  } catch {
    // auth() throw → anonymous
  }

  // 2) Query without session
  if (queryRaw) {
    if (opts.allowQueryOnly || process.env.GSE_ALLOW_QUERY_TIER === "1") {
      return {
        tier: parseBillingTier(queryRaw),
        source: "query_dev",
        spoofBlocked: false,
      };
    }
    // Spoof blocked — FREE
    return { tier: "FREE", source: "query_ignored", spoofBlocked: true };
  }

  return { tier: "FREE", source: "default", spoofBlocked: false };
}
