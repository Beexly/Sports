/**
 * Tournament seeding incentive audit — arXiv 2011.11277v6
 * ("A paradox of tournament seeding").
 *
 * ADDITIVE utility. Not wired into any pricing path (wiring changes priced
 * markets and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: encode each competition's seeding/draw rules as a
 * function from results to pots, then property-test monotonicity by brute
 * force over result scenarios: can a better result ever produce a worse
 * draw? Run before pricing any tournament's draw-dependent markets (group
 * winners, qualification, outrights).
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff the audit finds real
 * violations: apply the monotonicity property test to at least three
 * competitions priced (UCL, World Cup qualifying, one more); if any shows a
 * realizable paradox scenario, the audit becomes a standing pre-pricing
 * check; if all are clean, keep the checklist as a one-time validation.
 */

/**
 * A result scenario: for each team, an ordinal result level (higher =
 * better result, e.g. group position 1 is encoded as the highest level).
 */
export type ResultScenario = Readonly<Record<string, number>>;

/**
 * Pot allocation: maps a full result scenario to each team's pot
 * (pot 1 = best seed, higher numbers = worse).
 */
export type PotAllocation = (scenario: ResultScenario) => Readonly<Record<string, number>>;

/**
 * Draw quality for a team given everyone's pots: lower = better draw.
 * Default: own pot number (a worse seed is a worse draw by construction);
 * callers may supply opponent-strength-aware quality functions.
 */
export type DrawQuality = (
  team: string,
  pots: Readonly<Record<string, number>>,
) => number;

export interface SeedingViolation {
  readonly team: string;
  readonly betterScenario: ResultScenario;
  readonly worseScenario: ResultScenario;
  readonly drawQualityBetterResult: number;
  readonly drawQualityWorseResult: number;
}

const defaultDrawQuality: DrawQuality = (_team, pots) => 0 + (pots[_team] ?? 99);

/**
 * Brute-force monotonicity audit. Enumerates every result scenario over
 * `levels` ordinal result levels per team, and for each team checks every
 * pair of scenarios that differ ONLY in that team's result: a strictly
 * better result must never yield a strictly worse draw.
 */
export function auditSeedingMonotonicity(
  teams: readonly string[],
  levels: number,
  allocate: PotAllocation,
  drawQuality: DrawQuality = defaultDrawQuality,
): SeedingViolation[] {
  const violations: SeedingViolation[] = [];
  if (teams.length === 0 || levels < 2) return violations;

  const scenarios: ResultScenario[] = [];
  const build = (idx: number, acc: Record<string, number>) => {
    if (idx === teams.length) {
      scenarios.push({ ...acc });
      return;
    }
    for (let l = 0; l < levels; l++) {
      acc[teams[idx]!] = l;
      build(idx + 1, acc);
    }
  };
  build(0, {});

  const key = (s: ResultScenario) => teams.map((t) => s[t]).join(",");
  const byOthers = new Map<string, ResultScenario[]>();
  for (const s of scenarios) {
    for (const team of teams) {
      const othersKey =
        team + "|" + teams.filter((t) => t !== team).map((t) => s[t]).join(",");
      const arr = byOthers.get(othersKey) ?? [];
      arr.push(s);
      byOthers.set(othersKey, arr);
    }
  }
  void key;

  for (const arr of byOthers.values()) {
    for (const team of teams) {
      const sorted = [...arr].sort((a, b) => a[team]! - b[team]!);
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const worse = sorted[i]!;
          const better = sorted[j]!;
          if (better[team]! === worse[team]!) continue;
          const potsBetter = allocate(better);
          const potsWorse = allocate(worse);
          const qBetter = drawQuality(team, potsBetter);
          const qWorse = drawQuality(team, potsWorse);
          if (qBetter > qWorse) {
            violations.push({
              team,
              betterScenario: better,
              worseScenario: worse,
              drawQualityBetterResult: qBetter,
              drawQualityWorseResult: qWorse,
            });
          }
        }
      }
    }
  }
  return violations;
}

/**
 * Encode a simple "pot = rank of result level" allocation (monotone by
 * construction) for use as a control in the audit.
 */
export function rankPotAllocation(teams: readonly string[]): PotAllocation {
  return (scenario) => {
    const pots: Record<string, number> = {};
    for (const t of teams) pots[t] = teams.length - scenario[t]!;
    return pots;
  };
}
