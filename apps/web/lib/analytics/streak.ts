/**
 * Win/loss streak analysis utilities — pure math, zero dependencies.
 *
 * Analyzes sequences of binary outcomes (win=true, loss=false) to compute
 * streak statistics. Used for track record displays and the CLV/performance
 * analytics surfaces.
 *
 * INERT: read-only analytics. Does not affect picks or model.
 */

export type Outcome = "win" | "loss" | "push" | "no-action";

export interface StreakRecord {
  /** Current active streak type and length */
  readonly currentStreak: { readonly type: "win" | "loss" | "push" | "none"; readonly length: number };
  /** Longest win streak in the sequence */
  readonly longestWinStreak: number;
  /** Longest loss streak in the sequence */
  readonly longestLossStreak: number;
  /** Total wins */
  readonly wins: number;
  /** Total losses */
  readonly losses: number;
  /** Total pushes (not counted in win/loss rate) */
  readonly pushes: number;
  /** No-action records (skipped) */
  readonly noActions: number;
  /** Win rate: wins / (wins + losses), excludes pushes/no-action */
  readonly winRate: number | null;
  /** Total settled outcomes (wins + losses, excludes pushes/no-action) */
  readonly settled: number;
}

/**
 * Analyze a sequence of outcomes.
 * Outcomes are in chronological order (oldest first).
 */
export function analyzeStreak(outcomes: readonly Outcome[]): StreakRecord {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let noActions = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinRun = 0;
  let currentLossRun = 0;

  for (const outcome of outcomes) {
    if (outcome === "win") {
      wins++;
      currentWinRun++;
      currentLossRun = 0;
      if (currentWinRun > longestWinStreak) longestWinStreak = currentWinRun;
    } else if (outcome === "loss") {
      losses++;
      currentLossRun++;
      currentWinRun = 0;
      if (currentLossRun > longestLossStreak) longestLossStreak = currentLossRun;
    } else if (outcome === "push") {
      pushes++;
      currentWinRun = 0;
      currentLossRun = 0;
    } else {
      noActions++;
    }
  }

  // Determine current streak from the tail of the sequence
  let currentStreakType: "win" | "loss" | "push" | "none" = "none";
  let currentStreakLength = 0;
  for (let i = outcomes.length - 1; i >= 0; i--) {
    const o = outcomes[i];
    if (o === "no-action") continue;
    if (currentStreakType === "none") {
      if (o === "win") { currentStreakType = "win"; currentStreakLength = 1; }
      else if (o === "loss") { currentStreakType = "loss"; currentStreakLength = 1; }
      else if (o === "push") { currentStreakType = "push"; currentStreakLength = 1; }
      else break;
    } else if (o === currentStreakType) {
      currentStreakLength++;
    } else {
      break;
    }
  }

  const settled = wins + losses;
  const winRate = settled > 0 ? wins / settled : null;

  return {
    currentStreak: { type: currentStreakType, length: currentStreakLength },
    longestWinStreak,
    longestLossStreak,
    wins,
    losses,
    pushes,
    noActions,
    winRate,
    settled,
  };
}

export interface RollingWindowResult {
  /** Window size */
  readonly n: number;
  /** Win rate in the last n settled outcomes */
  readonly winRate: number | null;
  /** Wins in the window */
  readonly wins: number;
  /** Losses in the window */
  readonly losses: number;
}

/**
 * Compute win rate over the last N settled outcomes.
 * Pushes and no-action are excluded from the window count.
 */
export function rollingWinRate(outcomes: readonly Outcome[], windowSize: number): RollingWindowResult {
  const settled = outcomes.filter((o) => o === "win" || o === "loss");
  const window = settled.slice(-windowSize);
  const wins = window.filter((o) => o === "win").length;
  const losses = window.length - wins;
  return {
    n: window.length,
    winRate: window.length > 0 ? wins / window.length : null,
    wins,
    losses,
  };
}

/**
 * Compute win rates over multiple rolling windows.
 * Standard windows: [10, 20, 50, 100, "all"].
 */
export function multiWindowWinRates(
  outcomes: readonly Outcome[],
  windows: readonly number[] = [10, 20, 50, 100],
): ReadonlyArray<RollingWindowResult & { readonly label: string }> {
  return windows.map((w) => ({
    ...rollingWinRate(outcomes, w),
    label: `Last ${w}`,
  }));
}

/**
 * Convert boolean win/loss array to Outcome array.
 * Convenience for code that uses boolean outcomes.
 */
export function boolToOutcomes(results: readonly boolean[]): Outcome[] {
  return results.map((r) => (r ? "win" : "loss"));
}
