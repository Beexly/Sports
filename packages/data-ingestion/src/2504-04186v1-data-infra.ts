/**
 * AutoComp: Automated Data Compaction for Log-Structured Tables in Data Lakes
 *
 * arXiv:2504.04186v1 · lane:data_infra · verdict:ADAPT · owner:Hermes · doctrine:INFRA
 *
 * Improvement (record): Enumerate a weekly multi-objective compaction frontier over fragmentation reduction and compute hours, select a normalized Pareto knee, and expose the cost, join-degradation, and conflict acceptance checks without performing database operations.
 *
 * ACCEPTANCE GATE:
 * ADOPT the hook iff: (a) uncompacted 8-week fragmentation degrades the training-path join by ≥ 20% vs post-OPTIMIZE; (b) weekly OPTIMIZE cost < 5% of the weekly build's compute cost; (c) zero write-write conflicts over 4 consecutive weeks of hook operation.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Pure module: no database, I/O, network, or credentials. The hook is disabled until the measured gate is available.
 */

export const ARXIV_ID = "2504.04186v1" as const;
export const LANE = "data_infra" as const;
export const VERDICT = "ADAPT" as const;
export const ENABLED = false;

export const ACCEPTANCE_GATE = `ADOPT the hook iff: (a) uncompacted 8-week fragmentation degrades the training-path join by ≥ 20% vs post-OPTIMIZE; (b) weekly OPTIMIZE cost < 5% of the weekly build's compute cost; (c) zero write-write conflicts over 4 consecutive weeks of hook operation.`;

export interface CompactionCandidate {
  readonly id: string;
  readonly fragmentationReduction: number;
  readonly computeHours: number;
}

export interface CompactionPlan {
  readonly frontier: readonly CompactionCandidate[];
  readonly knee: CompactionCandidate | null;
}

export interface CompactionGateInput {
  readonly uncompactedJoinDegradation: number;
  readonly optimizedJoinDegradation: number;
  readonly weeklyOptimizeHours: number;
  readonly weeklyBuildHours: number;
  readonly writeWriteConflicts: number;
  readonly consecutiveWeeksObserved: number;
}

export interface CompactionGateResult {
  readonly fragmentationGate: boolean;
  readonly costGate: boolean;
  readonly conflictGate: boolean;
  readonly passes: boolean;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCandidate(value: CompactionCandidate): boolean {
  return value.id.length > 0
    && isFiniteNumber(value.fragmentationReduction)
    && value.fragmentationReduction >= 0
    && isFiniteNumber(value.computeHours)
    && value.computeHours >= 0;
}

function dominates(left: CompactionCandidate, right: CompactionCandidate): boolean {
  return left.fragmentationReduction >= right.fragmentationReduction
    && left.computeHours <= right.computeHours
    && (left.fragmentationReduction > right.fragmentationReduction || left.computeHours < right.computeHours);
}

export function buildCompactionPlan(candidates: readonly CompactionCandidate[]): CompactionPlan | null {
  if (candidates.length === 0 || !candidates.every(isCandidate)) return null;
  if (new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length) return null;
  const frontier = candidates.filter((candidate) => !candidates.some((other) => dominates(other, candidate)));
  const maxReduction = Math.max(...frontier.map((candidate) => candidate.fragmentationReduction));
  const maxHours = Math.max(...frontier.map((candidate) => candidate.computeHours));
  const knee = maxReduction === 0 && maxHours === 0
    ? frontier[0] as CompactionCandidate
    : frontier.reduce((best, candidate) => {
      const distance = (value: number, max: number): number => max === 0 ? 0 : ((max - value) / max) ** 2;
      const candidateDistance = distance(candidate.fragmentationReduction, maxReduction) + distance(candidate.computeHours, maxHours);
      const bestDistance = distance(best.fragmentationReduction, maxReduction) + distance(best.computeHours, maxHours);
      return candidateDistance < bestDistance ? candidate : best;
    });
  return { frontier, knee: knee ?? null };
}

export function evaluateCompactionGate(input: CompactionGateInput): CompactionGateResult {
  const valid = isFiniteNumber(input.uncompactedJoinDegradation)
    && isFiniteNumber(input.optimizedJoinDegradation)
    && isFiniteNumber(input.weeklyOptimizeHours)
    && isFiniteNumber(input.weeklyBuildHours)
    && isFiniteNumber(input.writeWriteConflicts)
    && Number.isInteger(input.writeWriteConflicts)
    && input.writeWriteConflicts >= 0
    && Number.isInteger(input.consecutiveWeeksObserved)
    && input.consecutiveWeeksObserved >= 0;
  if (!valid) return { fragmentationGate: false, costGate: false, conflictGate: false, passes: false };
  const fragmentationGate = input.uncompactedJoinDegradation - input.optimizedJoinDegradation >= 0.2;
  const costGate = input.weeklyBuildHours > 0 && input.weeklyOptimizeHours / input.weeklyBuildHours < 0.05;
  const conflictGate = input.consecutiveWeeksObserved >= 4 && input.writeWriteConflicts === 0;
  return { fragmentationGate, costGate, conflictGate, passes: fragmentationGate && costGate && conflictGate };
}

export function runWeeklyOptimizeHook(): { readonly executed: false; readonly reason: "disabled-by-default" } {
  return { executed: false, reason: "disabled-by-default" };
}
