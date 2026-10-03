/**
 * Tournament design taxonomy for futures pricing — arXiv 2103.06023v4
 * ("The efficacy of tournament designs").
 *
 * ADDITIVE utility. Not wired into any pricing path (wiring changes priced
 * markets and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: port the design taxonomy (knockout / Swiss / round-robin
 * generators + seeding rules) into the simulation module so tournament
 * outright and qualification probabilities are simulated with
 * format-faithful brackets, not generic Monte Carlo. The paper's <=3%
 * seeding result is a citable prior against overweighting draw/seed news in
 * futures; Swiss-format expertise applies to UCL/esports futures.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff format-faithful
 * simulation moves outright prices materially on at least one team vs naive
 * simulation and backtests better against the realized outcome distribution.
 */

export type TournamentDesign =
  | { readonly kind: "knockout"; readonly rounds?: number }
  | { readonly kind: "swiss"; readonly rounds: number }
  | { readonly kind: "round-robin" };

export interface TeamStrength {
  readonly id: string;
  readonly strength: number;
}

/** Seeded RNG (mulberry32) for reproducible simulations. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bradley-Terry win probability from strength differential. */
export function winProbability(strengthA: number, strengthB: number): number {
  const p = 1 / (1 + Math.exp(-(strengthA - strengthB)));
  return Math.min(Math.max(p, 1e-9), 1 - 1e-9);
}

/**
 * Standard seeding: 1vN, 2v(N-1), ... in the first round; winners re-seed
 * by original seed each round. Returns the tournament winner id.
 */
export function simulateKnockout(
  teams: readonly TeamStrength[],
  rand: () => number,
): string {
  if (teams.length === 0) return "";
  if (teams.length === 1) return teams[0]!.id;
  const seeded = [...teams].sort((a, b) => b.strength - a.strength);
  let round: TeamStrength[] = seeded;
  while (round.length > 1) {
    const next: TeamStrength[] = [];
    for (let i = 0; i < round.length / 2; i++) {
      const a = round[i]!;
      const b = round[round.length - 1 - i]!;
      next.push(rand() < winProbability(a.strength, b.strength) ? a : b);
    }
    next.sort((a, b) => b.strength - a.strength);
    round = next;
  }
  return round[0]!.id;
}

/**
 * Round-robin: every pair meets once; most wins takes the tournament
 * (ties broken by strength, then id for determinism).
 */
export function simulateRoundRobin(
  teams: readonly TeamStrength[],
  rand: () => number,
): string {
  if (teams.length === 0) return "";
  const wins = new Map<string, number>();
  for (const t of teams) wins.set(t.id, 0);
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const a = teams[i]!;
      const b = teams[j]!;
      const w = rand() < winProbability(a.strength, b.strength) ? a : b;
      wins.set(w.id, wins.get(w.id)! + 1);
    }
  }
  const ranked = [...teams].sort(
    (a, b) => wins.get(b.id)! - wins.get(a.id)! || b.strength - a.strength,
  );
  return ranked[0]!.id;
}

/**
 * Swiss: fixed rounds; each round pairs teams on equal points (random
 * within score groups); most points wins (ties broken by strength).
 */
export function simulateSwiss(
  teams: readonly TeamStrength[],
  rounds: number,
  rand: () => number,
): string {
  if (teams.length === 0) return "";
  const points = new Map<string, number>();
  for (const t of teams) points.set(t.id, 0);
  for (let r = 0; r < rounds; r++) {
    const groups = new Map<number, TeamStrength[]>();
    for (const t of teams) {
      const p = points.get(t.id)!;
      const g = groups.get(p) ?? [];
      g.push(t);
      groups.set(p, g);
    }
    for (const group of groups.values()) {
      const shuffled = [...group].sort(() => rand() - 0.5);
      for (let i = 0; i + 1 < shuffled.length; i += 2) {
        const a = shuffled[i]!;
        const b = shuffled[i + 1]!;
        const w = rand() < winProbability(a.strength, b.strength) ? a : b;
        points.set(w.id, points.get(w.id)! + 1);
      }
    }
  }
  const ranked = [...teams].sort(
    (a, b) =>
      points.get(b.id)! - points.get(a.id)! || b.strength - a.strength,
  );
  return ranked[0]!.id;
}

/**
 * Format-faithful outright probabilities: Monte Carlo over the chosen
 * design with a seeded RNG. Sums to 1 over the team ids.
 */
export function outrightProbabilities(
  design: TournamentDesign,
  teams: readonly TeamStrength[],
  sims: number,
  seed = 1,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const t of teams) counts[t.id] = 0;
  const rand = mulberry32(seed);
  for (let s = 0; s < sims; s++) {
    const winner =
      design.kind === "knockout"
        ? simulateKnockout(teams, rand)
        : design.kind === "swiss"
          ? simulateSwiss(teams, design.rounds, rand)
          : simulateRoundRobin(teams, rand);
    if (winner) counts[winner] = (counts[winner] ?? 0) + 1;
  }
  const probs: Record<string, number> = {};
  for (const t of teams) probs[t.id] = sims > 0 ? counts[t.id]! / sims : 0;
  return probs;
}
