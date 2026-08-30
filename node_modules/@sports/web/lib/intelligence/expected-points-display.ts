/**
 * Expected Points (xFP) — the CUSTOMER-DISPLAY boundary. Fail-closed rights gate.
 *
 * The xFP dataset is ffverse ffopportunity, licensed CC-BY-SA-4.0 (share-alike):
 * the license class this platform excludes for customer-facing derivatives while
 * the share-alike question is open. The `ffverse-ffopportunity` registry entry
 * therefore keeps commercial_display_allowed=false, and EVERY surface that would
 * show xFP to customers — the public /intelligence/engines board and the
 * Pro/Elite /api/intelligence/expected-points route — must load through
 * `loadExpectedPointsForDisplay()`: a REAL `checkClearance()` call with the TRUE
 * intent (`commercial_display`), run at the display boundary. A block (which the
 * registry produces by design today) returns the honest rights-gated payload in
 * the same source-error shape every board already renders honestly, and never
 * fetches. Fail closed: no clearance, no data, no fabrication.
 *
 * Internal/owner surfaces (the graded pool's `includeXfp` opt-in, the gated
 * weekly model) keep calling `loadExpectedPoints()` directly with internal
 * intents, which the registry clears.
 *
 * UNLOCK PATHS (any one re-opens these surfaces):
 *   1. Legal review concluding CC-BY-SA-4.0 share-alike does not attach to our
 *      derived customer-facing outputs (then flip the registry entry).
 *   2. Written permission / an alternate license from ffverse.
 *   3. A replacement basis: our own gse-ep-v1 expected-points engine (merged in
 *      #115) is the planned CC-BY-4.0 substitute for these customer surfaces.
 */

import { checkClearance, type ClearanceResult } from "@/lib/scraping/clearance-engine";
import { getSourceRightsEntry } from "@/lib/scraping/source-rights-registry";
import { loadExpectedPoints, type ExpectedPoints } from "./expected-points";

type LoadExpectedPointsOptions = NonNullable<Parameters<typeof loadExpectedPoints>[0]>;

/**
 * The TRUE clearance request for showing xFP to customers. Unlike the loader's
 * internal-intents request, this one declares `commercial_display` — so the
 * registry's share-alike posture actually decides the outcome instead of being
 * bypassed by an internal-only intent list.
 */
export function checkExpectedPointsDisplayClearance(): ClearanceResult {
  return checkClearance({
    source_id: "ffverse-ffopportunity",
    mode: "open_dataset_ingest",
    tool_id: "fetch-native",
    intents: ["commercial_display", "storage", "derived_analytics"],
  });
}

/**
 * Registry attribution, resolved locally (not imported from expected-points.ts)
 * so this boundary keeps working even where that module is test-mocked.
 */
function ffOpportunityAttribution(): string {
  return (
    getSourceRightsEntry("ffverse-ffopportunity")?.attribution_text ??
    "Expected points data from ffverse/ffopportunity (CC-BY-SA-4.0)"
  );
}

/**
 * The honest rights-gated payload: the standard source-error shape (so every
 * consumer's existing honest-empty rendering applies) plus `rightsGated: true`
 * so surfaces can say WHY. No rows, no fetch, no fabricated data, and no
 * promises of when it returns.
 */
export function rightsGatedExpectedPoints(clearance: ClearanceResult): ExpectedPoints {
  const codes = clearance.blocks.map((b) => b.code).join(", ") || "COMMERCIAL_DISPLAY_NOT_ALLOWED";
  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    rightsGated: true,
    season: 0,
    throughWeek: null,
    sourceRows: 0,
    rows: [],
    record: null,
    canPublishProjections: false,
    attribution: ffOpportunityAttribution(),
    note:
      "Expected points (ffverse/ffopportunity) is licensed CC-BY-SA-4.0 (share-alike), " +
      "which is not cleared for customer display while the share-alike question is open. " +
      "This surface stays intentionally empty rather than showing data we do not hold display rights for.",
    sourceUrl: "https://github.com/ffverse/ffopportunity",
    error: `rights-gated: ${codes}`,
  };
}

/**
 * Load xFP for a customer-facing surface. Clearance first, fail closed: a block
 * returns the rights-gated payload WITHOUT fetching; only a granted clearance
 * delegates to the real loader.
 */
export async function loadExpectedPointsForDisplay(
  opts: LoadExpectedPointsOptions = {},
): Promise<ExpectedPoints> {
  const clearance = checkExpectedPointsDisplayClearance();
  if (!clearance.allowed) return rightsGatedExpectedPoints(clearance);
  return loadExpectedPoints(opts);
}
