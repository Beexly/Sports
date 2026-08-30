/**
 * Player usage archetype — "what kind of player is this", from rushing/receiving
 * usage we already persist. Pure and db-free.
 *
 * Honest scope: this is a USAGE profile (receiving lean, workload, efficiency),
 * not charted run-scheme (true gap/zone/power classification needs a run-concept
 * pass over play-by-play — a follow-up). It is most meaningful for RB/TE, where
 * the receiving-vs-rushing split is the core role signal.
 */

export interface UsageProfileInput {
  readonly position: string | null;
  readonly games: number;
  readonly carries: number;
  readonly receptions: number;
  readonly targets: number;
  readonly rushingYards: number;
  readonly receivingYards: number;
}

export type WorkloadTier = "bell-cow" | "lead" | "rotational" | "depth";

export interface UsageProfile {
  readonly touchesPerGame: number;
  readonly receivingShare: number; // receptions / (carries + receptions)
  readonly yardsPerTouch: number;
  readonly workloadTier: WorkloadTier;
  /** Role lean (RB-centric): "receiving", "early-down/power", "balanced", or "low-usage". */
  readonly archetype: string;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export function classifyUsageProfile(input: UsageProfileInput): UsageProfile {
  const games = Math.max(1, input.games);
  const touches = input.carries + input.receptions;
  const touchesPerGame = round2(touches / games);
  const receivingShare = touches > 0 ? round2(input.receptions / touches) : 0;
  const yardsPerTouch = touches > 0 ? round2((input.rushingYards + input.receivingYards) / touches) : 0;

  const workloadTier: WorkloadTier =
    touchesPerGame >= 18 ? "bell-cow" : touchesPerGame >= 12 ? "lead" : touchesPerGame >= 6 ? "rotational" : "depth";

  let archetype: string;
  if (touchesPerGame < 4) archetype = "low-usage";
  else if (receivingShare >= 0.45) archetype = "receiving";
  else if (receivingShare <= 0.15) archetype = "early-down/power";
  else archetype = "balanced";

  return { touchesPerGame, receivingShare, yardsPerTouch, workloadTier, archetype };
}
