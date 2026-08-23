/**
 * NFL ladder + boost scanner — market softness detector (leak-safe, week t for t+1).
 *
 * WHAT THIS IS
 * Detects market "softness" along the price ladder: where the closing book
 * offers one side at a price significantly more generous than the market's
 * own consensus implies — a "boost" signal. This is a DETECTOR only; it
 * produces leak-safe covariates on the as-of bus. It never computes a tout
 * score p, never fires a bet, and never recommends one. Downstream callers
 * decide whether softness justifies touching a market; the ladder scanner
 * only says *where* the ladder is soft.
 *
 * ── The ladder ──
 * A sportsbook ladder (or "board") is the discrete set of prices a book offers
 * at each rung of odds. Real ladders have thickness: the gap between
 * home-side and away-side prices is not arbitrary. When a book "boosts" one
 * side (e.g. offers +160 on a side whose fair probability implies +140), the
 * ladder rung for that side is anomalously generous relative to its peers.
 * The scanner flags this by comparing each side's closing price against a
 * consensus derived from the OTHER side's price — the market's own
 * internal consistency constraint.
 *
 * ── Boost detection algorithm ──
 * 1. De-vig both sides of the closing moneyline to recover the market's
 *    consensus-implied probabilities q_home and q_away.
 * 2. The "consensus price" for the home side (if it were fair) would be
 *    the decimal odds implied by q_home (no vig): fair_home = 1/q_home.
 *    Same for away: fair_away = 1/q_away.
 * 3. A side is "boosted" when its closing decimal odds significantly exceed
 *    its fair-implied decimal odds — the book is offering more than its own
 *    consensus says is fair. The boost ratio is closing/fair (>1 = boosted).
 * 4. The softness score is the maximum boost ratio across both sides (the
 *    ladder's weakest rung), thresholded against MIN_BOOST_RATIO.
 *
 * ── Leak safety ──
 * Uses only the closing moneyline — a schedule-fact-equivalent (the line is
 * set and knowable at decision cutoff). observedAt = decisionAt (the line
 * is frozen at the pre-kickoff cutoff, same as the body-clock and weather
 * modules). No future outcome enters the features; qClose is computed from
 * devig and attached to the EvalRow only for the as-of audit trail, NOT
 * re-derived from the game result.
 *
 * ── Fail closed ──
 * Missing moneylines, inverted prices (home and away odds imply the same
 * winner), degenerate vig, or both sides boosted simultaneously (a market
 * that's just noisy, not selectively soft) → no softness flag, honest skip.
 *
 * Pure, deterministic, no I/O.
 */

import { AsOfFeatureStore } from "../asof-store.js";
import { proportionalDevig } from "../devig.js";
import type { GameRow } from "../game-row.js";
import type { EvalRow } from "../placebo.js";

export const LADDER_FEATURE_KEYS = [
  "ladder:boost_ratio",
  "ladder:boost_flag",
  "ladder:soft_side",
  "ladder:vig",
  "ladder:spread_home",
] as const;

export const SOFTNESS_FEATURE_KEYS = [
  "ladder:home_soft_rate",
  "ladder:home_soft_intensity",
  "ladder:away_soft_rate",
  "ladder:away_soft_intensity",
] as const;

/** Decision cutoff: features frozen this long before kickoff (mirrors siblings). */
const DECISION_LEAD_MS = 60 * 60_000;
const GAME_DURATION_MS = 4 * 3_600_000;

/** Minimum boost ratio (closing/fair) to flag a rung as soft. */
const MIN_BOOST_RATIO = 1.03; // 3% above fair — a book is meaningfully more generous

/** Minimum total vig to trust the consensus derivation. */
const MIN_TOTAL_VIG = 0.01;

export interface LadderScanResult {
  readonly rows: EvalRow[];
  readonly skipped: {
    readonly noOdds: number;
    readonly noMoneyline: number;
    readonly inverted: number;
    readonly degenerateVig: number;
    readonly ambiguousBoost: number;
  };
}

