/**
 * Single source of truth for the dev-only fake-admin escape hatch.
 *
 * `DEV_FAKE_ADMIN=true` lets a local operator open auth-gated surfaces without
 * OAuth or a Postgres session table (launch-night demos). It is HARD-GATED to
 * non-production: a stray `DEV_FAKE_ADMIN=true` in a production environment can
 * never open the auth gate, mint paid access, or escalate a session to ADMIN.
 *
 * Every consumer — `auth()` (lib/auth.ts), the route-protection middleware, and
 * `getUserEntitlements` — MUST funnel through this one predicate. The check used
 * to be copy-pasted inline in each; `auth()` had drifted to omit the NODE_ENV
 * half, which would have handed a synthetic ADMIN session to any request in prod
 * if the flag leaked. Centralising it makes that drift impossible.
 *
 * Read at call time (not module load) so tests can toggle the env per case.
 */
export function isDevFakeAdminActive(): boolean {
  return (
    process.env["NODE_ENV"] !== "production" &&
    process.env["DEV_FAKE_ADMIN"] === "true"
  );
}
