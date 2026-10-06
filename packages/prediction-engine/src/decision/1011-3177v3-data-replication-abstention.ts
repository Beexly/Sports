// ============================================================
// Data-replication reject-option abstention layer (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the
 * trainable-abstention gate (out-of-sample ROI, fold stability, no league
 * concentration) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1011.3177v3 — "The Data Replication Method for the Classification with Reject Option"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: each training point is replicated into an extended
 * space (x, e) with e in {0, h}; a single binary classifier trained on the
 * replicas with cost-weighted labels induces a reject region between
 * classes — for binary bet-A/bet-B this yields the three-way decision
 * bet-A / ABSTAIN / bet-B from the two replica outputs.
 *
 * IMPROVEMENT (from ledger): Add a trainable abstention layer to the
 * engine: replicate each historical pick into [x;0]/[x;h] with wrong-side
 * error costs and train a single binary classifier (SVC or small NN) to
 * learn the bet-A / ABSTAIN / bet-B reject region from features (model edge
 * vs closing line, conformal interval width, market steam, league,
 * days-to-game, model version), shipped as a pre-bet filter so abstained
 * games never reach the card.
 *
 * ACCEPTANCE GATE: ADOPT the trainable abstention layer into the engine
 * only if: (a) it beats fixed-threshold abstention on out-of-sample ROI at
 * >=2 abstention rates, (b) the learned reject region is stable across CV
 * folds (boundary direction cosine similarity >=0.8 -- else it's
 * noise-fitting), and (c) abstention doesn't concentrate on a single
 * league/market.
 */

/** Ordinal class for the three-way decision: 1=bet A, 2=abstain, 3=bet B. */
export type RejectClass = 1 | 2 | 3;

export type RejectDecision = "betA" | "abstain" | "betB";

export interface RejectFeatures {
  edgeVsClose: number;
  conformalWidth: number;
  marketSteam: number;
  league: string;
  daysToGame: number;
  modelVersion: string;
}

/** Feature names in the fixed vector order used by the replicas. */
export const REJECT_FEATURE_NAMES = [
  "edgeVsClose",
  "conformalWidth",
  "marketSteam",
  "daysToGame",
] as const;

/** Map a pick's features to the numeric vector (league/modelVersion one-hot is a training-time concern). */
export function buildRejectFeatures(f: RejectFeatures): number[] {
  return [f.edgeVsClose, f.conformalWidth, f.marketSteam, f.daysToGame];
}

export interface Replica {
  /** Extended-space point [x; e] with e in {0, h}. */
  point: number[];
  /** Binary label for this replica. */
  label: -1 | 1;
  /** Cost weight for this replica. */
  weight: number;
}

/**
 * Binary labels for the two replicas of a point whose true ordinal class
 * is k in {1,2,3}: replica 1 tests "class > 1", replica 2 tests "class > 2".
 */
export function replicationLabels(trueClass: RejectClass): [-1 | 1, -1 | 1] {
  const y1: -1 | 1 = trueClass > 1 ? 1 : -1;
  const y2: -1 | 1 = trueClass > 2 ? 1 : -1;
  return [y1, y2];
}

/**
 * Replicate one historical pick into [x;0]/[x;h] with wrong-side error
 * costs: misclassifying across the bet boundary costs costWrong, while the
 * abstain band between the boundaries carries cost costAbstainBand.
 */
export function replicateSample(
  features: number[],
  trueClass: RejectClass,
  h: number,
  costWrong: number,
  costAbstainBand: number,
): [Replica, Replica] {
  const [y1, y2] = replicationLabels(trueClass);
  return [
    { point: [...features, 0], label: y1, weight: costWrong },
    { point: [...features, h], label: y2, weight: trueClass === 2 ? costAbstainBand : costWrong },
  ];
}

/**
 * Three-way decision from the two replica classifier outputs, per the
 * paper's rule: (-,-) -> bet A; (+,+) -> bet B; mixed -> abstain.
 */
export function replicaDecision(replica1Out: number, replica2Out: number): RejectDecision {
  const b1 = replica1Out >= 0;
  const b2 = replica2Out >= 0;
  if (!b1 && !b2) return "betA";
  if (b1 && b2) return "betB";
  return "abstain";
}

/**
 * Gate (b): cosine similarity between learned boundary directions from two
 * CV folds. The gate requires >= 0.8 (else the reject region is noise).
 */
export function boundaryCosineSimilarity(wA: number[], wB: number[]): number {
  const n = Math.min(wA.length, wB.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += wA[i]! * wB[i]!;
    na += wA[i]! * wA[i]!;
    nb += wB[i]! * wB[i]!;
  }
  if (na <= 0 || nb <= 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** True when the fold-stability gate (b) passes. */
export function foldStabilityGatePasses(boundaries: number[][]): boolean {
  if (boundaries.length < 2) return false;
  let minSim = 1;
  for (let i = 0; i < boundaries.length; i++) {
    for (let j = i + 1; j < boundaries.length; j++) {
      minSim = Math.min(minSim, boundaryCosineSimilarity(boundaries[i]!, boundaries[j]!));
    }
  }
  return minSim >= 0.8;
}

/**
 * Gate (c): abstention must not concentrate on a single league/market.
 * Returns the max share of abstentions falling in one league; flag when
 * it exceeds the configured concentration cap.
 */
export function abstentionConcentration(abstainedLeagues: string[]): { maxShare: number; leagues: number } {
  const counts = new Map<string, number>();
  for (const l of abstainedLeagues) counts.set(l, (counts.get(l) ?? 0) + 1);
  const total = abstainedLeagues.length;
  let maxShare = 0;
  for (const c of counts.values()) maxShare = Math.max(maxShare, c / Math.max(total, 1));
  return { maxShare, leagues: counts.size };
}
