/**
 * Sealed-ledger verification math - PURE functions, no I/O.
 *
 * Every public number on /record and /calibration is recomputed from the
 * Neon ledger (picks + games + pick_settlement_events + pick_proof_receipts)
 * by scripts/verify-ledger.ts using exactly these functions. Nothing here is
 * hardcoded; the artifact the pages render is the script's output.
 *
 * Conventions (documented, matching the engine's own CLV sign rule in
 * packages/prediction-engine/src/clv-capture.ts):
 *  - Staking: flat 1 unit per settled pick. WIN profit = decimal(lock price) - 1,
 *    LOSS = -1u, PUSH = 0u, VOID excluded from the settled ledger.
 *  - CLV: POSITIVE = beat the close. Points for SPREAD/TOTAL, probability for
 *    MONEYLINE. Recomputed from the stored lock/close fields, never trusted
 *    from a precomputed aggregate.
 *  - Calibration gate: no win-rate percentage is publishable until at least
 *    CALIBRATION_TARGET (200) official plays are settled AND CLV-backed
 *    (a closing line or price is recorded for the pick).
 */

/** Official plays that must be CLV-backed and settled before any win rate ships. */
export const CALIBRATION_TARGET = 200;

/** The only pick grades that count as an official play (never PASS). */
export const OFFICIAL_GRADES = ["STRONG_PLAY", "ELITE_PLAY"] as const;
export type OfficialGrade = (typeof OFFICIAL_GRADES)[number];

export type SettledResult = "WIN" | "LOSS" | "PUSH";

export function isSettledResult(result: string | null | undefined): result is SettledResult {
  return result === "WIN" || result === "LOSS" || result === "PUSH";
}

