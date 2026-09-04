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
    // Fail closed to anonymous (unchanged) — but never silently. A throwing
    // session store rendered the free page to every paying member and looked
    // exactly like normal logged-out traffic in the logs.
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
