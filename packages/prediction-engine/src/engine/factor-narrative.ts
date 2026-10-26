/**
 * Factor narrative — renders the engine's OWN weighted factor trail into prose.
 *
 * THE PROBLEM THIS FIXES. Every published pick already stores a `factors` array
 * carrying name, impact, weight and a description ("Bookmaker Consensus, weight
 * 30, 100% of bookmakers align on this side"). All 4,572 rows measured 2026-10-23
 * carry it. The reasoning sentence mentioned NONE of it: it was a market echo
 * built from the same numbers the factors describe, so the actual reasoning behind
 * the equations was computed, weighted, stored — and then not rendered.
 *
 * WHAT COUNTS AS A REASON. A factor with a non-zero weight that is not neutral.
 * Weight-0 entries are decoys and evidence-carriers: they belong in the payload,
 * not in the sentence, because citing them says "this did not move the number".
 *
 * SHADOW TIER. Nine signal families currently arrive as weight-0 "Shadow ..." with
 * the boilerplate "tracked in shadow mode only; no licensed context provider is
 * configured". They are not dropped silently. They appear once, collapsed, as
 * "Also watching (no weight yet): Pace, Officials, Venue Environment". When a
 * real provider lands, its description replaces the boilerplate and it can earn
 * weight.
 */

import type { FactorDetail } from "@sports/types";

/** Minimum weight to appear as a reason. Below this the factor is noise on a sentence. */
export const MIN_NARRATED_WEIGHT = 5;

/** How many reasons a single sentence may carry. */
export const MAX_NARRATED_FACTORS = 3;

/** Descriptions are truncated at a clause boundary to keep the sentence readable. */
export const MAX_DESCRIPTION_CHARS = 110;

const BOILERPLATE = /shadow mode only|no licensed context provider|not configured|no confirmed/i;

export interface NarratedFactor {
  readonly name: string;
  readonly impact: "positive" | "negative" | "neutral";
  readonly weight: number;
  readonly claim: string;
}

export function trimClaim(description: string): string {
  const withoutAside = description.split(" (")[0]!.trim();
  const base = withoutAside.length > MAX_DESCRIPTION_CHARS ? withoutAside.slice(0, MAX_DESCRIPTION_CHARS) : withoutAside;
  if (base.length < withoutAside.length) {
    const cut = base.replace(/[,;:\s]+\S*$/, "").trim();
    return cut.length > 20 ? cut : base.trim();
  }
  return base.replace(/[.;,]+$/, "");
}

export function narrateFactors(factors: readonly FactorDetail[]): NarratedFactor[] {
  return factors
    .filter((f) => f.impact !== "neutral" && Math.abs(f.weight) >= MIN_NARRATED_WEIGHT)
    .filter((f) => typeof f.description === "string" && f.description.trim().length > 0)
    .slice()
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, MAX_NARRATED_FACTORS)
    .map((f) => ({
      name: f.name,
      impact: f.impact,
      weight: f.weight,
      claim: trimClaim(f.description),
    }));
}

/** Compact list of weight-0 / shadow signals. Boilerplate descriptions are reduced to the name. */
export function watchedSignals(factors: readonly FactorDetail[]): string[] {
  const names = new Set<string>();
  for (const f of factors) {
    if (Math.abs(f.weight) >= MIN_NARRATED_WEIGHT && f.impact !== "neutral") continue;
    const name = f.name.replace(/^Shadow\s+/i, "").trim();
    if (name) names.add(name);
  }
  return Array.from(names).slice(0, 6);
}

export function factorNarrative(factors: readonly FactorDetail[]): string {
  const reasons = narrateFactors(factors);
  const watching = watchedSignals(factors);

  const why = reasons.length === 0
    ? ""
    : " Why: " + reasons.map((r) => {
        const sign = r.impact === "negative" ? "headwind" : "";
        return `${r.claim} (${r.name}, w${Math.abs(r.weight)}${sign ? ", " + sign : ""})`;
      }).join("; ") + ".";

  const watch = watching.length === 0
    ? ""
    : ` Also watching (no weight yet): ${watching.join(", ")}.`;

  return why + watch;
}

export function factorHeadline(factors: readonly FactorDetail[]): string | null {
  const top = narrateFactors(factors)[0];
  return top ? `${top.claim} (${top.name})` : null;
}
