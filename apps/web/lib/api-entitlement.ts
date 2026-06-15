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
 * Premium floor: Pro or Elite. `canSeePremiumPicks` is true for both paid
 * tiers and false for FREE — the right floor for premium analytics JSON.
 */
export function requirePremiumApi(): Promise<NextResponse | null> {
  return gateApi((e) => e.canSeePremiumPicks);
}
