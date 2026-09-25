/**
 * Fantasy trade analyzer — settings-adjusted valuation for two-sided trades.
 *
 * Values every player in a trade under the league's scoring settings
 * (PPR 0 | 0.5 | 1), applies an optional matchup adjustment, assigns
 * position-percentile tiers (elite / starter / flex / replaceable), and
 * returns a signed verdict on sum(B) - sum(A):
 *
 *   |valueDeltaPct| < 5%              -> fair
 *   5% <= |valueDeltaPct| <= 15%      -> side-a-wins / side-a-loses
 *   |valueDeltaPct| > 15%             -> side-a-fleeces / side-a-fleeced
 *
 * Side A is the team giving `sideA` and receiving `sideB`. A positive
 * valueDeltaPct means side A receives more than it gives.
 *
 * Research / product build for the ethandojo handoff. Not wired into any
 * live valuation path.
 */

// ─── Scoring settings ────────────────────────────────────────────────────────

/** Points per reception. Supported fantasy-league PPR formats. */
export type PprSetting = 0 | 0.5 | 1;

/** Roster slot counts used for contextual scoring and explanations. */
export interface RosterSlots {
  readonly QB: number;
  readonly RB: number;
  readonly WR: number;
  readonly TE: number;
  readonly FLEX: number;
  readonly K: number;
  readonly DST: number;
}

export const DEFAULT_ROSTER_SLOTS: RosterSlots = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  K: 1,
  DST: 1,
};

// ─── Players ─────────────────────────────────────────────────────────────────

/** One player on one side of the trade. */
export interface FantasyPlayer {
  readonly id: string;
  readonly name: string;
  /** Position label, e.g. "QB" | "RB" | "WR" | "TE" | "K" | "DST". */
  readonly position: string;
  /** Projected fantasy points under NON-PPR (standard) scoring. */
  readonly projectedPoints: number;
  /** Projected receptions — drives the PPR adjustment. */
  readonly projectedReceptions: number;
  /**
   * Per-player matchup multiplier applied after PPR (1 = neutral).
   * Defaults to the trade-level `matchupAdjustment`, then 1.
   */
  readonly matchupAdjustment?: number;
}

// ─── Tiers ───────────────────────────────────────────────────────────────────

export type PlayerTier = "elite" | "starter" | "flex" | "replaceable";

export interface TieredPlayer {
  readonly id: string;
  readonly name: string;
  readonly position: string;
  /** Settings-adjusted points actually used for valuation. */
  readonly adjustedPoints: number;
  readonly tier: PlayerTier;
  /** Percentile of `adjustedPoints` within the position reference pool (0-100). */
  readonly positionPercentile: number;
}

// ─── Verdict ─────────────────────────────────────────────────────────────────

export type TradeVerdict =
  | "fair"
  | "side-a-wins"
  | "side-a-loses"
  | "side-a-fleeces"
  | "side-a-fleeced";

export interface TradeAnalysis {
  readonly verdict: TradeVerdict;
  /**
   * Signed percent: ((sumB - sumA) / baseline) * 100.
   * Positive favors side A (the receiving side of `sideB`).
   */
  readonly valueDeltaPct: number;
  readonly tiersA: readonly TieredPlayer[];
  readonly tiersB: readonly TieredPlayer[];
  readonly explanation: string;
}

export interface TradeAnalyzerInput {
  readonly ppr: PprSetting;
  readonly rosterSlots?: RosterSlots;
  readonly sideA: readonly FantasyPlayer[];
  readonly sideB: readonly FantasyPlayer[];
  /** Trade-level matchup multiplier (default 1). Overridden per player. */
  readonly matchupAdjustment?: number;
  /**
   * Optional per-position pools of settings-adjusted points used as the
   * percentile reference. When omitted, the trade's own players at that
   * position form the pool.
   */
  readonly positionReference?: Readonly<Record<string, readonly number[]>>;
}

// ─── Settings-adjusted scoring ───────────────────────────────────────────────

/**
 * Standard projection + PPR * receptions, then the matchup multiplier.
 * `projectedPoints` is the non-PPR base so the PPR term is explicit.
 */
export function settingsAdjustedPoints(
  player: FantasyPlayer,
  ppr: PprSetting,
  defaultMatchup = 1,
): number {
  const matchup = player.matchupAdjustment ?? defaultMatchup;
  const base = player.projectedPoints + ppr * player.projectedReceptions;
  return base * matchup;
}

// ─── Tiers by position percentile ────────────────────────────────────────────

/**
 * Percentile of `value` within `pool` (inclusive mid-rank for ties).
 * Returns 100 for a lone value so a sole reference player is not treated
 * as replaceable by default.
 */
export function positionPercentile(value: number, pool: readonly number[]): number {
  if (pool.length === 0) return 100;
  if (pool.length === 1) return 100;
  let below = 0;
  let equal = 0;
  for (const v of pool) {
    if (v < value) below += 1;
    else if (v === value) equal += 1;
  }
  return ((below + 0.5 * equal) / pool.length) * 100;
}

/** Map a position percentile (0-100) onto the four-tier ladder. */
export function tierFromPercentile(percentile: number): PlayerTier {
  if (percentile >= 85) return "elite";
  if (percentile >= 60) return "starter";
  if (percentile >= 35) return "flex";
  return "replaceable";
}

