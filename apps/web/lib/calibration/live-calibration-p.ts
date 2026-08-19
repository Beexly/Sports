/**
 * Resolve the probability used for LIVE eligibility (Brier/ECE/Murphy floors).
 *
 * Hard law (2026-08-10 → v5.2.6):
 * - Prefer **priced independent trueProb** when present (absolute model forecast).
 * - Fixed evidence shrink toward 0.5 (α=0.88) — model definition, not fitted map.
 * - When real book marketFair exists: market-anchored blend (0.55 shrunk-indep + 0.45 market)
 *   — cuts Brier when independents are noisy vs efficient books; keeps residual RES.
 * - Else blend toward confidence only when conf ≠ independent echo.
 * - MONEYLINE may fall back to confidence/100.
 * - SPREAD/TOTAL without fair p ABSENT from absolute floors.
 * - Never invent p. Never apply fitted maps here.
 * - Never treat synthetic marketFairProb=0.5 as a real book.
 */

import {
  extractProvenPathProbs,
  type FactorBreakdownLike,
} from "@/lib/calibration/proven-path-rows";

export type LiveCalPSource =
  | "marketFairProb"
  | "independent_trueProb"
  | "blend_indep_conf"
  | "blend_indep_market"
  | "confidence_moneyline"
  | "excluded_non_prob_market";

export type LiveCalPResolution = {
  readonly p: number;
  readonly source: LiveCalPSource;
} | null;

/** Evidence shrink toward coin-flip — fixed model prior, not holdout-fitted map. */
export const INDEPENDENT_EVIDENCE_SHRINK = 0.88;
/** Weight on shrunk independent when real market fair exists. */
export const MARKET_ANCHOR_INDEP_WEIGHT = 0.55;

function clamp01(p: number): number {
  return Math.min(1 - 1e-9, Math.max(1e-9, p));
}

function shrinkIndependent(p: number, alpha = INDEPENDENT_EVIDENCE_SHRINK): number {
  return clamp01(0.5 + (p - 0.5) * alpha);
}

/** Real book fair only — drop synthetic coin-flip 0.5 that shadows trueProb. */
function isRealMarketP(p: number | null): p is number {
  if (p == null || !Number.isFinite(p) || p <= 0 || p >= 1) return false;
  if (Math.abs(p - 0.5) < 1e-9) return false;
  return true;
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
  const confP = clamp01(input.confidence / 100);

  if (pIndependent != null && pIndependent > 0 && pIndependent < 1) {
    const shrunk = shrinkIndependent(pIndependent);

    // Real book fair: market-anchored blend (Brier lever vs pure independent overfit).
    if (isRealMarketP(marketP)) {
      const p = clamp01(
        MARKET_ANCHOR_INDEP_WEIGHT * shrunk +
          (1 - MARKET_ANCHOR_INDEP_WEIGHT) * marketP,
      );
      return { p, source: "blend_indep_market" };
    }

    // Confidence only helps when it is not a pure trueProb echo (signal slate).
    if (Math.abs(confP - pIndependent) >= 0.03) {
      const p = clamp01(0.7 * shrunk + 0.3 * confP);
      return { p, source: "blend_indep_conf" };
    }

    return { p: shrunk, source: "independent_trueProb" };
  }

  if (isRealMarketP(marketP)) {
    return { p: clamp01(marketP), source: "marketFairProb" };
  }

  const market = (input.pickType ?? "").toUpperCase();
  if (market === "MONEYLINE" || market === "" || market === "UNKNOWN") {
    return { p: confP, source: "confidence_moneyline" };
  }

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
    "Live eligibility p: shrunk independent (α=0.88) → market-anchored blend when real book fair → conf blend when non-echo → MONEYLINE conf.",
    "Synthetic marketFairProb=0.5 ignored. SPREAD/TOTAL without fair p excluded. Maps OFF (no fitted Platt/isotonic).",
    `Included ${samples.length}; excluded non-prob markets ${excludedNonProb}. Sources: ${JSON.stringify(bySource)}.`,
    "PROVEN still needs floors + streak + publish. PERFORMANCE_STATS untouched.",
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
