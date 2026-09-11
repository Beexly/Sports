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
 * - When the factor breakdown carries no market fair, the immutable proof
 *   receipt's publish-time marketFairProb (same side, same market) is read
 *   instead (2026-09-05; see receiptMarketFairProb).
 *
 * The hierarchy above (resolveLiveCalibrationP) is retired from the floors.
 * v5.2.8 Phase 2 scores resolveMarketAnchoredCalibrationP below: receipt first.
 */

import {
  emptyExclusionCounts,
  extractProvenPathProbs,
  isMoneylinePickType,
  receiptMarketFairProb,
  threeWayMoneylineExclusion,
  type CalibrationExclusionCounts,
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
  /** Immutable publish-time receipt; its marketFairProb backs up the factor breakdown. */
  readonly proofReceipt?: { readonly marketFairProb?: number | null } | null;
}): LiveCalPResolution {
  if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence)) {
    return null;
  }

  const fb = (input.factorBreakdown ?? null) as FactorBreakdownLike | null;
  const { pIndependent, marketP: fbMarketP } = extractProvenPathProbs(fb);
  const marketP = fbMarketP ?? receiptMarketFairProb(input.proofReceipt);
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
  readonly proofReceipt?: { readonly marketFairProb?: number | null } | null;
  readonly modelVersion?: string | null;
  readonly settledAt?: Date | null;
  /** Sport key (game.sport.key); drives the three-way moneyline exclusion. */
  readonly sportKey?: string | null;
  /**
   * WP-28 identity fields for the odds-table resolver
   * (publish-time-market-p-loader.ts). All optional: a pick without them is
   * never a recompute candidate and stays excluded as no_market_probability.
   */
  readonly id?: string | null;
  readonly gameId?: string | null;
  readonly generatedAt?: Date | null;
  readonly selection?: string | null;
  readonly homeTeamName?: string | null;
  readonly awayTeamName?: string | null;
  /**
   * C-298: the game's scheduled start. A pick generated at or after it was
   * priced in-play and is excluded from the eligibility sample (counted as
   * in_play). Absent means "cannot tell", and the row is kept: the exclusion
   * only ever removes rows it can prove are in-play.
   */
  readonly commenceTime?: Date | null;
};

/**
 * Source tags a resolver may attach to its probability. `resolver` is the
 * WP-28 odds-table recompute on at least MIN_BOOKMAKERS real books (reported
 * as pSources.market_p_from_odds_table); `resolver_single_book` is the C-110
 * single-book recompute (reported as pSources.market_p_single_book).
 */
export type MarketAnchoredResolverSource = "resolver" | "resolver_single_book";

export type ResolvedMarketP = {
  readonly p: number;
  readonly source: MarketAnchoredResolverSource;
};

/**
 * WP-28 hook: recompute a publish-time market probability for a pick that
 * carries none (no factor-breakdown market fair, no receipt). Injected by the
 * loader; the default resolver returns null so nothing is invented here. A
 * bare number is read as source `resolver`; a tagged result names its source.
 */
export type MarketProbabilityResolver = (pick: PickForLiveCal) => number | ResolvedMarketP | null;

export const NULL_MARKET_PROBABILITY_RESOLVER: MarketProbabilityResolver = () => null;

export type MarketAnchoredPSource = "proof_receipt" | "factor_breakdown" | MarketAnchoredResolverSource;

/**
 * Sample definition tag written on every metrics artifact and eligibility snap
 * (pBasis). The streak is counted under one tag only: changing the sample
 * definition changes the tag, and the basis-aware reset in
 * calibration-eligibility-durable.ts restarts the streak from 0.
 *   market_anchored     v5.2.8 Phase 2 (2026-09-05): receipts, factor-breakdown
 *                       fair for pre-receipt rows, odds-table recompute on two
 *                       or more books.
 *   market_anchored_v2  C-110 (2026-09-06): the same, plus single-book
 *                       publish-time market probabilities (market_p_single_book).
 *   market_anchored_v3  C-298 (2026-09-09): in-play rows excluded, and the
 *                       odds-table recompute at generatedAt is read FIRST;
 *                       the receipt and the factor breakdown are fallbacks for
 *                       rows the odds table cannot price. Measured on
 *                       production: on v5.2.7's pre-game rows the receipt's
 *                       marketFairProb sat 0.169 above the odds table at
 *                       generatedAt on average, 15 of 46 receipted rows more
 *                       than 0.15 off. The odds table is the source of truth
 *                       (CLAUDE.md, Prediction Engine Rules); the receipt is
 *                       a copy that has been shown to drift.
 *   market_anchored_v4  C-300 (2026-09-09): the floors score only rows the
 *                       odds table prices at generatedAt; receipt-only and
 *                       factor-breakdown-only rows are counted as
 *                       unverifiable_market_p (57 on the first v3 run).
 */
