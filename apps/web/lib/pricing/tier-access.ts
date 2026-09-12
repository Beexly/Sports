/**
 * Viewer-level tier access — the one helper every gated PAGE calls.
 *
 * Server-only: resolves the session (anonymous → FREE) and the user's
 * entitlements (DB-backed, fail-closed to FREE). Surfaces gate on the
 * returned flags BEFORE loading or rendering premium data, so nothing
 * gated ever reaches the client. This is the page-level counterpart to
 * the per-API `getUserEntitlements` checks.
 *
 * ADMIN sessions get ELITE (2026-09-12). The company owner was being
 * paywalled out of their own intelligence engines because the DB
 * Subscription row is FREE while the session role is ADMIN. Admin is
 * not a billing tier — it is operational authority. The owner must be
 * able to see every surface they ship to customers.
 */

import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { logEntitlementFailClosed } from "@/lib/entitlement-observability";
import { getEntitlements, type Entitlements } from "@sports/types";

export async function getViewerEntitlements(): Promise<Entitlements> {
  let userId: string | undefined;
  let email: string | null | undefined;
  let role: string | undefined;
  try {
    const session = await auth();
    userId = session?.user?.id;
    email = session?.user?.email;
    role = (session?.user as { role?: string } | undefined)?.role;
  } catch (error) {
    // BACKSTOP ONLY — see the matching note in lib/api-entitlement.ts. `auth()`
    // swallows a throwing session store and returns `null`, so the downgrade is
    // logged inside lib/auth.ts at "auth:session-store". This catch stays so a
    // fault that does reach here still fails closed to anonymous rather than
    // throwing a 500 out of a page render.
    logEntitlementFailClosed("tier-access:auth", undefined, error);
    userId = undefined;
    email = undefined;
    role = undefined;
  }
  // ADMIN → ELITE. Checked on the session (role or code allow-list email)
  // BEFORE the DB tier lookup, so the owner is never gated by a missing
  // Subscription row. Customer paywalls are unchanged: only ADMIN sessions
  // take this path.
  if (role === "ADMIN" || isAdminEmail(email)) {
    return getEntitlements("ELITE");
  }
  if (!userId) return getEntitlements("FREE");
  try {
    return await getUserEntitlements(userId);
  } catch (error) {
    logEntitlementFailClosed("tier-access:entitlements", userId, error);
    return getEntitlements("FREE"); // fail closed
  }
}