function resolvePool(
  player: FantasyPlayer,
  adjusted: number,
  reference: Readonly<Record<string, readonly number[]>> | undefined,
  tradePoolByPos: ReadonlyMap<string, number[]>,
): readonly number[] {
  const fromReference = reference?.[player.position];
  if (fromReference !== undefined && fromReference.length > 0) return fromReference;
  return tradePoolByPos.get(player.position) ?? [adjusted];
}

function tierPlayers(
  players: readonly FantasyPlayer[],
  ppr: PprSetting,
  defaultMatchup: number,
  reference: Readonly<Record<string, readonly number[]>> | undefined,
  tradePoolByPos: ReadonlyMap<string, number[]>,
): TieredPlayer[] {
  return players.map((player) => {
    const adjustedPoints = settingsAdjustedPoints(player, ppr, defaultMatchup);
    const pool = resolvePool(player, adjustedPoints, reference, tradePoolByPos);
    const positionPercentileScore = positionPercentile(adjustedPoints, pool);
    return {
      id: player.id,
      name: player.name,
      position: player.position,
      adjustedPoints,
      tier: tierFromPercentile(positionPercentileScore),
      positionPercentile: positionPercentileScore,
    };
  });
}

// ─── Verdict ─────────────────────────────────────────────────────────────────

export function verdictFromDelta(valueDeltaPct: number): TradeVerdict {
  const magnitude = Math.abs(valueDeltaPct);
  if (magnitude < 5) return "fair";
  const sideAWins = valueDeltaPct > 0;
  if (magnitude <= 15) return sideAWins ? "side-a-wins" : "side-a-loses";
  return sideAWins ? "side-a-fleeces" : "side-a-fleeced";
}

function sumAdjusted(
  players: readonly FantasyPlayer[],
  ppr: PprSetting,
  defaultMatchup: number,
): number {
  return players.reduce(
    (acc, player) => acc + settingsAdjustedPoints(player, ppr, defaultMatchup),
    0,
  );
}

function describeSide(side: "A" | "B", rows: readonly TieredPlayer[]): string {
  if (rows.length === 0) return `side ${side} sends nobody`;
  const parts = rows.map(
    (r) => `${r.name} (${r.tier}, ${r.adjustedPoints.toFixed(1)} adj pts)`,
  );
  return `side ${side} sends ${parts.join(", ")}`;
}

// ─── Analyzer ────────────────────────────────────────────────────────────────

export function analyzeTrade(input: TradeAnalyzerInput): TradeAnalysis {
  const ppr = input.ppr;
  const matchup = input.matchupAdjustment ?? 1;
  const slots = input.rosterSlots ?? DEFAULT_ROSTER_SLOTS;

  const sumA = sumAdjusted(input.sideA, ppr, matchup);
  const sumB = sumAdjusted(input.sideB, ppr, matchup);
  const baseline = (Math.abs(sumA) + Math.abs(sumB)) / 2;
  const valueDeltaPct = baseline > 0 ? ((sumB - sumA) / baseline) * 100 : 0;
  const verdict = verdictFromDelta(valueDeltaPct);

  // Position pools across BOTH sides so a star on one side is measured
  // against the flexes he is being traded for, plus any external reference.
  const tradePoolByPos = new Map<string, number[]>();
  for (const player of [...input.sideA, ...input.sideB]) {
    const adjusted = settingsAdjustedPoints(player, ppr, matchup);
    const bucket = tradePoolByPos.get(player.position);
    if (bucket === undefined) tradePoolByPos.set(player.position, [adjusted]);
    else bucket.push(adjusted);
  }

  const tiersA = tierPlayers(
    input.sideA,
    ppr,
    matchup,
    input.positionReference,
    tradePoolByPos,
  );
  const tiersB = tierPlayers(
    input.sideB,
    ppr,
    matchup,
    input.positionReference,
    tradePoolByPos,
  );

  const flexSlots = slots.FLEX;
  const explanation = [
    `Scoring: PPR ${ppr}, matchup multiplier ${matchup}.`,
    describeSide("A", tiersA),
    describeSide("B", tiersB),
    `Settings-adjusted totals: A ${sumA.toFixed(1)} vs B ${sumB.toFixed(1)}.`,
    `Value delta ${valueDeltaPct.toFixed(1)}% (positive favors side A) -> ${verdict}.`,
    `Roster context: ${slots.RB} RB / ${slots.WR} WR / ${slots.TE} TE / ${flexSlots} FLEX slots.`,
  ].join(" ");

  return { verdict, valueDeltaPct, tiersA, tiersB, explanation };
}

// ─── API surface (handoff-suite contract) ────────────────────────────────────

export interface TradeApi {
  analyze(input: TradeAnalyzerInput): TradeAnalysis;
}

/**
 * Factory matching the ethandojo handoff suite (`TradeApi`).
 * Stateless — all inputs arrive per call.
 */
export function createTradeAnalyzer(): TradeApi {
  return {
    analyze(input: TradeAnalyzerInput): TradeAnalysis {
      return analyzeTrade(input);
    },
  };
}