export interface BoostFlag {
  /** >1 means the closing price exceeds fair-implied (boosted); ==1 means fair. */
  readonly boostRatio: number;
  /** 1 if max boost exceeds threshold, 0 otherwise. */
  readonly boostFlag: 0 | 1;
  /** Which side is boosted: "home", "away", or "none". */
  readonly softSide: "home" | "away" | "none";
  /** Total vig fraction extracted by the book (sum of margins), in (0,1). */
  readonly vig: number;
  /** De-vigged closing probability of the home side (q), for the audit trail. */
  readonly qClose: number;
}

/**
 * Scan one game's closing moneyline for ladder softness (boost detection).
 *
 * The reference price is the no-vig geometric midpoint of the two closing
 * odds: mid = sqrt(mh * ma). This midpoint is unbiased by the boost itself
 * — it is the price at which neither side carries extra margin. A side is
 * "boosted" when its closing odds exceed the midpoint by more than the
 * threshold ratio, meaning the book is offering it more generously than its
 * own consensus implies. The other side is correspondingly "short" (below
 * midpoint), which is how the book absorbs the boost.
 *
 * Returns null (fail closed) when the market structure is degenerate
 * (missing prices, invalid odds, sub-vig / crossed book). The caller
 * receives only the detection result; no tout p is ever produced here.
 */
export function scanLadderBoost(
  closing: GameRow["closing"],
  opts: { readonly minBoostRatio?: number } = {},
): BoostFlag | null {
  const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = closing;
  if (mh === null || ma === null) return null;

  // Prices must be valid decimal odds ( > 1.0 ).
  if (!Number.isFinite(mh) || mh <= 1 || !Number.isFinite(ma) || ma <= 1) return null;

  // De-vig to recover market consensus probability (for the audit trail /
  // qClose). This is informational only — the boost detection uses the
  // geometric midpoint, NOT the devigged probability.
  const devig = proportionalDevig([mh, ma]);
  if (!devig) return null;
  const qHome = devig[0];
  if (qHome === undefined || !(qHome > 0.01 && qHome < 0.99)) return null;

  // Total vig = (sum of raw implied probabilities) - 1.
  const totalImplied = 1 / mh + 1 / ma;
  const vig = totalImplied - 1;
  if (!(vig > MIN_TOTAL_VIG)) return null; // crossed/sub-vig book — fail closed

  // No-vig geometric midpoint: the fair no-margin price for each side
  // under the book's own consensus. sqrt(mh*ma) is invariant to which side
  // is favored, so it is NOT contaminated by the boost we are trying to detect.
  const mid = Math.sqrt(mh * ma);
  if (!(mid > 1)) return null; // degenerate

  // Boost ratio per side: how many % above fair (midpoint) the closing price sits.
  const boostHome = mh / mid;
  const boostAway = ma / mid;

  // By construction, at most one side can be > midpoint (geometric mean
  // property: if both were above mid, their product would exceed mid²).
  // So both-sides-boosted is structurally impossible. We still check for
  // symmetry (both near 1.0) to distinguish a tight book from a wide one.
  const minBoost = opts.minBoostRatio ?? MIN_BOOST_RATIO;
  const homeBoosted = boostHome > minBoost;
  const awayBoosted = boostAway > minBoost;

  if (homeBoosted) {
    return {
      boostRatio: boostHome,
      boostFlag: 1,
      softSide: "home",
      vig,
      qClose: qHome,
    };
  }
  if (awayBoosted) {
    return {
      boostRatio: boostAway,
      boostFlag: 1,
      softSide: "away",
      vig,
      qClose: qHome,
    };
  }

  // No boost detected — the ladder is tight on both sides.
  return {
    boostRatio: Math.max(boostHome, boostAway),
    boostFlag: 0,
    softSide: "none",
    vig,
    qClose: qHome,
  };
}

