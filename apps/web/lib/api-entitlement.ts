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
import { consumeRateLimit } from "@/lib/api/rate-limit";

const PREMIUM_MESSAGE = "This analytics endpoint requires a Pro or Elite subscription.";

/**
 * Premium analytics floor: PRO or ELITE only. FANTASY is a paid tier for the
 * fantasy suite (gated by requireFantasyApi), NOT the betting-depth tier — so it
 * must NOT reach /api/intelligence/* or /api/nflverse/* Pro analytics. Keying on
 * tier !== "FREE" leaked the full Pro slate to FANTASY subscribers.
 */
const isPremium = (e: Entitlements): boolean => e.tier === "PRO" || e.tier === "ELITE";

/**
 * Generous per-user ceiling for the premium analytics endpoints. These are
 * expensive computes (DB reads + derivation) behind requirePremiumApi, but a
 * legitimate PRO/ELITE user browsing the analytics surfaces refreshes any one
 * endpoint at most a handful of times a minute. 120 requests / 60s PER endpoint
 * PER user is ~20x normal-browsing headroom (2 req/sec sustained), so a real
 * subscriber never trips it, while a scripted loop draining a single compute is
 * capped. Intentionally far more lenient than the 10/5min limit on the paid
 * Claude-backed explain / model-court routes, since these are cheaper per call.
 */
const PREMIUM_ANALYTICS_RATE_MAX = 120;
const PREMIUM_ANALYTICS_RATE_WINDOW_MS = 60_000;

interface GateEvaluation {
  /** Ready-to-send 401/403 when access is denied, else null. */
  readonly denied: NextResponse | null;
  /** The authenticated session user id — non-null whenever `denied` is null. */
  readonly userId: string | null;
}

/**
 * Single source of truth for the entitlement gate. Runs auth() once and
 * resolves the caller's entitlements, returning both the (possible) denial
 * response and the resolved user id so callers that also rate-limit don't have
 * to auth() a second time.
 */
async function evaluateGate(
  predicate: (entitlements: Entitlements) => boolean,
  message: string
): Promise<GateEvaluation> {
  let userId: string | undefined;
  try {
    userId = (await auth())?.user?.id;
  } catch {
    userId = undefined;
  }

  if (!userId) {
    return {
      denied: NextResponse.json(
        { success: false, error: "authentication_required", message },
        { status: 401 }
      ),
      userId: null,
    };
  }

  let entitlements: Entitlements;
  try {
    entitlements = await getUserEntitlements(userId);
  } catch {
    entitlements = getEntitlements("FREE"); // fail closed
  }

  if (!predicate(entitlements)) {
    return {
      denied: NextResponse.json(
        { success: false, error: "insufficient_tier", message },
        { status: 403 }
      ),
      userId,
    };
  }

  return { denied: null, userId };
}

/**
 * Gate an API route on an entitlement predicate. Returns `null` when the
 * caller satisfies `predicate`, otherwise a 401/403 JSON response.
 */
export async function gateApi(
  predicate: (entitlements: Entitlements) => boolean,
  message: string = PREMIUM_MESSAGE
): Promise<NextResponse | null> {
  return (await evaluateGate(predicate, message)).denied;
}

/**
 * Premium floor: Pro or Elite. Gates premium ANALYTICS endpoints
 * (/api/intelligence/*), never the picks. Since the entitlement remap made
 * `canSeePremiumPicks` true for all tiers (picks are free —
 * ENTITLEMENT_REMAP_SPEC.md), this floor keys off paid-tier membership so the
 * paid analytics stay paid. FREE → 403, fails closed to FREE on lookup error.
 */
export function requirePremiumApi(): Promise<NextResponse | null> {
  return gateApi(isPremium);
}

/**
 * Same premium (PRO/ELITE) floor as {@link requirePremiumApi}, plus a per-user
 * rate limit applied AFTER the entitlement gate. Anonymous / FREE callers still
 * receive the 401/403 entitlement denial first — the gate strictly precedes the
 * limiter, so the paywall is never masked by a 429 and only an already-entitled
 * caller can be rate-limited. Each caller is limited against their own session
 * user id; `bucketId` keeps endpoints independent so browsing one analytics
 * surface never eats into another's budget. On exceed: 429 with a Retry-After
 * header, mirroring the explain / model-court routes. Returns `null` when the
 * request may proceed.
 *
 * @param bucketId stable per-endpoint limiter name (e.g. "intelligence/combine")
 */
export async function requirePremiumApiRateLimited(
  bucketId: string
): Promise<NextResponse | null> {
  const gate = await evaluateGate(isPremium, PREMIUM_MESSAGE);
  if (gate.denied) return gate.denied;
  // Unreachable in practice: evaluateGate only grants (denied === null) with a
  // non-null userId. The guard narrows the type without a non-null assertion.
  if (!gate.userId) return null;

  const limit = consumeRateLimit(
    bucketId,
    gate.userId,
    PREMIUM_ANALYTICS_RATE_MAX,
    PREMIUM_ANALYTICS_RATE_WINDOW_MS
  );
  if (!limit.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "rate-limited",
        message: "Too many requests. Please wait a moment before trying again.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }
  return null;
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
