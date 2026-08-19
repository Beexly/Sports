import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The promoted API v1 route set.
 *
 * API v1 began as a proposal-only shadow surface, and every readiness module in
 * this directory treated the mere existence of `apps/web/app/api/v1` as a
 * blocker. Reality then moved: PR #388 ("selective publish sweep, holdout
 * ranking, B2B API, Platt") and commit 5e87691d shipped three real, key-authed,
 * rate-limited, RED-honest B2B routes through review — and every probe of the
 * live repo has reported "blocked" since, not because anything regressed but
 * because the model was never told the promotion happened.
 *
 * The 2026-08-19 promotion record (docs/ops/api-v1-promotion/) closes that gap
 * under delegated owner authority. The boundary being protected SHIFTS rather
 * than disappears: it is no longer "no routes may exist" but "no routes beyond
 * this list may exist". A new file under app/api/v1 that is not named here
 * still fails the guardrail and still blocks every readiness gate, exactly as
 * the original design intended for accidental surfaces.
 *
 * scripts/guardrails/api-v1-boundary.mjs carries its own copy of this list
 * (it must stay dependency-free); api-v1-boundary-guard.test.ts asserts the
 * two lists are identical so they cannot drift apart silently.
 */
export const PROMOTED_API_V1_ROUTES: readonly string[] = [
  "openapi/route.ts",
  "probabilities/route.ts",
  "signals/route.ts",
];

/** Recursively list files under a directory, as paths relative to it. */
function listFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const relPath = prefix === "" ? name : `${prefix}/${name}`;
    if (statSync(full).isDirectory()) out.push(...listFiles(full, relPath));
    else out.push(relPath);
  }
  return out;
}

/** Files under the route tree that are NOT part of the promoted set. */
export function unapprovedApiV1Routes(routeTreeFiles: readonly string[]): string[] {
  const promoted = new Set(PROMOTED_API_V1_ROUTES);
  return routeTreeFiles.filter((file) => !promoted.has(file));
}

/**
 * Probe the real route tree: does an UNAPPROVED API v1 route surface exist?
 *
 * Takes the tree path directly (e.g. `apps/web/app/api/v1`) so fixtures can
 * swap it in for their old `fs.existsSync(apiV1RouteTree)` probe verbatim. This
 * is what inspections should feed into the readiness modules'
 * `routeTreeExists` field, whose meaning post-promotion is "an unapproved
 * route tree exists". An absent tree and a tree containing exactly the
 * promoted set both return false; any stray file returns true.
 */
export function unapprovedApiV1RouteTreeExists(routeTreePath: string): boolean {
  if (!existsSync(routeTreePath)) return false;
  return unapprovedApiV1Routes(listFiles(routeTreePath)).length > 0;
}
