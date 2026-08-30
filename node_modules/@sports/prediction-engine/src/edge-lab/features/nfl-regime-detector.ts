/**
 * NFL change-point / regime detector — leak-safe, week-t for t+1.
 *
 * WHAT THIS IS
 * A CUSUM-style change-point DETECTOR over each team's recent point-differential
 * run, run at the decision cutoff for game t+1 using ONLY weeks 1..t. It does
 * NOT predict the t+1 outcome; it detects whether the team's performance
 * distribution has shifted relative to its own recent baseline, and emits that
 * as a leak-safe covariate on the feature bus. The trials registry (§5) decides
 * whether the signal carries edge; this module only makes the candidate honest.
 *
 * LEAK SAFETY (enforced in code, same rails as the sibling NFL features)
 *   - Features for game t+1 are drawn ONLY from completed games strictly before
 *     the decision cutoff (kickoff - 1h). Same-week is never read.
 *   - The CUSUM is computed over a retrospective window that ends at the last
 *     game COMPLETED before the cutoff — never the featured game itself.
 *   - If no qualifying prior history exists (< minHistory games), the result is
 *     null / fail-closed. We do not impute. We do not invent.
 *   - Every observation is stamped observedAt = end of the LAST constituent
 *     game so the AsOfFeatureStore's audit tripwire genuinely covers these
 *     features.
 *
 * THE DETECTOR (two-sided CUSUM on standardized residuals)
 *   For a team's last `window` completed-game point differentials d_1..d_n:
 *     - baseline mean mu0, sd sigma0 from the PRE-window history (or the full
 *       pre-decision history if fewer than `warmup` games exist).
 *     - standardized residual: z_i = (d_i - mu0) / sigma0  (sigma0 floored at
 *       a positive minimum to avoid division-by-near-zero blowups).
 *     - two-sided CUSUM: S_0 = 0; S+_i = max(0, S+_{i-1} + z_i - k),
 *       S-_i = max(0, S-_{i-1} - z_i - k). The dominant tail (max(S+, S-)) is
 *       the shift magnitude.
 *     - k = 0.5 (standard CUSUM reference value / half-standard-deviation band).
 *   The final CUSUM S_n is the shift magnitude. A regime shift is DECLARED when
 *     S_n > h  (h = 5 by default; h/k ~ 10, a high-specificity threshold).
 *   Direction: "up" if the dominant CUSUM tail is positive, "down" if negative —
 *   derived from the CUSUM sign, so a strong negative drift resolves to a
 *   direction.
 *
 * This is a DETECTION, not a forecast: a shift flag at the decision instant
 * means "the team's performance distribution has demonstrably changed over the
 * trailing window vs its prior baseline." Whether the market or model prices
 * that shift is a separate question answered by the trials registry.
 *
 * NFL game-count windows: teams play at most once per week, so each team's
 * "last N games" maps cleanly to weeks 1..t. A team's point differential per
 * game is the natural scalar (available on every GameRow via homeScore-awayScore;
 * signed from each team's perspective).
 *
 * NOTE: this operates on the SCHEDULE/RESULTS layer (GameRow), not on NGS
 * tracking stats — it is a performance-regime signal, not a tracking-statistic
 * covariate. The covariate bus (covariate-bus.ts) handles the NGS side.
 *
 * Pure, deterministic, no I/O.
 */

import { AsOfFeatureStore } from "../asof-store.js";
import { proportionalDevig } from "../devig.js";
import type { GameRow } from "../game-row.js";
import type { EvalRow } from "../placebo.js";

/** Feature keys this detector emits, namespaced under `regime:`. */
export const REGIME_FEATURE_KEYS = [
  "regime:cusum",
  "regime:shift_flag",
  "regime:direction",
  "regime:recent_mean_diff",
  "regime:cusum_away",
  "regime:shift_flag_away",
  "regime:recent_mean_diff_away",
  "regime:direction_away",
] as const;

