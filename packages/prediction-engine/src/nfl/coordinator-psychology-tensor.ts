/**
 * Coordinator psychology tensor — grudge/tendency inputs for the Sinkhorn cost.
 *
 * STATUS BY EVIDENCE (2026-10-24 audit):
 * - `coaching_tree_and_grudge_ledger.jsonl` is NOT in the repository (searched
 *   git tree + worktrees). Therefore the grudge score is a NAMED GAP and the
 *   Q4 PROE override does NOT fire. No animus is invented.
 * - The tendency breaker fires ONLY from a counted formation/down rate that
 *   already exists in a data file (rate + sampleN on the row). No counted file
 *   ships yet, so the default is gap; tests provide counted fixtures to pin the
 *   math so the day a real file lands, wiring is mechanical.
 * - Shadow wiring already exists in coach-sim/sinkhorn-targets.ts
 *   (applyShadowHaircut). This module does not duplicate an allocator.
 */

export interface FormationRateRow {
  readonly team: string;
  readonly formation: string;
  readonly down: string;
  readonly rate: number; // 0-1 counted share
  readonly sampleN: number;
  readonly source: string;
}

export interface GrudgeLedgerRow {
  readonly coach: string;
  readonly opponentCoach: string;
  readonly grudgeScore: number; // 0-1
  readonly source: string;
}

export interface TensorInput {
  readonly team: string;
  readonly opponentCoach?: string;
  readonly formationRates?: readonly FormationRateRow[];
  readonly grudgeLedger?: readonly GrudgeLedgerRow[];
  readonly opponentFormationRate?: FormationRateRow;
}

export interface TensorResult {
  /** Counted-tendency tension: opponent's formation rate deviation, 0-1. */
  readonly tendencyTension: number | null;
  readonly tendencyBreakerFires: boolean;
  readonly grudgeScore: number | null;
  readonly grudgeGap: string | null;
  /** Q4 PROE override — deliberately false until the grudge ledger exists. */
  readonly q4ProeOverrideFires: boolean;
  readonly source: string;
}

/** League baseline for a formation rate when no opponent row exists: 0.5. */
export const BASELINE_RATE = 0.5;
/** The breaker fires when the counted rate deviates 25+ points from baseline. */
export const BREAKER_THRESHOLD = 0.25;
/** Minimum sample for a counted rate to be trusted. */
export const MIN_SAMPLE = 20;

export function coordinatorTension(input: TensorInput): TensorResult {
  // Tendency breaker: counted rate only.
  let tendencyTension: number | null = null;
  let breaker = false;
  const row = input.opponentFormationRate;
  if (row && row.sampleN >= MIN_SAMPLE) {
    tendencyTension = Math.round(Math.abs(row.rate - BASELINE_RATE) * 100) / 100;
    breaker = tendencyTension >= BREAKER_THRESHOLD;
  }

  // Grudge: named gap unless the ledger exists in the repo.
  let grudgeScore: number | null = null;
  let grudgeGap: string | null =
    "coaching_tree_and_grudge_ledger.jsonl is not in the repository (searched tree + worktrees 2026-10-24)";
  if (input.grudgeLedger && input.opponentCoach) {
    const hit = input.grudgeLedger.find(
      (r) => r.coach && r.opponentCoach === input.opponentCoach,
    );
    if (hit) {
      grudgeScore = hit.grudgeScore;
      grudgeGap = null;
    }
  }

  // Q4 PROE override: does not fire without a measured grudge score.
  const q4ProeOverrideFires = grudgeScore !== null && grudgeScore >= 0.75 && breaker;

  return {
    tendencyTension,
    tendencyBreakerFires: breaker,
    grudgeScore,
    grudgeGap,
    q4ProeOverrideFires,
    source: input.opponentFormationRate
      ? "counted formation rate row: " + input.opponentFormationRate.source
      : "no counted formation rate supplied",
  };
}

/**
 * Sinkhorn cost addendum: the coach-sim allocator already applies shadow
 * haircuts; when a measured tension exists it adds a small cost term to the
 * defense's preferred formation column. Deliberately capped so psychology can
 * tilt a cost, never own a projection.
 */
export function tensionCostAddendum(tension: number | null): number {
  if (tension === null) return 0;
  return Math.round(Math.min(tension, 0.5) * 0.1 * 1000) / 1000;
}
