/**
 * Server-side entitlement gate for API routes.
 *
 * Mirrors the page-level `getViewerEntitlements` (anonymous → FREE,
 * DB-backed, fail-closed) but speaks HTTP: it returns a ready-to-send
 * `NextResponse` when access is denied, or `null` when access is granted.
 *
 * Why this exists: premium analytics surfaces (e.g. the Pro `/trends`
 * page) link their underlying `/api/intelligence/*` and `/api/nflverse/*`
 * JSON. Without a server-side check on the route itself, the page gate is
 * trivially bypassed by requesting the JSON URL directly. This helper makes
 * the raw endpoint require the same entitlement as the surface that links it.
 *
 *   export async function GET(): Promise<NextResponse> {
 *     const denied = await requirePremiumApi();
 *     if (denied) return denied;
 *     ...
 *   }
 *
 * Status codes: 401 when there is no authenticated session, 403 when the
 * caller is authenticated but under the required tier.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { getEntitlements, type Entitlements } from "@sports/types";

const PREMIUM_MESSAGE = "This analytics endpoint requires a Pro or Elite subscription.";

/**
 * Gate an API route on an entitlement predicate. Returns `null` when the
 * caller satisfies `predicate`, otherwise a 401/403 JSON response.
 */
export async function gateApi(
  predicate: (entitlements: Entitlements) => boolean,
  message: string = PREMIUM_MESSAGE
): Promise<NextResponse | null> {
  let userId: string | undefined;
  try {
    userId = (await auth())?.user?.id;
  } catch {
    userId = undefined;
  }

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "authentication_required", message },
      { status: 401 }
    );
  }

  let entitlements: Entitlements;
  try {
    entitlements = await getUserEntitlements(userId);
  } catch {
    entitlements = getEntitlements("FREE"); // fail closed
  }

  if (!predicate(entitlements)) {
    return NextResponse.json(
      { success: false, error: "insufficient_tier", message },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Premium floor: Pro or Elite. Gates premium ANALYTICS endpoints
 * (/api/intelligence/*), never the picks. Since the entitlement remap made
 * `canSeePremiumPicks` true for all tiers (picks are free —
 * ENTITLEMENT_REMAP_SPEC.md), this floor keys off paid-tier membership so the
 * paid analytics stay paid. FREE → 403, fails closed to FREE on lookup error.
 */
export function requirePremiumApi(): Promise<NextResponse | null> {
  // Premium analytics floor is PRO or ELITE only. FANTASY is a paid tier for the
  // fantasy suite (gated by requireFantasyApi), NOT the betting-depth tier — so it
  // must NOT reach /api/intelligence/* or /api/nflverse/* Pro analytics. Keying on
  // tier !== "FREE" leaked the full Pro slate to FANTASY subscribers.
  return gateApi((e) => e.tier === "PRO" || e.tier === "ELITE");
}

/**
 * Fantasy floor: any paid tier (Fantasy, Pro, or Elite). Gates fantasy JSON
 * endpoints so the paid fantasy suite can't be reached by requesting the URL
 * directly. FREE → 403, fails closed to FREE on lookup error.
 *
 * NOTE: the live fantasy tools (Best Ball, Draft) are SSR pages, not JSON APIs, so
 * they enforce the paywall a different way — the server hands a FREE viewer only the
 * trial subset of the pool (`poolForViewer` in `lib/fantasy/free-trial.ts`), so the
 * paid rows are never serialized to the client. This helper is the equivalent guard
 * for any fantasy data exposed as a raw JSON route (mirrors `requirePremiumApi`).
 */
export function requireFantasyApi(): Promise<NextResponse | null> {
  return gateApi(
    (e) => e.canUseFantasyFull,
    "This fantasy tool requires a Fantasy, Pro, or Elite subscription."
  );
}