/** Decision cutoff: features frozen this long before kickoff (mirrors siblings). */
const DECISION_LEAD_MS = 60 * 60_000;
/** Assumed game duration when stamping "this result is now knowable". */
const GAME_DURATION_MS = 4 * 3_600_000;

/** CUSUM reference value (half-standard-deviation drift allowance). */
const CUSUM_K = 0.5;
/** CUSUM decision interval — high specificity, fail-closed on ambiguity. */
const CUSUM_H = 5;
/** Floor on sigma0 to avoid division-by-near-zero (point-differential sd can
 * collapse for a team on a short unbeaten run). */
const MIN_SIGMA = 0.5;

/** Options for the regime detector. */
export interface RegimeDetectorOptions {
  /** Trailing window of completed games to evaluate for a shift. Default 6. */
  readonly window?: number;
  /** Minimum prior games (across all completed games before the cutoff) needed
   * before the detector will fire the CUSUM rather than baselining the window
   * itself. Below this count the detector reports fail-closed. Default 4. */
  readonly minHistory?: number;
  /** CUSUM reference value. Default 0.5. */
  readonly k?: number;
  /** CUSUM decision interval. Default 5. */
  readonly h?: number;
  /** Floor on baseline sigma. Default 0.5. */
  readonly minSigma?: number;
}

/** The detector's verdict on one team's history. */
export interface RegimeDetection {
  /** Final two-sided CUSUM statistic (= max(S+, S-), >= 0). */
  readonly cusum: number;
  /** 1 when the CUSUM exceeds the decision interval (regime shift declared), 0 otherwise. */
  readonly shiftFlag: 0 | 1;
  /** "up" | "down" | "none" — direction of the dominant CUSUM tail. */
  readonly direction: "up" | "down" | "none";
  /** Signed difference: recent-window mean minus baseline mean. */
  readonly recentMeanDiff: number;
}

export interface RegimeDetectResult {
  readonly rows: EvalRow[];
  readonly skipped: {
    readonly noScores: number;
    readonly tie: number;
    readonly noOdds: number;
    readonly thinHistory: number;
    /** Prior game's end was not strictly before the decision cutoff. */
    readonly notKnowableInTime: number;
  };
}

/**
 * Point differential from a team's perspective for one completed game.
 * Positive = the team outscored the opponent.
 */
function pointDiff(g: GameRow, team: string): number {
  return team === g.homeTeam ? g.homeScore! - g.awayScore! : g.awayScore! - g.homeScore!;
}

/**
 * Compute the CUSUM regime detection for one team's completed-game differentials.
 *
 * `diffs` is the team's completed-game point differentials, OLDEST FIRST,
 * already filtered to games strictly before the decision cutoff.
 *
 * Returns null when there is insufficient history to compute a baseline
 * (fail-closed — never emits a fabricated detection).
 */
