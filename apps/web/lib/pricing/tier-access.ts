/**
 * Viewer-level tier access — the one helper every gated PAGE calls.
 *
 * Server-only: resolves the session (anonymous → FREE) and the user's
 * entitlements (DB-backed, fail-closed to FREE). Surfaces gate on the
 * returned flags BEFORE loading or rendering premium data, so nothing
 * gated ever reaches the client. This is the page-level counterpart to
 * the per-API `getUserEntitlements` checks.
 */

import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { logEntitlementFailClosed } from "@/lib/entitlement-observability";
import { getEntitlements, type Entitlements } from "@sports/types";

export async function getViewerEntitlements(): Promise<Entitlements> {
  let userId: string | undefined;
  try {
    const session = await auth();
    userId = session?.user?.id;
  } catch (error) {
    // BACKSTOP ONLY — see the matching note in lib/api-entitlement.ts. `auth()`
    // swallows a throwing session store and returns `null`, so the downgrade is
    // logged inside lib/auth.ts at "auth:session-store". This catch stays so a
    // fault that does reach here still fails closed to anonymous rather than
    // throwing a 500 out of a page render.
    logEntitlementFailClosed("tier-access:auth", undefined, error);
    userId = undefined;
  }
  if (!userId) return getEntitlements("FREE");
  try {
    return await getUserEntitlements(userId);
  } catch (error) {
    logEntitlementFailClosed("tier-access:entitlements", userId, error);
    return getEntitlements("FREE"); // fail closed
  }
}
