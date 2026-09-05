/**
 * Shared proven-path row extraction from pick factorBreakdown.
 *
 * RANKING LOAD LAW (hard):
 *   pIndependent = raw independent trueProb only.
 *   NEVER assign confidence-sourced rankingP to pIndependent
 *     (collapses independent bake-off into market-echo).
 *   NEVER assign already-blended rankingP to pIndependent
 *     (double-blends in blend_indep_conf kind).
 *   marketP = de-vig market fair for the side when persisted.
 *   rankingP = stored sort key (may equal conf); diagnostic + selective only.
 */

import type { ProvenPathPickRow } from "@/lib/calibration/proven-path-engine";

export type FactorBreakdownLike = {
  readonly rankingP?: number | null;
  readonly rankingSource?: string | null;
  readonly fairProbability?: number | null;
  readonly marketFairProb?: number | null;
  readonly independentEdge?: {
    readonly trueProb?: number | null;
    readonly priced?: boolean | null;
    readonly marketFairProb?: number | null;
    readonly decision?: string | null;
  } | null;
};

function clamp01(p: number): number {
  return Math.min(1, Math.max(0, p));
}

function finiteUnit(p: unknown): number | null {
  if (typeof p !== "number" || !Number.isFinite(p)) return null;
  if (p <= 0 || p >= 1) return null;
  return clamp01(p);
}

/**
 * Extract independent trueProb + market fair + stored rankingP from FB.
 * pIndependent is ONLY true model probability — never confidence echo.
 */
export function extractProvenPathProbs(fb: FactorBreakdownLike | null | undefined): {
  readonly pIndependent: number | null;
  readonly marketP: number | null;
  readonly rankingP: number | null;
  readonly rankingSource: string | null;
} {
  const rankingSource =
    typeof fb?.rankingSource === "string" && fb.rankingSource.length > 0
      ? fb.rankingSource
      : null;

  // Raw independent trueProb (preferred for independent_trueProb bake-off kind).
  let pIndependent: number | null = finiteUnit(fb?.independentEdge?.trueProb ?? null);

  // Only pure independent rankingP when source is independent_trueProb
  // (not blend — that already mixed confidence).
  if (pIndependent == null && rankingSource === "independent_trueProb") {
    pIndependent = finiteUnit(fb?.rankingP ?? null);
  }
  // priced fairProbability when independents drove ranking (pure path)
  if (
    pIndependent == null &&
    fb?.independentEdge?.priced === true &&
    rankingSource === "independent_trueProb"
  ) {
    pIndependent = finiteUnit(fb?.fairProbability ?? null);
  }

  const marketP =
    finiteUnit(fb?.independentEdge?.marketFairProb ?? null) ??
    finiteUnit(fb?.marketFairProb ?? null);

  const rankingP = finiteUnit(fb?.rankingP ?? null);

  return { pIndependent, marketP, rankingP, rankingSource };
}

/**
 * The lock-time market probability committed to the immutable proof receipt
 * (PickProofReceipt.marketFairProb, minted in process-sport.ts from the same
 * `fairProb` the scorer writes into factorBreakdown.marketFairProb, so the two
 * describe the same side of the same market). Read as a fallback when the
 * factor breakdown carries none: rows from before v5.2.1 never persisted it
 * there, and until 2026-09-05 the signal slate overwrote book-priced moneyline
 * rows with marketFairProb null while their receipt kept the real value (live
 * bake-off coverage for the market score fell to 34%). Rejects the synthetic
 * coin-flip 0.5 exactly as the live eligibility resolver does.
 */
export function receiptMarketFairProb(
  receipt: { readonly marketFairProb?: number | null } | null | undefined,
): number | null {
  const p = receipt?.marketFairProb;
  if (typeof p !== "number" || !Number.isFinite(p) || p <= 0 || p >= 1) return null;
  if (Math.abs(p - 0.5) < 1e-9) return null;
  return p;
}

export type SettledPickForProvenPath = {
  readonly confidence: number;
  readonly result: "WIN" | "LOSS" | string;
  readonly pickType?: string | null;
  readonly factorBreakdown?: unknown;
  /** Immutable lock-time receipt; its marketFairProb backs up the factor breakdown. */
  readonly proofReceipt?: { readonly marketFairProb?: number | null } | null;
  readonly game?: {
    readonly sport?: { readonly key?: string | null; readonly name?: string | null } | null;
  } | null;
};

/** Map a settled pick row → ProvenPathPickRow (or null if ineligible). */
export function toProvenPathPickRow(
  pick: SettledPickForProvenPath,
): ProvenPathPickRow | null {
  if (pick.result !== "WIN" && pick.result !== "LOSS") return null;
  if (typeof pick.confidence !== "number" || !Number.isFinite(pick.confidence)) {
    return null;
  }
  const pConfidence = clamp01(pick.confidence / 100);
  const fb = (pick.factorBreakdown ?? null) as FactorBreakdownLike | null;
  const { pIndependent, marketP: fbMarketP } = extractProvenPathProbs(fb);
  const marketP = fbMarketP ?? receiptMarketFairProb(pick.proofReceipt);
  const sport =
    pick.game?.sport?.key ?? pick.game?.sport?.name ?? "unknown";
  const market = pick.pickType ?? "unknown";
  return {
    pConfidence,
    pEdge: null, // never edge-as-p
    pIndependent,
    y: (pick.result === "WIN" ? 1 : 0) as 0 | 1,
    groupKey: `${sport}|${market}`,
    marketP,
  };
}

export function toProvenPathPickRows(
  picks: readonly SettledPickForProvenPath[],
): ProvenPathPickRow[] {
  const out: ProvenPathPickRow[] = [];
  for (const pick of picks) {
    const row = toProvenPathPickRow(pick);
    if (row) out.push(row);
  }
  return out;
}
