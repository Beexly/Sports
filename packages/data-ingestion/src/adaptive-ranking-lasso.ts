/**
 * The ranking lasso and its application to sport tournaments
 *
 * arXiv:1301.2954v1 · lane:team_ratings · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Add adaptive ranking-lasso team ratings: Bradley-Terry logistic with home-field tau and an
 * adaptive fused/grouped-ability L1 penalty (Eq. 4 with adaptive weights Eq. 7, lambda via BIC,
 * Augmented-Lagrangian/cvxpy solve), refit weekly to produce data-determined team tiers -- within-
 * tier games pass, cross-tier games carry the edge -- with tier-membership changes tracked as an
 * engine feature and win probabilities recalibrated via Platt/isotonic.
 *
 * ACCEPTANCE GATE: Adopt adaptive ranking lasso as a GSE ratings input iff on 2016-2025 walk-forward: (a) log loss
 * beats MLE-BT by >= 0.005; AND (b) log loss beats dynamic Elo by >= 0.002; AND (c) tier
 * assignments are stable week-to-week (median team changes tiers <= 2 times per season).
 *
 * Ingest role: feature builder (data-determined team tiers + tier-change features).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1301.2954v1" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt adaptive ranking lasso as a GSE ratings input iff on 2016-2025 walk-forward: (a) log loss
 * beats MLE-BT by >= 0.005; AND (b) log loss beats dynamic Elo by >= 0.002; AND (c) tier
 * assignments are stable week-to-week (median team changes tiers <= 2 times per season).`;

export const CONFIG = { enabled: false, lambdaGrid: [0.01, 0.05, 0.1, 0.25], maxTierChangesPerSeason: 2 } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TeamAbility {
  readonly team: string;
  readonly ability: number;
}

export function isTeamAbility(x: unknown): x is TeamAbility {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o["team"] === "string" && isFiniteNumber(o["ability"]);
}

/** Soft-threshold operator (the L1 proximal step in the fused-lasso solve). */
export function softThreshold(x: number, lambda: number): number | null {
  if (!isFiniteNumber(x) || !isFiniteNumber(lambda) || lambda < 0) return null;
  if (x > lambda) return x - lambda;
  if (x < -lambda) return x + lambda;
  return 0;
}

/**
 * Fused/grouped tiering: sort by ability, cut between teams whose ability gap
 * exceeds lambda. This is the discrete output of the adaptive fused penalty:
 * within-tier teams share (near-)identical ability, cross-tier pairs carry edge.
 */
export function fusedTiers(abilities: readonly unknown[], lambda: number): string[][] {
  const valid: TeamAbility[] = [];
  for (const a of abilities) if (isTeamAbility(a)) valid.push(a);
  if (valid.length === 0 || !isFiniteNumber(lambda) || lambda < 0) return [];
  const sorted = [...valid].sort((a, b) => b.ability - a.ability);
  const tiers: string[][] = [];
  let current: string[] = [];
  let prevAbility: number | null = null;
  for (const t of sorted) {
    if (prevAbility !== null && prevAbility - t.ability > lambda) {
      tiers.push(current);
      current = [];
    }
    current.push(t.team);
    prevAbility = t.ability;
  }
  if (current.length > 0) tiers.push(current);
  return tiers;
}

/** 1-based tier index of a team, null if absent. */
export function tierOf(tiers: readonly string[][], team: string): number | null {
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i]?.includes(team)) return i + 1;
  }
  return null;
}

/**
 * Week-to-week tier stability: fraction of teams whose tier is unchanged.
 * Gate (c): median team changes tiers <= 2 times per season.
 */
export function tierStability(tiersA: readonly string[][], tiersB: readonly string[][]): number | null {
  const teams = new Set<string>();
  for (const t of tiersA) for (const x of t) teams.add(x);
  if (teams.size === 0) return null;
  let same = 0;
  for (const team of teams) {
    if (tierOf(tiersA, team) === tierOf(tiersB, team)) same++;
  }
  return same / teams.size;
}

/** Count per-team tier changes across a season of weekly tier snapshots. */
export function tierChangeCounts(weeklyTiers: ReadonlyArray<readonly string[][]>): Record<string, number> {
  const counts: Record<string, number> = {};
  let prev: Record<string, number> = {};
  for (const tiers of weeklyTiers) {
    const cur: Record<string, number> = {};
    for (let i = 0; i < tiers.length; i++) {
      for (const team of tiers[i] ?? []) cur[team] = i + 1;
    }
    for (const team of Object.keys(cur)) {
      const p = prev[team];
      const c = cur[team];
      if (p !== undefined && c !== undefined && p !== c) counts[team] = (counts[team] ?? 0) + 1;
    }
    prev = cur;
  }
  return counts;
}
