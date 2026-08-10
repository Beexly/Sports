/**
 * Resolve the probability used for LIVE eligibility (Brier/ECE/Murphy floors).
 *
 * Hard law (2026-08-10 RES unlock):
 * - Prefer **priced independent trueProb** when present (absolute model forecast).
 *   Market-first was killing Murphy RES (book fair ≈ efficient → RES≈0) and
 *   blocked measuring whether independents separate outcomes.
 * - Else marketFairProb (book de-vig for the chosen side) when real and finite.
 * - MONEYLINE may fall back to confidence/100 (composite — documented).
 * - SPREAD/TOTAL without market/independent fair ABSENT from absolute floors
 *   (confidence is a rank score, not a fair probability — measuring it as p
 *   invents overconfidence and blocks PROVEN dishonestly).
 * - Never invent p. Never apply maps here.
 * - Never treat synthetic marketFairProb=0.5 (backfill default) as a real book.
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

/** Real book fair only — drop synthetic coin-flip 0.5 that shadows trueProb. */
function isRealMarketP(p: number | null): p is number {
  if (p == null || !Number.isFinite(p) || p <= 0 || p >= 1) return false;
  // Exact 0.5 is almost always our backfill/signal-slate neutral default, not a book.
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

  // Independent model probability first — drives Murphy RES / ranking power.
  if (pIndependent != null && pIndependent > 0 && pIndependent < 1) {
    return { p: clamp01(pIndependent), source: "independent_trueProb" };
  }

  // Real book fair (never synthetic 0.5)
  if (isRealMarketP(marketP)) {
    return { p: clamp01(marketP), source: "marketFairProb" };
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
    "Live eligibility p: prefer independent trueProb → real marketFairProb → MONEYLINE confidence/100.",
    "Synthetic marketFairProb=0.5 ignored (backfill neutral — not a book). SPREAD/TOTAL without fair p excluded.",
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
