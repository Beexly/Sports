/**
 * D-8 / S3 (C11 BEFORE DEPLOY, C12 PART 3): the minimum defensible age
 * control that can ship today — a one-click 21+ cookie attestation gate on
 * every betting-analysis surface.
 *
 * Scope note (what the standard actually is): this product takes NO wagers.
 * It is analysis/picks publishing, not a sportsbook, so state gambling
 * licensing age gates do not strictly apply — but the copy says 21+
 * everywhere, responsible-gambling links are in the Footer, and an
 * unattested minor reaching pick content is the exposure the founder
 * declined to ship with. Attestation (cookie) is the floor; DOB persistence
 * is a schema change (owner-only, sealed) and is RECLASSIFIED to B- with the
 * checkout-side assertAtLeast21 (apps/web/lib/auth/age-gate.ts) as the
 * compensating control for money paths.
 *
 * The gate is ALWAYS ON — it is not a readiness gate and must not be made
 * one. There is deliberately no env flag: an off-switch for the age gate is
 * the thing a regulator asks about first.
 */

export const AGE_COOKIE = "gse_age_ok";

/** Cookie lifetime: 180 days. Re-attest twice a year. */
export const AGE_COOKIE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

/**
 * Public betting-analysis surfaces that require attestation. Prefix-matched
 * ("/board" also covers "/board/gate"). Authed surfaces (/dashboard, /admin,
 * /cockpit) are already behind a Google account whose DOB checkout re-checks;
 * they are NOT listed to keep this middleware-only change minimal.
 */
export const AGE_GATED_PREFIXES: readonly string[] = [
  "/board",
  "/picks",
  "/performance",
  "/today",
  "/intelligence",
  "/ledger",
  "/glass-ledger",
  "/kill-ledger",
  "/stats",
  "/vault",
  "/watchlist",
  "/pricing",
  "/compare",
  "/fantasy",
  "/contests",
  "/live",
];

/** True when the pathname is an age-gated betting surface. */
export function isAgeGatedSurface(pathname: string): boolean {
  return AGE_GATED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Validate a post-attestation redirect target: same-origin relative paths
 * only. Rejects absolute URLs and protocol-relative "//host" (open redirect).
 */
export function safeAgeRedirect(callbackUrl: string | null | undefined): string {
  if (
    typeof callbackUrl === "string" &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//") &&
    !callbackUrl.startsWith("/\\") &&
    callbackUrl !== "/age-verify" &&
    !callbackUrl.startsWith("/age-verify?")
  ) {
    return callbackUrl;
  }
  return "/";
}
