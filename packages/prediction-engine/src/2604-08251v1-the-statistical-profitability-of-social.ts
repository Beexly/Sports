/**
 * arXiv:2604.08251v1 — The Statistical Profitability of Social Media Sports Betting Influencers: Evidence from the Nigerian Market
 *
 * Tout-audit staking baseline battery: pre-match timestamped pick capture plus the four naive staking
 * strategies (Flat / Inverse / SquareRoot / Fixed Return) that GSE's Kelly sizing must beat on its own
 * history.
 *
 * Improvement: Build an automated tout-audit tracker (pre-match timestamped/hashed capture of tout picks verified against sportsbook records) publishing audited ROI reports as competitive content, and run GSE's own picks through the four staking strategies (Flat/Inverse/SquareRoot/Fixed Return) as a sizing baseline battery GSE's Kelly sizing must beat.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the tout-audit pipeline and staking baseline battery if the tracker reproduces the paper's negative-ROI pattern on a fresh tout sample and GSE's Kelly sizing beats all four naive strategies on its own history.
 */

/** One resolved bet for the staking battery. */
export interface ResolvedBet {
  /** Decimal odds. */
  odds: number;
  /** Model edge estimate in [0,1). */
  edge: number;
  won: boolean;
}

/** Flat: constant unit stake. */
export function flatStake(unit: number): number {
  if (unit <= 0) throw new Error("flatStake: unit > 0");
  return unit;
}

/** Inverse: stake inversely proportional to odds (equal-liability-ish). */
export function inverseStake(unit: number, odds: number): number {
  if (unit <= 0 || odds <= 1) throw new Error("inverseStake: unit > 0, odds > 1");
  return unit / (odds - 1);
}

/** SquareRoot: stake proportional to sqrt(edge). */
export function sqrtStake(unit: number, edge: number): number {
  if (unit <= 0 || edge < 0) throw new Error("sqrtStake: unit > 0, edge >= 0");
  return unit * Math.sqrt(edge);
}

/** Fixed Return: stake sized to win exactly `target` profit. */
export function fixedReturnStake(target: number, odds: number): number {
  if (target <= 0 || odds <= 1) throw new Error("fixedReturnStake: target > 0, odds > 1");
  return target / (odds - 1);
}

/** P&L of a staking rule over resolved bets. */
export function batteryPnl(
  bets: readonly ResolvedBet[],
  stakeFn: (b: ResolvedBet) => number,
): number {
  return bets.reduce((pnl, b) => {
    const s = stakeFn(b);
    return pnl + (b.won ? s * (b.odds - 1) : -s);
  }, 0);
}

/**
 * Battery verdict: Kelly (or the candidate strategy) must beat ALL four
 * naive strategies on the same history.
 */
export function batteryVerdict(
  bets: readonly ResolvedBet[],
  candidate: (b: ResolvedBet) => number,
  unit: number,
  target: number,
): { candidate: number; naive: Record<string, number>; beatsAll: boolean } {
  const naive = {
    flat: batteryPnl(bets, () => flatStake(unit)),
    inverse: batteryPnl(bets, (b) => inverseStake(unit, b.odds)),
    sqrt: batteryPnl(bets, (b) => sqrtStake(unit, b.edge)),
    fixedReturn: batteryPnl(bets, (b) => fixedReturnStake(target, b.odds)),
  };
  const c = batteryPnl(bets, candidate);
  return { candidate: c, naive, beatsAll: Object.values(naive).every((v) => c > v) };
}

/** Hash-capture record for the tout audit (pre-match, tamper-evident). */
export interface PickCapture {
  tout: string;
  pick: string;
  capturedAt: string; // ISO timestamp, must precede the event
  hash: string;
}

/** Validate a capture: non-empty fields and hash present. */
export function validCapture(c: PickCapture): boolean {
  return c.tout.trim() !== "" && c.pick.trim() !== "" && c.capturedAt.trim() !== "" && c.hash.trim() !== "";
}
