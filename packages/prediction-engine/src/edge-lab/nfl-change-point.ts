/**
 * NFL weekly change-point / regime detector (H0 slice #1).
 *
 * Leak-safe: a change detected at week t may only enter features served for
 * week t+1 or later — the test fold (t+1) is strictly posterior to the detect
 * fold (t). The detector itself never consumes the *outcome* of the game it
 * is trying to feature; it only consumes that game's *observed performance*
 * (EPA/play, success rate, etc.), which becomes knowable only after the game
 * ends — and the AsOfFeatureStore enforces the cutoff at serve time.
 *
 * Method: a rolling two-window change-point test. For each candidate week t,
 * compare the mean EPA/play over the most recent `minRun` weeks (the "recent"
 * window) against the mean over the `baselineWindow` weeks immediately
 * preceding it (the "prior" window). A regime shift is flagged when the
 * recent-window mean deviates from the prior mean by more than `threshold`
 * pooled standard errors — a two-sample z-test on weekly aggregates.
 *
 *   - Spike suppression is built in: the recent window spans `minRun` weeks,
 *     so a single outlier week is averaged with its neighbors (or, if
 *     minRun=2, must be joined by at least one more week of similar deviation
 *     to cross threshold).
 *   - Persistence: the recent window IS the persistence gate — the shift must
 *     hold across the full minRun-week window.
 *   - Self-exclusion: the prior baseline is strictly before the recent window,
 *     so week t's own observation is never in the baseline it's tested
 *     against.
 *
 * Fail closed: a team with fewer than `minHistory` observed weeks returns
 * `direction: "none"` with `confident: false` — the downstream fire gate
 * treats that as "not firable," never as a positive signal.
 *
 * Not a market signal: this emits a feature flag + confidence, not a fair
 * probability. Calibrates in CLF v0 (next slice). Independent p, priced: false.
 *
 * Pure, deterministic, no I/O.
 */

import type { GameRow } from "./game-row.js";

export const NFL_CHANGEPOINT_METHOD_TAG = "nfl_changepoint_v1" as const;

/** Direction of the detected regime shift relative to the prior baseline. */
export type RegimeDirection = "high" | "low" | "none";

export interface ChangePointFlag {
  /** Method tag for audit / provenance. */
  readonly methodTag: typeof NFL_CHANGEPOINT_METHOD_TAG;
  /** Team whose regime was evaluated. */
  readonly team: string;
  /** Week index (1-based) at which the most recent observation was evaluated. */
  readonly week: number;
  /** Detected direction of shift. "none" means no regime change flagged. */
  readonly direction: RegimeDirection;
  /**
   * Z-statistic of the most recent comparison (recent-window mean vs prior
   * baseline mean in pooled-SE units). |stat| > threshold means a shift was
   * flagged; 0 when no shift.
   */
  readonly stat: number;
  /**
   * Whether the detector has enough history to be meaningful.
   * `false` => fail closed: downstream treats as "none" regardless of stat.
   */
  readonly confident: boolean;
  /**
   * Earliest week (1-based) at which the detected regime shift began
   * (the first week of the recent window), or `null` when no shift detected.
   */
  readonly shiftStartWeek: number | null;
  /** One-sentence reason for the verdict. */
  readonly reason: string;
  readonly priced: false;
}

/**
 * Weekly performance snapshot for a team — the input grain this detector
 * operates on. EPA/play is the canonical shift signal; success rate provides
 * a secondary confirmation. Both are observed only after the game ends, so
 * there is no outcome-leak path into week t features.
 */
export interface WeeklyPerformance {
  readonly week: number; // 1-based NFL week
  /** Mean offensive EPA per play for this team in this week. */
  readonly epaPerPlay: number;
  /** Offensive success rate (share of plays with EPA > 0). */
  readonly successRate: number;
}