export const MARKET_ANCHORED_P_BASIS = "market_anchored_v4" as const;
export type MarketAnchoredPBasis = typeof MARKET_ANCHORED_P_BASIS;

export type MarketAnchoredPResolution = {
  readonly p: number;
  readonly source: MarketAnchoredPSource;
} | null;

/**
 * v5.2.8 Phase 2 (founder decision 2026-09-05): the eligibility floors are
 * measured on the market-anchored probability only, and on the publish-time
 * value of it. Order:
 *
 * 1. The proof receipt's marketFairProb. Minted once before kickoff from the
 *    same fairProb the scorer wrote (process-sport.ts, upsert update: {}), so
 *    it is the only value in the row that cannot change after publish. The
 *    founder-approved numbers (n 150 / 115, Brier 0.1692 / 0.1444) were
 *    measured on this column.
 * 2. The factor-breakdown market fair, only when no receipt exists. The
 *    factor breakdown is rewritten every ingestion cycle while the pick is
 *    PENDING and merged again after settlement (backfillIndependentTrueProb),
 *    so it is the last refresh, not the publish-time value; it is accepted
 *    here only for rows that predate receipts.
 * 3. The injectable resolver (WP-28 odds-table recompute at generatedAt; two
 *    or more books tagged `resolver`, one book tagged `resolver_single_book`).
 *
 * A pick with none is excluded; confidence/100 is never a fallback for the
 * floors. The synthetic coin flip 0.5 is rejected at every step.
 */
export function resolveMarketAnchoredCalibrationP(
  pick: PickForLiveCal,
  resolveMarketP: MarketProbabilityResolver = NULL_MARKET_PROBABILITY_RESOLVER,
): MarketAnchoredPResolution {
  // C-298 (2026-09-09): the odds table at generatedAt is read FIRST. The order
  // above (receipt first) was written on the premise that the receipt is
  // "minted once before kickoff from the same fairProb the scorer wrote". On
  // production it is not that number: across v5.2.7's pre-game moneyline rows
  // the receipt's marketFairProb averaged 0.169 above the odds table's
  // de-vigged consensus at generatedAt, and 15 of 46 receipted rows were more
  // than 0.15 off (read-only SQL, 2026-09-09 13:20 UTC). The append-only odds
  // table is the source of truth; the receipt and the factor breakdown remain
  // as fallbacks for rows the odds table cannot price, and every source is
  // still counted apart in bySource.
  const resolved = resolveMarketP(pick);
  if (resolved != null) {
    const resolvedP = typeof resolved === "number" ? resolved : resolved.p;
    const source: MarketAnchoredResolverSource =
      typeof resolved === "number" ? "resolver" : resolved.source;
    if (isRealMarketP(resolvedP)) return { p: clamp01(resolvedP), source };
  }
  const receiptP = receiptMarketFairProb(pick.proofReceipt);
  if (isRealMarketP(receiptP)) return { p: clamp01(receiptP), source: "proof_receipt" };
  const fb = (pick.factorBreakdown ?? null) as FactorBreakdownLike | null;
  const { marketP: fbMarketP } = extractProvenPathProbs(fb);
  if (isRealMarketP(fbMarketP)) return { p: clamp01(fbMarketP), source: "factor_breakdown" };
  return null;
}

/** C-298: true only when both timestamps are known and the pick was generated at or after kickoff. */
export function isInPlayPick(pick: Pick<PickForLiveCal, "generatedAt" | "commenceTime">): boolean {
  const g = pick.generatedAt?.getTime();
  const c = pick.commenceTime?.getTime();
  if (g == null || c == null || !Number.isFinite(g) || !Number.isFinite(c)) return false;
  return g >= c;
}

