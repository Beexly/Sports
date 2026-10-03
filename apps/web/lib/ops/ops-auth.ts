import { timingSafeEqual } from "node:crypto";

/**
 * Operator authentication for read-only ops surfaces: `Authorization: Bearer
 * <CRON_SECRET>`, compared in constant time. Same rule as the `?detailed`
 * view of /api/ops/public-surface-truth and /api/ops/daily-truth, which carry
 * their own copies; new ops routes import this one. Never accepts the
 * x-vercel-cron header (that header is not proof of origin) and returns
 * false when no secret is configured, so a misconfigured deployment fails
 * closed rather than open.
 */
export function hasOpsAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  try {
    const a = Buffer.from(auth);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
