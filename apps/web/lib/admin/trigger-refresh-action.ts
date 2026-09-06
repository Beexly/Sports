"use server";

/**
 * Admin "Trigger Data Refresh" server action (SEC-01).
 *
 * The previous implementation fetched its own POST /api/admin/trigger-refresh
 * without the session cookie — a dead, always-403 call, and the action itself
 * was an exposed "use server" RPC with no auth check of its own. A server
 * action is a network-invokable endpoint regardless of what the UI passes it,
 * so it now resolves a trusted HUMAN ADMIN actor itself (requireAdminActor —
 * session-derived, never caller-supplied) before doing anything, and applies
 * the same per-admin rate limit the API route uses.
 *
 * Non-admin callers get ForbiddenError from requireAdminActor; it is caught
 * here and reported as a boolean so the client form can render the outcome
 * without leaking internals. UnauthenticatedError and InvalidActorError are
 * deliberately NOT caught: no-session and malformed-privileged-session are
 * exceptional conditions on an admin-only control, not expected results.
 */

import { requireAdminActor, ForbiddenError } from "@/lib/auth/actor";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import {
  ADMIN_TRIGGER_REFRESH_LIMIT,
  ADMIN_TRIGGER_REFRESH_RATE_KEY,
  ADMIN_TRIGGER_REFRESH_WINDOW_MS,
  executeAdminRefresh,
} from "@/lib/admin/trigger-refresh";

export async function triggerDataRefreshAction(): Promise<boolean> {
  // Auth FIRST — before any sensitive work or validation.
  const actor = await requireAdminActor();

  // Same per-admin throttle as the API route: this fan-out bills per call
  // against the shared monthly odds budget (denial-of-wallet guard).
  const limit = consumeRateLimit(
    ADMIN_TRIGGER_REFRESH_RATE_KEY,
    actor.subjectId,
    ADMIN_TRIGGER_REFRESH_LIMIT,
    ADMIN_TRIGGER_REFRESH_WINDOW_MS,
  );
  if (!limit.ok) return false;

  const outcome = await executeAdminRefresh("[admin-action]");
  return outcome.ok;
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}
