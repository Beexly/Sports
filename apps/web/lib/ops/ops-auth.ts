import { timingSafeEqual } from "node:crypto";

/**
 * Operator authentication for read-only ops surfaces: `Authorization: Bearer
 * <CRON_SECRET>` — and, once the founder sets OPS_READ_SECRET in Vercel
 * (F-32/C-420), `Authorization: Bearer <OPS_READ_SECRET>` as well: one read
 * credential that is NOT the mutation cron secret. When OPS_READ_SECRET is
 * unset this predicate is exactly the historical single-secret rule, so a
 * deployment's behavior does not change until the founder adds the env var.
 *
 * Each candidate is compared in constant time (length gate, then
 * timingSafeEqual); the candidate list is fixed at two, so total timing does
 * not depend on the credential presented. Mutation crons never go through
 * this predicate — lib/cron/authorize.ts's cronAuthError family checks only
 * CRON_SECRET/CRON_SECRET_PREVIOUS, so a leaked read credential cannot fire a
 * cron. New ops routes import this one. Never accepts the x-vercel-cron
 * header (that header is not proof of origin) and returns false when no
 * secret is configured, so a misconfigured deployment fails closed rather
 * than open.
 */
export function hasOpsAuth(request: Request): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const a = Buffer.from(auth);
  const candidates = [process.env["CRON_SECRET"], process.env["OPS_READ_SECRET"]];
  for (const candidate of candidates) {
    const secret = candidate?.trim();
    if (!secret) continue;
    const expected = `Bearer ${secret}`;
    try {
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      return false;
    }
  }
  return false;
}