/** American price -> decimal odds. -110 -> 1.909..., +150 -> 2.5. */
export function americanToDecimal(american: number): number | null {
  if (!Number.isFinite(american) || american === 0) return null;
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

/** American price -> implied probability (with vig, as quoted). */
export function americanToImpliedProb(american: number): number | null {
  const dec = americanToDecimal(american);
  return dec === null ? null : 1 / dec;
}

/**
 * Flat-stake unit profit for a settled pick.
 * WIN needs a recorded lock price (American); without one the pick cannot
 * contribute honestly to the units total and returns null (coverage gap,
 * never an invented price).
 */
export function unitProfit(result: SettledResult, lockPriceAmerican: number | null): number | null {
  if (result === "PUSH") return 0;
  if (result === "LOSS") return -1;
  const dec = lockPriceAmerican === null ? null : americanToDecimal(lockPriceAmerican);
  if (dec === null) return null;
  return dec - 1;
}

export type ClvMarket = "SPREAD" | "TOTAL" | "MONEYLINE" | "OTHER";

export interface ClvInput {
  readonly market: ClvMarket;
  /** e.g. "UNDER 43.5", "New York Giants -1.5", "Moneyline" */
  readonly selection: string;
  readonly lockLine: number | null;
  readonly closeLine: number | null;
  readonly lockPrice: number | null;
  readonly closePrice: number | null;
  /** Team names, to derive HOME/AWAY side for spread CLV (engine convention). */
  readonly homeTeamName?: string | null;
  readonly awayTeamName?: string | null;
}

export interface ClvRecomputed {
  readonly kind: "POINTS" | "PROBABILITY";
  /** Positive = beat the close. */
  readonly value: number;
}

/**
 * Recompute CLV from lock vs close, mirroring the engine's own conventions
 * (packages/prediction-engine/src/clv.ts - POSITIVE = beat the close):
 *  - TOTAL UNDER: pick - close. TOTAL OVER: close - pick.
 *  - SPREAD: lines are HOME-perspective. Side comes from the selected team:
 *    HOME -> pick - close; AWAY -> close - pick. When the side cannot be
 *    derived from the team names the row is left ungraded (null), never
 *    guessed.
 *  - MONEYLINE: implied(close) - implied(lock).
 * Returns null when the fields needed for that market are absent.
 */
export function recomputeClv(input: ClvInput): ClvRecomputed | null {
  const { market, selection, lockLine, closeLine, lockPrice, closePrice } = input;
  if (market === "TOTAL" && lockLine !== null && closeLine !== null) {
    const under = /^\s*UNDER/i.test(selection);
    const over = /^\s*OVER/i.test(selection);
    if (!under && !over) return null;
    return { kind: "POINTS", value: under ? lockLine - closeLine : closeLine - lockLine };
  }
  if (market === "SPREAD" && lockLine !== null && closeLine !== null) {
    const home = (input.homeTeamName ?? "").trim().toLowerCase();
    const away = (input.awayTeamName ?? "").trim().toLowerCase();
    const sel = selection.trim().toLowerCase();
    const isHome = home.length > 0 && sel.startsWith(home);
    const isAway = away.length > 0 && sel.startsWith(away);
    if (isHome === isAway) return null; // ambiguous or unknown side: do not guess
    return {
      kind: "POINTS",
      value: isHome ? lockLine - closeLine : closeLine - lockLine,
    };
  }
  if (lockPrice !== null && closePrice !== null) {
    const lockProb = americanToImpliedProb(lockPrice);
    const closeProb = americanToImpliedProb(closePrice);
    if (lockProb === null || closeProb === null) return null;
    return { kind: "PROBABILITY", value: closeProb - lockProb };
  }
  return null;
}

/** A pick is CLV-backed when a closing line OR closing price is recorded. */
export function isClvBacked(closeLine: number | null, closePrice: number | null): boolean {
  return closeLine !== null || closePrice !== null;
}

export interface OfficialPickRow {
  readonly result: string;
  readonly isPublished: boolean;
  readonly tier: string;
  readonly pickGrade: string;
  readonly clvCloseLine: number | null;
  readonly clvClosePrice: number | null;
}

export function isOfficialPlay(row: OfficialPickRow): boolean {
  return (
    row.isPublished &&
    row.tier === "PREMIUM" &&
    (OFFICIAL_GRADES as readonly string[]).includes(row.pickGrade)
  );
}

export interface CalibrationGate {
  /** Official plays settled AND CLV-backed. */
  readonly clvBackedSettled: number;
  readonly target: number;
  readonly unlocked: boolean;
  /** Null until unlocked. Wins / (wins + losses); pushes excluded. */
  readonly winRate: number | null;
}

/**
 * The 200-bet law. Win rate stays null (and therefore unrenderable) until
 * enough CLV-backed official settled bets exist. Counts always render.
 */
export function calibrationGate(rows: readonly OfficialPickRow[]): CalibrationGate {
  let wins = 0;
  let losses = 0;
  let clvBackedSettled = 0;
  for (const row of rows) {
    if (!isOfficialPlay(row) || !isSettledResult(row.result)) continue;
    if (!isClvBacked(row.clvCloseLine, row.clvClosePrice)) continue;
    clvBackedSettled += 1;
    if (row.result === "WIN") wins += 1;
    else if (row.result === "LOSS") losses += 1;
  }
  const unlocked = clvBackedSettled >= CALIBRATION_TARGET;
  const decided = wins + losses;
  return {
    clvBackedSettled,
    target: CALIBRATION_TARGET,
    unlocked,
    winRate: unlocked && decided > 0 ? wins / decided : null,
  };
}

export interface WlpCounts {
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  readonly settled: number;
}

export function countWlp(results: readonly string[]): WlpCounts {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  for (const r of results) {
    if (r === "WIN") wins += 1;
    else if (r === "LOSS") losses += 1;
    else if (r === "PUSH") pushes += 1;
  }
  return { wins, losses, pushes, settled: wins + losses + pushes };
}

/** Round to 2 decimals without float drift in the artifact. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round to 4 decimals (CLV probability values). */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export interface ConfidenceBucket {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly count: number;
}

/**
 * Confidence-band distribution of settled official plays. Counts only:
 * per-band observed rates are win-rate percentages and stay locked behind
 * the same 200-bet gate.
 */
export function confidenceBuckets(confidences: readonly number[]): ConfidenceBucket[] {
  const bands = [
    { label: "50-59", min: 50, max: 59 },
    { label: "60-69", min: 60, max: 69 },
    { label: "70-79", min: 70, max: 79 },
    { label: "80-89", min: 80, max: 89 },
    { label: "90-100", min: 90, max: 100 },
  ];
  return bands.map((b) => ({
    ...b,
    count: confidences.filter((c) => Number.isFinite(c) && c >= b.min && c <= b.max).length,
  }));
}