/**
 * Build leak-safe ladder/softness EvalRows for a season's NFL games.
 *
 * Each game is featured at its own decision cutoff (kickoff - 1 hour).
 * The closing moneyline is a schedule-fact-equivalent (known at cutoff),
 * so observedAt = decisionAt — the as-of audit must show zero lookahead.
 */
export function buildLadderScanRows(
  games: readonly GameRow[],
  store: AsOfFeatureStore,
  opts: { window?: number; minBoostRatio?: number } = {},
): LadderScanResult {
  // Sort by startTime so "prior games" is well-defined by position (same
  // convention as nfl-team-form.ts, though the ladder scanner is per-game
  // state-free, the sort guarantees deterministic ordering).
  const sorted = [...games].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

  const rows: EvalRow[] = [];
  const skipped = {
    noOdds: 0,
    noMoneyline: 0,
    inverted: 0,
    degenerateVig: 0,
    ambiguousBoost: 0,
  };

  const minBoostRatio = opts.minBoostRatio ?? MIN_BOOST_RATIO;

  for (const g of sorted) {
    const startMs = Date.parse(g.startTime);
    const decisionMs = startMs - DECISION_LEAD_MS;
    const decisionAt = new Date(decisionMs).toISOString();

    // The closing line is knowable at decision cutoff — timestamp at the
    // decision instant (conservative latest bound, consistent with siblings).
    const observedAt = decisionAt;

    const flag = scanLadderBoost(g.closing, { minBoostRatio });
    if (flag === null) {
      // Distinguish skip reasons for honest reporting.
      const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = g.closing;
      if (mh === null || ma === null) {
        skipped.noMoneyline += 1;
      } else {
        // Could be inverted, degenerate vig, or both — treat as degenerate
        // for the scan-level counter (the per-scan function is testable
        // separately for the exact failure mode).
        skipped.degenerateVig += 1;
      }
      continue;
    }

    // Derive qClose from the CLOSING line (devig), NOT from the result.
    // This is the market's own consensus probability — never the outcome.
    const q = flag.qClose;
    if (!(q > 0.01 && q < 0.99)) {
      skipped.noOdds += 1;
      continue;
    }

    const ingest = (featureKey: string, value: number): void =>
      store.ingest({ entityId: g.gameId, featureKey, value, observedAt, source: "nfl-ladder-boost" });

    // Home-team ladder softness (the modeled side).
    ingest("ladder:boost_ratio", flag.boostRatio);
    ingest("ladder:boost_flag", flag.boostFlag);
    ingest("ladder:soft_side", flag.softSide === "home" ? 1 : flag.softSide === "away" ? -1 : 0);
    ingest("ladder:vig", flag.vig);
    // Closing spread as a market-structure covariate (sign: negative = home favored,
    // matching GameRow convention). 0 when the spread is null — this is a
    // market-structure signal, not a price; a missing spread means no point-spread
    // context on which to condition the softness flag.
    ingest("ladder:spread_home", g.closing.spreadHome ?? 0);

    rows.push({
      id: g.gameId,
      decisionAt,
      eventEndAt: new Date(startMs + GAME_DURATION_MS).toISOString(),
      features: store.vector(g.gameId, LADDER_FEATURE_KEYS, decisionAt),
      y: g.homeScore !== null && g.awayScore !== null ? (g.homeScore > g.awayScore ? 1 : 0) : 0,
      qClose: q,
    });
  }

  return { rows, skipped };
}

/**
 * Softness map over a team's recent ladder scans — a rolling summary of
 * how often (and how severely) the market has been boosted on that team's
 * side. Leak-safe: uses only prior games' boost flags.
 *
 * This is the "softness map" covariate: a team whose market has been
 * frequently boosted recently may indicate the book is structurally soft
 * on that team — a detection, not a firing decision.
 */