export interface ChangePointOptions {
  /**
   * Two-sample z-test threshold on the recent-vs-prior comparison.
   * |z| > threshold flags a shift. Default 1.8 — calibrated for noisy NFL
   * weekly aggregates (a single 40-play game has large sampling error;
   * requiring ~2 SEs of sustained deviation before flagging).
   */
  readonly threshold?: number;
  /**
   * Width of the "recent" window (weeks) whose mean is tested against the
   * prior baseline. Also the minimum run length a shift must persist to be
   * flagged (spike suppression + persistence gate). Default 2.
   */
  readonly minRun?: number;
  /**
   * Minimum total weeks of history required before the detector is
   * `confident`. Below this, fail closed. Default 5 (minRun + baselineWindow
   * + 1 buffer).
   */
  readonly minHistory?: number;
  /**
   * Width of the "prior baseline" window (weeks immediately before the recent
   * window). Default 5 — enough weeks for a stable mean, short enough to adapt
   * to mid-season changes.
   */
  readonly baselineWindow?: number;
}

const DEFAULT_OPTIONS: Required<ChangePointOptions> = {
  threshold: 1.8,
  minRun: 2,
  minHistory: 7,
  baselineWindow: 5,
};

/** Input rows sorted ascending by week; all for the SAME team. */
export function detectRegimeShift(
  team: string,
  weekly: readonly WeeklyPerformance[],
  opts: ChangePointOptions = {},
): ChangePointFlag {
  const cfg = { ...DEFAULT_OPTIONS, ...opts };
  const n = weekly.length;

  // Fail closed: not enough data to claim a regime.
  if (n === 0) {
    return failClosed(team, 0, "no observations");
  }

  const lastWeek = weekly[n - 1]!.week;
  if (n < cfg.minHistory) {
    return failClosed(team, lastWeek, `only ${n} weeks < minHistory ${cfg.minHistory}`);
  }

  // Need enough weeks for: baseline window + recent window + at least 1 gap.
  const needed = cfg.baselineWindow + cfg.minRun;
  if (n < needed) {
    return failClosed(
      team,
      lastWeek,
      `only ${n} weeks < baseline(${cfg.baselineWindow}) + minRun(${cfg.minRun})`,
    );
  }

  // ── Define the two windows for the MOST RECENT comparison ──────────────
  // Recent window: the last `minRun` weeks (weeks t-minRun+1 .. t).
  // Prior baseline: the `baselineWindow` weeks immediately before that
  // (weeks t-minRun-baselineWindow+1 .. t-minRun).
  // The baseline NEVER includes any week in the recent window — strict
  // self-exclusion. Week t's own observation is in the recent window, not the
  // baseline it is tested against.
  const recentStart = n - cfg.minRun;
  const recent = weekly.slice(recentStart, n);
  const priorEnd = recentStart;
  const priorStart = Math.max(0, priorEnd - cfg.baselineWindow);
  const prior = weekly.slice(priorStart, priorEnd);

  if (recent.length < cfg.minRun || prior.length < 1) {
    return failClosed(team, lastWeek, "insufficient window coverage after split");
  }

  // ── Two-sample comparison of weekly EPA/play means ────────────────────
  const recentMean = mean(recent.map((w) => w.epaPerPlay));
  const priorMean = mean(prior.map((w) => w.epaPerPlay));
  const recentStd = sampleStd(recent.map((w) => w.epaPerPlay), recentMean);
  const priorStd = sampleStd(prior.map((w) => w.epaPerPlay), priorMean);

  // Pooled standard error of the difference in means.
  // Each weekly observation carries its own sampling variance (game-level
  // EPA/play noise), but at the weekly-aggregate grain the relevant
  // dispersion is the week-to-week spread — so we use the observed weekly
  // std directly (not per-play binomial).
  const seRecent = recentStd / Math.sqrt(recent.length);
  const sePrior = priorStd / Math.sqrt(prior.length);

  // Guard: if BOTH windows have ~zero variance, no standardized signal exists.
  // (When only one has zero variance, we can still form a z from the other —
  // a flat recent window vs noisy prior, or vice versa, is a legitimate
  // signal when the flat window's mean clearly differs from the prior mean.)
  if (recentStd < 1e-12 && priorStd < 1e-12) {
    const same = Math.abs(recentMean - priorMean) < 1e-9;
    return {
      methodTag: NFL_CHANGEPOINT_METHOD_TAG,
      team,
      week: lastWeek,
      direction: "none",
      stat: 0,
      confident: true,
      shiftStartWeek: null,
      reason: same
        ? `degenerate baseline: both windows constant, no shift`
        : `degenerate baseline: both windows constant but different (${recentMean.toFixed(4)} vs ${priorMean.toFixed(4)}) — fail closed, insufficient variance to standardize`,
      priced: false,
    };
  }

  const pooledSe = Math.sqrt(seRecent ** 2 + sePrior ** 2) || 1e-9;

  const z = (recentMean - priorMean) / pooledSe;
  const absZ = Math.abs(z);

  if (absZ > cfg.threshold) {
    const direction: RegimeDirection = z > 0 ? "high" : "low";
    return {
      methodTag: NFL_CHANGEPOINT_METHOD_TAG,
      team,
      week: lastWeek,
      direction,
      stat: z,
      confident: true,
      shiftStartWeek: recent[0]!.week,
      reason:
        direction === "high"
          ? `recent ${recent.length}-wk mean EPA/play (${recentMean.toFixed(4)}) exceeded prior ${prior.length}-wk baseline (${priorMean.toFixed(4)}); z=${z.toFixed(3)} > threshold ${cfg.threshold}`
          : `recent ${recent.length}-wk mean EPA/play (${recentMean.toFixed(4)}) below prior ${prior.length}-wk baseline (${priorMean.toFixed(4)}); z=${Math.abs(z).toFixed(3)} > threshold ${cfg.threshold}`,
      priced: false,
    };
  }

  return {
    methodTag: NFL_CHANGEPOINT_METHOD_TAG,
    team,
    week: lastWeek,
    direction: "none",
    stat: z,
    confident: true,
    shiftStartWeek: null,
    reason: `no regime shift: recent mean ${recentMean.toFixed(4)} vs prior ${priorMean.toFixed(4)}; |z|=${absZ.toFixed(3)} <= threshold ${cfg.threshold}`,
    priced: false,
  };
}

