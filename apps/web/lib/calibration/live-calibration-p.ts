/**
 * Resolve the probability used for LIVE eligibility (Brier/ECE floors).
 *
 * Hard law:
 * - Prefer marketFairProb (book de-vig for the chosen side) when persisted.
 * - Prefer independent trueProb when priced (absolute forecast).
 * - MONEYLINE may fall back to confidence/100 (composite — documented).
 * - SPREAD/TOTAL without market/independent fair ABSENT from absolute floors
 *   (confidence is a rank score, not a fair probability — measuring it as p
 *   invents overconfidence and blocks PROVEN dishonestly).
 * - Never invent p. Never apply maps here.
 */

import {
  extractProvenPathProbs,
  type FactorBreakdownLike,
} from "@/lib/calibration/proven-path-rows";

export type LiveCalPSource =
  | "marketFairProb"
  | "independent_trueProb"
  | "confidence_moneyline"
  | "excluded_non_prob_market";

export type LiveCalPResolution = {
  readonly p: number;
  readonly source: LiveCalPSource;
} | null;

function clamp01(p: number): number {
  return Math.min(1 - 1e-9, Math.max(1e-9, p));
}

export function resolveLiveCalibrationP(input: {
  readonly confidence: number;
  readonly pickType?: string | null;
  readonly factorBreakdown?: unknown;
}): LiveCalPResolution {
  if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence)) {
    return null;
  }

  const fb = (input.factorBreakdown ?? null) as FactorBreakdownLike | null;
  const { pIndependent, marketP } = extractProvenPathProbs(fb);

  // Absolute market-fair first (honest book-side probability)
  if (marketP != null && marketP > 0 && marketP < 1) {
    return { p: clamp01(marketP), source: "marketFairProb" };
  }

  // Independent model probability when present
  if (pIndependent != null && pIndependent > 0 && pIndependent < 1) {
    return { p: clamp01(pIndependent), source: "independent_trueProb" };
  }

  const market = (input.pickType ?? "").toUpperCase();
  // MONEYLINE: confidence is partially price-linked; still provisional
  if (market === "MONEYLINE" || market === "" || market === "UNKNOWN") {
    const p = clamp01(input.confidence / 100);
    return { p, source: "confidence_moneyline" };
  }

  // SPREAD / TOTAL without fair p — exclude from absolute calibration floors
  return null;
}

export type PickForLiveCal = {
  readonly confidence: number | null;
  readonly result: "WIN" | "LOSS" | string;
  readonly pickType?: string | null;
  readonly factorBreakdown?: unknown;
  readonly modelVersion?: string | null;
  readonly settledAt?: Date | null;
};

/**
 * Build live eligibility samples with honest p resolution + exclusion counts.
 */
export function picksToHonestCalibrationSamples(picks: readonly PickForLiveCal[]): {
  readonly samples: { p: number; y: 0 | 1 }[];
  readonly included: number;
  readonly excludedNonProb: number;
  readonly bySource: Record<string, number>;
  readonly modelVersions: string[];
  readonly settledFrom: string | null;
  readonly settledTo: string | null;
  readonly notes: string[];
} {
  const samples: { p: number; y: 0 | 1 }[] = [];
  const bySource: Record<string, number> = {};
  const versions = new Set<string>();
  let excludedNonProb = 0;
  let minT: number | null = null;
  let maxT: number | null = null;

  for (const pick of picks) {
    if (pick.result !== "WIN" && pick.result !== "LOSS") continue;
    if (typeof pick.confidence !== "number" || !Number.isFinite(pick.confidence)) continue;

    const res = resolveLiveCalibrationP({
      confidence: pick.confidence,
      pickType: pick.pickType,
      factorBreakdown: pick.factorBreakdown,
    });

    if (!res) {
      excludedNonProb += 1;
      bySource["excluded_non_prob_market"] =
        (bySource["excluded_non_prob_market"] ?? 0) + 1;
      continue;
    }

    samples.push({ p: res.p, y: pick.result === "WIN" ? 1 : 0 });
    bySource[res.source] = (bySource[res.source] ?? 0) + 1;
    if (pick.modelVersion) versions.add(pick.modelVersion);
    if (pick.settledAt) {
      const t = pick.settledAt.getTime();
      minT = minT == null ? t : Math.min(minT, t);
      maxT = maxT == null ? t : Math.max(maxT, t);
    }
  }

  const notes = [
    "Live eligibility p: prefer marketFairProb → independent trueProb → MONEYLINE confidence/100.",
    "SPREAD/TOTAL without fair p excluded from absolute Brier/ECE floors (rank scores ≠ probabilities).",
    `Included ${samples.length}; excluded non-prob markets ${excludedNonProb}. Sources: ${JSON.stringify(bySource)}.`,
    "Maps OFF — no isotonic/platt rewrite of live p. PROVEN still needs floors + streak + publish.",
  ];

  return {
    samples,
    included: samples.length,
    excludedNonProb,
    bySource,
    modelVersions: [...versions],
    settledFrom: minT == null ? null : new Date(minT).toISOString(),
    settledTo: maxT == null ? null : new Date(maxT).toISOString(),
    notes,
  };
}
