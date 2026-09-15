import { hasOpsReadAuth } from "@/lib/cron/authorize";

/**
 * Operator authentication for read-only ops surfaces.
 *
 * C-420 / F-32: accepts `Authorization: Bearer <OPS_READ_SECRET>` when that
 * env is set, and always accepts `Bearer <CRON_SECRET>` (fallback when the
 * read secret is unset so nothing changes until the founder sets it). Never
 * accepts the x-vercel-cron header (that header is not proof of origin) and
 * fails closed when neither secret is configured.
 *
 * Shared SoT lives in `apps/web/lib/cron/authorize.ts` (`opsReadAuthError` /
 * `hasOpsReadAuth`). `public-surface-truth` and `daily-truth` import this
 * helper; `settlement-rca` does too. Mutation crons must never use it — they
 * keep `cronAuthError`, which never reads OPS_READ_SECRET.
 */
export function hasOpsAuth(request: Request): boolean {
  return hasOpsReadAuth(request);
}
