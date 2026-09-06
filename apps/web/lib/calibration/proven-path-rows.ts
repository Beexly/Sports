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

import { isThreeWayMoneylineSport } from "@sports/prediction-engine";
import type { ProvenPathPickRow } from "@/lib/calibration/proven-path-engine";

/**
 * Why a settled WIN/LOSS pick is left out of the calibration sample. Every
 * loader that drops a row reports the count under one of these keys.
 *
 * - three_way_market: a MONEYLINE pick on a sport whose moneyline has three
 *   outcomes (scoring.ts isThreeWayMoneylineSport). The two-way de-vig drops
 *   the draw mass, so its probability is wrong by construction and the engine
 *   already refuses to publish these. Structural exclusion, not a filter.
 * - no_market_probability: no market-anchored probability exists for the pick
 *   (no factor-breakdown market fair, no receipt marketFairProb, resolver
 *   returned null). Such a pick is never scored on confidence/100 for the
 *   floors (v5.2.8 Phase 2, 2026-09-05).
 * - non_moneyline_market: a SPREAD or TOTAL pick. Scope decision (2026-09-05,
 *   delegated by the founder): the pooled floors sample is two-way MONEYLINE
 *   only. Cover probabilities sit near 0.5, so their Brier is near 0.25 by
 *   construction and pooling them into a 0.22 floor would make the floor
 *   unreachable regardless of skill. Their calibration is reported per market
 *   on the bake-off surface instead (scoreBakeoffByMarket).
 */
export type CalibrationExclusionReason =
  | "three_way_market"
  | "no_market_probability"
  | "non_moneyline_market";

export type CalibrationExclusionCounts = Readonly<Record<CalibrationExclusionReason, number>>;

export function emptyExclusionCounts(): Record<CalibrationExclusionReason, number> {
  return { three_way_market: 0, no_market_probability: 0, non_moneyline_market: 0 };
}

/** Pick types that carry a moneyline probability claim on one side. */
export function isMoneylinePickType(pickType: string | null | undefined): boolean {
  const market = (pickType ?? "").toUpperCase();
  return market === "MONEYLINE" || market === "H2H" || market === "ML";
}

/**
 * Structural exclusion: a settled MONEYLINE pick on a three-way moneyline
 * sport. Spreads and totals on the same sport settle on goals and are kept.
 * Uses the engine's own helper; there is no second sport list here.
 */
export function threeWayMoneylineExclusion(pick: {
  readonly pickType?: string | null;
  readonly sportKey?: string | null;
}): "three_way_market" | null {
  if (!isMoneylinePickType(pick.pickType)) return null;
  const sportKey = pick.sportKey ?? "";
  if (sportKey.length === 0) return null;
  return isThreeWayMoneylineSport(sportKey) ? "three_way_market" : null;
}

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
  // Three-way moneyline sports never enter the bake-off rows either: every
  // score kind (confidence included) would be graded against a draw-as-loss
  // outcome its probability never priced.
  if (threeWayMoneylineExclusion({ pickType: pick.pickType, sportKey: pick.game?.sport?.key ?? null })) {
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

export type ProvenPathRowsReport = {
  readonly rows: ProvenPathPickRow[];
  /** Settled WIN/LOSS picks dropped by structural exclusion, by reason. */
  readonly excluded: CalibrationExclusionCounts;
};

/**
 * Rows plus the exclusion count. The bake-off rows keep every pick that has a
 * confidence (the comparison surface still shows confidence for transparency),
 * so `no_market_probability` is always 0 here; it is counted by the
 * eligibility sample builder (live-calibration-p.ts) instead.
 */
export function toProvenPathPickRowsReport(
  picks: readonly SettledPickForProvenPath[],
): ProvenPathRowsReport {
  const rows: ProvenPathPickRow[] = [];
  const excluded = emptyExclusionCounts();
  for (const pick of picks) {
    if (pick.result !== "WIN" && pick.result !== "LOSS") continue;
    if (threeWayMoneylineExclusion({ pickType: pick.pickType, sportKey: pick.game?.sport?.key ?? null })) {
      excluded.three_way_market += 1;
      continue;
    }
    const row = toProvenPathPickRow(pick);
    if (row) rows.push(row);
  }
  return { rows, excluded };
}

export function toProvenPathPickRows(
  picks: readonly SettledPickForProvenPath[],
): ProvenPathPickRow[] {
  return toProvenPathPickRowsReport(picks).rows;
}
