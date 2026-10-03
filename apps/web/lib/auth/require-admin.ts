/**
 * Pure ADMIN-session predicate for API route gating.
 *
 * Mirrors the inline check used by the cockpit/* routes
 * (`session.user.role === "ADMIN"`) but as a single, unit-tested function so the
 * operational-posture / readiness endpoints gate consistently. Pure (no auth, no
 * DB, no env) — the route still calls `auth()` and passes the result here.
 */
export interface AdminGateSession {
  readonly user?: { readonly role?: string | null } | null;
}

export function isAdminSession(session: AdminGateSession | null | undefined): boolean {
  return Boolean(session?.user) && session?.user?.role === "ADMIN";
}

export const ADMIN_ONLY_MESSAGE = "Admin role required for this endpoint";