export type MarketAnchoredSample = {
  readonly p: number;
  readonly y: 0 | 1;
  readonly sportKey: string | null;
  readonly modelVersion: string | null;
  /** Pick market (MONEYLINE / SPREAD / TOTAL); drives the byMarket slice. */
  readonly pickType: string | null;
  /**
   * Settled time in unix ms, null when the row carries no settledAt.
   * C-297: the deployed-version map hold-out orders rows by this and drops
   * the ones that have none — a time split cannot place an undated row, and
   * guessing its position would manufacture the look-ahead the split exists
   * to prevent. Nothing the eligibility gate reads uses this field.
   */
  readonly settledAtMs: number | null;
};

/**
 * Sample-composition note carried on every artifact. Scope decision
 * (2026-09-05, delegated by the founder): the pooled floors sample is two-way
 * MONEYLINE only. SPREAD and TOTAL scorers also write marketFairProb (their
 * cover fair) and the receipt mint is pickType-agnostic, but cover
 * probabilities sit near 0.5, so their Brier is near 0.25 by construction and
 * pooling them into a 0.22 Brier floor would make the floor unreachable
 * regardless of skill. They are excluded as non_moneyline_market and counted;
 * their calibration is reported per market on the bake-off surface
 * (scoreBakeoffByMarket). This matches the numbers the founder approved on
 * 2026-09-05 (MONEYLINE only) and the public claim's scope.
 *
 * C-110 (2026-09-06, delegated): receipt-less picks whose game has exactly one
 * real book stored at or before generatedAt are included, scored on that one
 * book's de-vigged price, and tagged market_p_single_book so pSources and
 * bySource report them apart from the two-or-more-book recompute. The basis
 * tag moved to market_anchored_v2 so the streak restarted on this definition.
 */
export const MARKET_ANCHORED_SAMPLE_COMPOSITION_NOTE =
  "Sample composition: the pooled floors sample is two-way MONEYLINE only (scope decision 2026-09-05, delegated by the founder). Receipted SPREAD and TOTAL picks carry cover probabilities near 0.5, whose Brier sits near 0.25 by construction, so they are excluded from the pooled floors as non_moneyline_market and counted; their calibration is reported per market on the bake-off surface (scoreBakeoffByMarket). Three-way-sport moneylines are excluded as three_way_market. byMarket on this artifact therefore carries MONEYLINE only. Single-book market probabilities are included (C-110, decision 2026-09-06): a receipt-less pick whose game has exactly one real book stored at or before generatedAt is scored on that book's proportionally de-vigged price and tagged market_p_single_book, reported separately from market_p_from_odds_table (two or more books) in pSources and bySource; the streak basis is market_anchored_v2 for this sample definition.";

export type MarketAnchoredSampleBuild = {
  readonly samples: MarketAnchoredSample[];
  readonly included: number;
  readonly excluded: CalibrationExclusionCounts;
  readonly bySource: Record<string, number>;
  readonly modelVersions: string[];
  readonly settledFrom: string | null;
  readonly settledTo: string | null;
  readonly notes: string[];
};

/**
 * Eligibility sample: settled WIN/LOSS picks with a market-anchored p.
 * Three-way moneyline sports are excluded first (structural), then picks with
 * no market probability. Both are counted, never scored.
 */