export function detectRegimeShift(
  diffs: readonly number[],
  opts: RegimeDetectorOptions = {},
): RegimeDetection | null {
  const window = opts.window ?? 6;
  const minHistory = opts.minHistory ?? 4;
  const k = opts.k ?? CUSUM_K;
  const h = opts.h ?? CUSUM_H;
  const minSigma = opts.minSigma ?? MIN_SIGMA;

  if (diffs.length < minHistory) return null;

  // Split into baseline (all but the trailing window) and the trailing window.
  // If the history is shorter than window+1, the baseline IS history minus the
  // window's last game; we need at least 2 points for a baseline sd.
  const baselineEnd = Math.max(0, diffs.length - window);
  const baseline = diffs.slice(0, baselineEnd);
  let recentWindow: readonly number[] = diffs.slice(baselineEnd);

  // Need at least 2 baseline points for a meaningful sd, or fall back to using
  // the entire pre-window history as both baseline and window (degenerate but
  // still a valid detection if the window is short enough).
  let mu0: number;
  let sigma0: number;

  if (baseline.length >= 2) {
    mu0 = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const var0 = baseline.reduce((s, d) => s + (d - mu0) ** 2, 0) / baseline.length;
    sigma0 = Math.sqrt(var0);
  } else if (diffs.length >= 2) {
    // Fallback: use the full history as the baseline window.
    mu0 = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const var0 = diffs.reduce((s, d) => s + (d - mu0) ** 2, 0) / diffs.length;
    sigma0 = Math.sqrt(var0);
    recentWindow = diffs; // full history is the CUSUM window in fallback mode
  } else {
    return null;
  }

  sigma0 = Math.max(sigma0, minSigma);

  // Two-sided CUSUM: track positive (up) and negative (down) cumulative sums.
  // The dominant tail (whichever exceeds h) sets the shift magnitude and
  // direction, so strong downward shifts resolve to "down" and are reachable.
  let sUp = 0;
  let sDown = 0;
  for (const d of recentWindow) {
    const z = (d - mu0) / sigma0;
    sUp = Math.max(0, sUp + z - k);
    sDown = Math.max(0, sDown - z - k);
  }
  const cusum = Math.max(sUp, sDown);

  // Direction: from the dominant tail. If neither tail exceeds h, no shift.
  const recentMean = recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;
  const recentMeanDiff = recentMean - mu0;
  const direction =
    cusum > h
      ? sUp >= sDown
        ? "up"
        : "down"
      : "none";

  return {
    cusum,
    shiftFlag: cusum > h ? 1 : 0,
    direction,
    recentMeanDiff,
  };
}

/**
 * Build leak-free regime-detection EvalRows for every game in `games`.
 *
 * For each game, gathers the featured team's (and opponent's) completed-game
 * point differentials from ALL prior games strictly before the decision cutoff,
 * runs the CUSUM detector, and ingests the covariates through the
 * AsOfFeatureStore at the honest knowable-at instant (end of the last
 * constituent game).
 *
 * The detector is symmetric: home and away teams are each evaluated independently
 * against their own baselines, producing feature cells for both sides. The EvalRow
 * carries the HOME team's detection (the modeled side), but both sides' covariates
 * are ingested so a downstream caller can build a relative regime-staleness diff.
 */