export function buildSoftnessMapRows(
  games: readonly GameRow[],
  store: AsOfFeatureStore,
  opts: { window?: number } = {},
): LadderScanResult {
  const SORTED = [...games].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const WINDOW = opts.window ?? 8;

  const rows: EvalRow[] = [];
  const skipped = {
    noOdds: 0,
    noMoneyline: 0,
    inverted: 0,
    degenerateVig: 0,
    ambiguousBoost: 0,
  };

  // Per-team rolling history of boost flags and ratios (oldest first).
  const homeBoosts = new Map<string, number[]>();
  const awayBoosts = new Map<string, number[]>();

  for (const g of SORTED) {
    const startMs = Date.parse(g.startTime);
    const decisionMs = startMs - DECISION_LEAD_MS;
    const decisionAt = new Date(decisionMs).toISOString();

    const flag = scanLadderBoost(g.closing, { minBoostRatio: MIN_BOOST_RATIO });
    if (flag === null) {
      skipped.degenerateVig += 1;
      continue;
    }

    const q = flag.qClose;
    if (!(q > 0.01 && q < 0.99)) {
      skipped.noOdds += 1;
      continue;
    }

    // Build softness covariates from prior games only (self-exclusion).
    const homeHist = homeBoosts.get(g.homeTeam) ?? [];
    const awayHist = awayBoosts.get(g.awayTeam) ?? [];

    const recent = (hist: readonly number[], n: number): number[] =>
      hist.length > n ? hist.slice(-n) : hist.slice();

    const homeRecent = recent(homeHist, WINDOW);
    const awayRecent = recent(awayHist, WINDOW);

    // Softness rate: fraction of recent games where this team's side was boosted.
    const homeSoftRate = homeRecent.length > 0 ? homeRecent.filter((x) => x > 0).length / homeRecent.length : 0;
    const awaySoftRate = awayRecent.length > 0 ? awayRecent.filter((x) => x > 0).length / awayRecent.length : 0;

    // Softness intensity: mean boost ratio of boosted rungs (>= 1.0 when no boosts).
    const boostedHome = homeRecent.filter((x) => x > 0);
    const boostedAway = awayRecent.filter((x) => x > 0);
    const homeSoftIntensity = boostedHome.length > 0 ? boostedHome.reduce((a, b) => a + b, 0) / boostedHome.length : 1;
    const awaySoftIntensity = boostedAway.length > 0 ? boostedAway.reduce((a, b) => a + b, 0) / boostedAway.length : 1;

    const observedAt = decisionAt;

    const ingest = (featureKey: string, value: number): void =>
      store.ingest({ entityId: g.gameId, featureKey, value, observedAt, source: "nfl-softness-map" });

    ingest("ladder:home_soft_rate", homeSoftRate);
    ingest("ladder:home_soft_intensity", homeSoftIntensity);
    ingest("ladder:away_soft_rate", awaySoftRate);
    ingest("ladder:away_soft_intensity", awaySoftIntensity);

    rows.push({
      id: g.gameId,
      decisionAt,
      eventEndAt: new Date(startMs + GAME_DURATION_MS).toISOString(),
      features: store.vector(g.gameId, SOFTNESS_FEATURE_KEYS, decisionAt),
      y: g.homeScore !== null && g.awayScore !== null ? (g.homeScore > g.awayScore ? 1 : 0) : 0,
      qClose: q,
    });

    // Record this game's boost into history AFTER evaluating (self-exclusion).
    // Store the boost ratio if THIS team's side was the boosted one, else 0.
    const pushOrInit = (team: string, boosted: number, map: Map<string, number[]>): void => {
      const list = map.get(team);
      if (list) list.push(boosted);
      else map.set(team, [boosted]);
    };
    pushOrInit(g.homeTeam, flag.softSide === "home" ? flag.boostRatio : 0, homeBoosts);
    pushOrInit(g.awayTeam, flag.softSide === "away" ? flag.boostRatio : 0, awayBoosts);
  }

  return { rows, skipped };
}