export function picksToMarketAnchoredCalibrationSamples(
  picks: readonly PickForLiveCal[],
  options?: {
    readonly resolveMarketP?: MarketProbabilityResolver;
    /**
     * C-300: when true, a row whose probability came from the receipt or the
     * factor breakdown (the odds table could not price it at generatedAt) is
     * counted as unverifiable_market_p and not scored. The eligibility cron
     * sets this; other readers keep the fallback chain.
     */
    readonly verifiableOnly?: boolean;
  },
): MarketAnchoredSampleBuild {
  const resolveMarketP = options?.resolveMarketP ?? NULL_MARKET_PROBABILITY_RESOLVER;
  const verifiableOnly = options?.verifiableOnly === true;
  const samples: MarketAnchoredSample[] = [];
  const bySource: Record<string, number> = {};
  const excluded = emptyExclusionCounts();
  const versions = new Set<string>();
  let minT: number | null = null;
  let maxT: number | null = null;

  for (const pick of picks) {
    if (pick.result !== "WIN" && pick.result !== "LOSS") continue;

    // Scope decision (2026-09-05, delegated): the pooled floors sample is
    // two-way MONEYLINE only. See CalibrationExclusionReason in proven-path-rows.
    if (!isMoneylinePickType(pick.pickType)) {
      excluded.non_moneyline_market += 1;
      continue;
    }

    if (threeWayMoneylineExclusion({ pickType: pick.pickType, sportKey: pick.sportKey })) {
      excluded.three_way_market += 1;
      continue;
    }

    // C-298: a pick generated at or after kickoff was priced in-play. Its
    // "publish-time" probability is a live price that already encodes part of
    // the outcome, so scoring it is a look-ahead. Counted, never scored.
    if (isInPlayPick(pick)) {
      excluded.in_play += 1;
      continue;
    }

    const res = resolveMarketAnchoredCalibrationP(pick, resolveMarketP);
    if (!res) {
      excluded.no_market_probability += 1;
      continue;
    }

    // C-300: the eligibility floors score only a probability the append-only
    // odds table can reproduce at generatedAt. A row the resolver could not
    // price falls back to the receipt or the factor breakdown for every
    // OTHER reader of this function, but for the floors both are post-publish
    // values (receipt measured 0.169 above the odds table; factor breakdown
    // rewritten every cycle) and are counted, never scored.
    if (verifiableOnly && (res.source === "proof_receipt" || res.source === "factor_breakdown")) {
      excluded.unverifiable_market_p += 1;
      continue;
    }

    samples.push({
      p: res.p,
      y: pick.result === "WIN" ? 1 : 0,
      sportKey: pick.sportKey ?? null,
      modelVersion: pick.modelVersion ?? null,
      pickType: pick.pickType ?? null,
      settledAtMs: pick.settledAt ? pick.settledAt.getTime() : null,
    });
    bySource[res.source] = (bySource[res.source] ?? 0) + 1;
    if (pick.modelVersion) versions.add(pick.modelVersion);
    if (pick.settledAt) {
      const t = pick.settledAt.getTime();
      minT = minT == null ? t : Math.min(minT, t);
      maxT = maxT == null ? t : Math.max(maxT, t);
    }
  }

  const notes = [
    "Eligibility p (market_anchored_v3, C-298 2026-09-09): market-anchored probability only, publish-time value. Order: the injected resolver first (odds-table recompute at generatedAt; two or more books as resolver, one book as resolver_single_book), then the proof receipt marketFairProb, then the factor-breakdown market fair. The receipt was demoted after production showed it sitting 0.169 above the odds table at generatedAt on v5.2.7's pre-game rows. Picks generated at or after their game's commenceTime are excluded as in_play (their price is a live price). Synthetic 0.5 rejected. Confidence/100 is never scored for the floors.",
    `Included ${samples.length}; excluded three_way_market ${excluded.three_way_market}, no_market_probability ${excluded.no_market_probability}, non_moneyline_market ${excluded.non_moneyline_market}, in_play ${excluded.in_play}, unverifiable_market_p ${excluded.unverifiable_market_p} (C-300: receipt or factor-breakdown only, no odds-table price at generatedAt; counted, never scored). Sources: ${JSON.stringify(bySource)}.`,
    "Three-way moneyline sports (scoring.ts isThreeWayMoneylineSport) are a structural exclusion: the two-way de-vig drops the draw mass and the engine does not publish them.",
    MARKET_ANCHORED_SAMPLE_COMPOSITION_NOTE,
    "PROVEN still needs floors + streak + publish. PERFORMANCE_STATS untouched.",
  ];

  return {
    samples,
    included: samples.length,
    excluded,
    bySource,
    modelVersions: [...versions],
    settledFrom: minT == null ? null : new Date(minT).toISOString(),
    settledTo: maxT == null ? null : new Date(maxT).toISOString(),
    notes,
  };
}

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
      proofReceipt: pick.proofReceipt,
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