export function buildRegimeDetectionRows(
  games: readonly GameRow[],
  store: AsOfFeatureStore,
  opts: RegimeDetectorOptions = {},
): RegimeDetectResult {
  // Sort by startTime so "prior games" is well-defined by position.
  const sorted = [...games].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

  // Per-team completed-game differentials + the game's end instant, oldest first,
  // accumulated as we walk forward through the sorted schedule. Storing the end
  // instant alongside the diff is what makes observedAt honest: it is the end of
  // the LAST constituent game for each side, which is strictly before the
  // featured game's decision cutoff. This is the ONLY state — no future data is
  // ever visible because we append each game's diff AFTER processing it
  // (self-exclusion mirrored from nfl-team-form.ts).
  const teamHistory = new Map<string, { diff: number; endMs: number }[]>();

  const rows: EvalRow[] = [];
  const skipped = { noScores: 0, tie: 0, noOdds: 0, thinHistory: 0, notKnowableInTime: 0 };

  for (const g of sorted) {
    const startMs = Date.parse(g.startTime);
    const decisionMs = startMs - DECISION_LEAD_MS;

    // Collect each side's completed-game differentials BEFORE this game
    // (strictly before the decision cutoff). Because we sort by startTime and
    // only append to teamHistory AFTER evaluating this game, every entry in
    // teamHistory is from a prior game — self-exclusion is structural.
    const homeHist = teamHistory.get(g.homeTeam) ?? [];
    const awayHist = teamHistory.get(g.awayTeam) ?? [];
    const homeDiffs = homeHist.map((h) => h.diff);
    const awayDiffs = awayHist.map((h) => h.diff);

    // Evaluate THIS game.
    const evaluate = (): void => {
      if (g.homeScore === null || g.awayScore === null) {
        skipped.noScores += 1;
        return;
      }
      if (g.homeScore === g.awayScore) {
        skipped.tie += 1;
        return;
      }
      const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = g.closing;
      if (mh === null || ma === null) {
        skipped.noOdds += 1;
        return;
      }
      const devig = proportionalDevig([mh, ma]);
      if (!devig || devig[0] === undefined) {
        skipped.noOdds += 1;
        return;
      }
      const q = devig[0];
      if (!(q > 0.01 && q < 0.99)) {
        skipped.noOdds += 1;
        return;
      }

      const homeRegime = detectRegimeShift(homeDiffs, opts);
      const awayRegime = detectRegimeShift(awayDiffs, opts);

      // Fail closed: if EITHER side lacks sufficient history, we do not emit
      // a detection row for this game. The detector is only meaningful when
      // both baselines are grounded.
      if (homeRegime === null || awayRegime === null) {
        skipped.thinHistory += 1;
        return;
      }

      // The "knowable-at" instant is the end of the LAST constituent game
      // for either side — the earliest moment the detection became real.
      // Both histories contain only games strictly before this game's kickoff,
      // and each game's end (startMs + GAME_DURATION_MS) precedes this game's
      // decision cutoff (startMs - DECISION_LEAD_MS) as long as the prior
      // game ended at least DECISION_LEAD_MS before kickoff — which it does
      // for any game that is a full GAME_DURATION_MS before this one.
      const homeKnowableAt =
        homeHist.length > 0 ? Math.max(...homeHist.map((h) => h.endMs)) : 0;
      const awayKnowableAt =
        awayHist.length > 0 ? Math.max(...awayHist.map((h) => h.endMs)) : 0;
      const observedAtMs = Math.max(homeKnowableAt, awayKnowableAt);
      // Sanity: the detection must be knowable strictly before the decision
      // cutoff. If a prior game's end is at/after the cutoff (shouldn't happen
      // for properly time-ordered NFL games), fail closed.
      if (observedAtMs >= decisionMs) {
        skipped.notKnowableInTime += 1;
        return;
      }
      const observedAt = new Date(observedAtMs).toISOString();

      const ingest = (featureKey: string, value: number): void =>
        store.ingest({ entityId: g.gameId, featureKey, value, observedAt, source: "nfl-regime-detector" });

      // Home team detection (the modeled side).
      ingest("regime:cusum", homeRegime.cusum);
      ingest("regime:shift_flag", homeRegime.shiftFlag);
      ingest("regime:direction", homeRegime.direction === "up" ? 1 : homeRegime.direction === "down" ? -1 : 0);
      ingest("regime:recent_mean_diff", homeRegime.recentMeanDiff);

      // Away team detection — ingested so a downstream caller can build a
      // relative regime-staleness diff (home shift vs away shift).
      ingest("regime:cusum_away", awayRegime.cusum);
      ingest("regime:shift_flag_away", awayRegime.shiftFlag);
      ingest("regime:recent_mean_diff_away", awayRegime.recentMeanDiff);
      ingest("regime:direction_away", awayRegime.direction === "up" ? 1 : awayRegime.direction === "down" ? -1 : 0);

      const decisionAt = new Date(decisionMs).toISOString();
      rows.push({
        id: g.gameId,
        decisionAt,
        eventEndAt: new Date(startMs + GAME_DURATION_MS).toISOString(),
        features: store.vector(
          g.gameId,
          REGIME_FEATURE_KEYS,
          decisionAt,
        ),
        y: g.homeScore > g.awayScore ? 1 : 0,
        qClose: q,
      });
    };
    evaluate();

    // Record THIS game's differentials into history AFTER evaluating it —
    // the featured game's own outcome can never enter its own features.
    if (g.homeScore !== null && g.awayScore !== null && g.homeScore !== g.awayScore) {
      const diff = pointDiff(g, g.homeTeam);
      const endMs = startMs + GAME_DURATION_MS;
      const pushOrInit = (team: string, d: number): void => {
        const list = teamHistory.get(team);
        if (list) list.push({ diff: d, endMs });
        else teamHistory.set(team, [{ diff: d, endMs }]);
      };
      pushOrInit(g.homeTeam, diff);
      pushOrInit(g.awayTeam, -diff);
    }
  }

  return { rows, skipped };
}
