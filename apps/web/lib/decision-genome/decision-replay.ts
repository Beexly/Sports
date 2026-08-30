/**
 * DecisionReplay — recompute a decision from its frozen inputs and detect divergence.
 *
 * Decision Genome build step G. A real process edge is reproducible: feed the SAME frozen
 * inputs back through the SAME logic and you get the SAME aperture verdict. If the replay
 * diverges, something drifted — code changed, a threshold moved, or the recorded state was
 * never honest. Replay turns "trust me" into "run it again". Pure, no I/O.
 */

import { evaluateAperture, type ApertureInput, type ApertureState, type ApertureThresholds, DEFAULT_APERTURE_THRESHOLDS } from "./aperture";
import type { DecisionGenome } from "./decision-genome";

export interface ReplayResult {
  readonly genomeId: string;
  /** The aperture state recorded on the genome. */
  readonly recordedState: ApertureState;
  /** The aperture state recomputed from the genome's frozen layers. */
  readonly replayedState: ApertureState;
  /** True when recorded and replayed agree — the decision is reproducible. */
  readonly reproducible: boolean;
  readonly replayedReasons: readonly string[];
}

/**
 * Replay a genome's aperture decision from its own frozen market/evidence/model/compliance
 * layers and compare to the recorded state. Deterministic: same genome + thresholds ⇒ same
 * result. Use the same thresholds the decision was made under for a faithful replay.
 */
export function replayDecision(
  genome: DecisionGenome,
  thresholds: ApertureThresholds = DEFAULT_APERTURE_THRESHOLDS,
): ReplayResult {
  const input: ApertureInput = {
    market: genome.market,
    evidence: genome.evidence,
    model: genome.model,
    compliance: genome.compliance,
  };
  const evaluation = evaluateAperture(input, thresholds);
  return {
    genomeId: genome.id,
    recordedState: genome.aperture,
    replayedState: evaluation.state,
    reproducible: genome.aperture === evaluation.state,
    replayedReasons: evaluation.reasons,
  };
}

/** Replay a batch; returns only the genomes that FAILED to reproduce (the drift set). */
export function findDrift(
  genomes: readonly DecisionGenome[],
  thresholds: ApertureThresholds = DEFAULT_APERTURE_THRESHOLDS,
): ReplayResult[] {
  return genomes.map((g) => replayDecision(g, thresholds)).filter((r) => !r.reproducible);
}
