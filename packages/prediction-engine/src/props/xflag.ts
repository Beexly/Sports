
export interface XFlagFeatures {
  readonly down: number;
  readonly distance: number;
  readonly yardline: number;
  readonly scoreDifferential: number;
  readonly secondsRemaining: number;
  readonly teamPriorPenaltyRate: number;
  readonly crewId: string;
  readonly preFlagEpa: number;
  readonly isPass: boolean;
  readonly defenderPressureRate: number;
}

/** Expected flags over a set of plays = sum of per-play probabilities. */
export function expectedFlags(playProbs: readonly number[]): number {
  return playProbs.reduce((s, p) => s + Math.min(Math.max(p, 0), 1), 0);
}

function aggregateBy(playProbs: readonly number[], keyOf: readonly string[]): Map<string, number> {
  if (playProbs.length !== keyOf.length) throw new Error("xflag: probs and keys must align");
  const out = new Map<string, number>();
  for (let i = 0; i < playProbs.length; i++) {
    const k = keyOf[i] ?? "";
    out.set(k, (out.get(k) ?? 0) + Math.min(Math.max(playProbs[i] ?? 0, 0), 1));
  }
  return out;
}

/** xFlags per team. */
export function xFlagsByTeam(playProbs: readonly number[], teamOf: readonly string[]): Map<string, number> {
  return aggregateBy(playProbs, teamOf);
}

/** Per-crew penalty tendencies (expected flags on games they officiate). */
export function xFlagsByCrew(playProbs: readonly number[], crewOf: readonly string[]): Map<string, number> {
  return aggregateBy(playProbs, crewOf);
}

/** Drive-level expected free yardage: sum over plays of p(flag) * expected yards. */
export function expectedFreeYardage(playProbs: readonly number[], yardsIfFlag: readonly number[]): number {
  if (playProbs.length !== yardsIfFlag.length) throw new Error("xflag: probs and yards must align");
  return playProbs.reduce((s, p, i) => s + Math.min(Math.max(p, 0), 1) * (yardsIfFlag[i] ?? 0), 0);
}
