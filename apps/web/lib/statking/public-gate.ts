/**
 * Public gate for Galaxy StatKing (`/stats/*`).
 *
 * King of Stats is still foundation / fixture-backed. Do not expose the
 * surface until product is ready. Flip on with:
 *
 *   STATS_PUBLIC=true
 *
 * Admin cockpit under `/admin/statking/*` is unaffected (auth-gated).
 */

export function isStatsPublic(): boolean {
  const raw = (process.env.STATS_PUBLIC ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