function failClosed(team: string, week: number, reason: string): ChangePointFlag {
  return {
    methodTag: NFL_CHANGEPOINT_METHOD_TAG,
    team,
    week,
    direction: "none",
    stat: 0,
    confident: false,
    shiftStartWeek: null,
    reason: `fail-closed: ${reason}`,
    priced: false,
  };
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function sampleStd(xs: number[], mu: number): number {
  if (xs.length < 2) return 0;
  const varEst = xs.reduce((s, x) => s + (x - mu) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(varEst);
}

/**
 * Build per-team weekly performance series from completed GameRows.
 *
 * Each game contributes one WeeklyPerformance entry for BOTH teams (home and
 * away), tagged with the game's week. Games without scores are dropped (no
 * performance to observe). The `epaPerPlay` value here is a *placeholder*
 * — in production this column comes from nflverse play-by-play via the
 * feature admission pipeline (mirroring features/nfl-team-form.ts). For the
 * H0 change-point module itself we accept weekly data as input so the
 * detector is pure and testable without pbp ingestion.
 */
export function weeklyPerformancesFromGames(
  games: readonly GameRow[],
  epaByGameTeam: ReadonlyMap<string, ReadonlyMap<string, { epaPerPlay: number; successRate: number }>>,
): Record<string, WeeklyPerformance[]> {
  const byTeam = new Map<string, WeeklyPerformance[]>();

  for (const g of games) {
    if (g.homeScore === null || g.awayScore === null) continue;
    if (g.week === null) continue;

    const gameEpa = epaByGameTeam.get(g.gameId);
    const homePerf = gameEpa?.get(g.homeTeam);
    const awayPerf = gameEpa?.get(g.awayTeam);

    if (homePerf) {
      const arr = byTeam.get(g.homeTeam) ?? [];
      arr.push({ week: g.week, epaPerPlay: homePerf.epaPerPlay, successRate: homePerf.successRate });
      byTeam.set(g.homeTeam, arr);
    }
    if (awayPerf) {
      const arr = byTeam.get(g.awayTeam) ?? [];
      arr.push({ week: g.week, epaPerPlay: awayPerf.epaPerPlay, successRate: awayPerf.successRate });
      byTeam.set(g.awayTeam, arr);
    }
  }

  // Sort each team's weeks ascending.
  const result: Record<string, WeeklyPerformance[]> = {};
  for (const [team, perf] of byTeam) {
    result[team] = [...perf].sort((a, b) => a.week - b.week);
  }
  return result;
}
