/**
 * Pick-level sources aggregator.
 *
 * The master prompt Track 1 output spec lists `sources[]` as a top-level
 * peer of `pick / confidence / reasoning`. The data already exists nested
 * inside `factorBreakdown.factors[i].evidence.sourceName` — this helper
 * flattens it into the deduplicated, ACTIVE-only list a consumer wants.
 *
 * "ACTIVE-only" matters: a pick's sources should reflect what actually
 * drove the score. Shadow / blocked / missing signals stay auditable in
 * the factor breakdown but should never read as backing a pick.
 */

import type { FactorBreakdown } from "@sports/types";

interface PickWithFactors {
  readonly factorBreakdown: FactorBreakdown;
}

export function extractPickSources(
  pick: PickWithFactors
): readonly string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const factor of pick.factorBreakdown.factors ?? []) {
    const evidence = factor.evidence;
    if (!evidence) continue;
    if (evidence.activationStatus !== "ACTIVE") continue;
    if (evidence.freshnessStatus === "MISSING") continue;

    const sourceName = evidence.sourceName;
    if (!sourceName) continue;
    if (seen.has(sourceName)) continue;

    seen.add(sourceName);
    ordered.push(sourceName);
  }

  return Object.freeze(ordered);
}
