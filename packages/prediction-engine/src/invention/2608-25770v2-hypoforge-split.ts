/**
 * HypoForge split: per-hypothesis vs batch/distribution-level feedback +
 * testing playbook — arXiv 2608.25770v2 ("HypoForge: A Self-Improving
 * Multi-Agent Framework for Automated Hypothesis Generation and Testing").
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes
 * predictions and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: a multi-agent hypothesis loop that learns from
 * feedback at two granularities — arm A with per-instance feedback, arm B
 * with batch/distribution-level feedback — plus a testing playbook: a
 * persistent, deduplicated skill set of failure-preventing checks that
 * accumulates over time so the agent stops repeating the same failure
 * modes.
 *
 * Improvement (record): Implement the HypoForge split inside GSE's
 * Motif-lab discovery loop: arm A with per-hypothesis feedback vs arm B
 * with batch/distribution-level feedback, plus a testing playbook that
 * accumulates failure-preventing skills, so the discovery agent learns
 * from outcome distributions rather than single instances.
 *
 * ACCEPTANCE GATE: ADOPT if: arm B's batch hit-rate >= 2x arm A's
 * per-hypothesis rate, the testing playbook accumulates >=5 distinct
 * non-duplicate skills in 4 weeks that each prevent a repeated failure
 * mode at least once, and transfer holds (fresh-hypothesis first-batch
 * quality improves >=20%); REJECT if batch feedback ~= per-hypothesis
 * feedback or the playbook fills with tautologies. (Gate requires 4 weeks
 * of discovery-loop runs; evaluate via the harness.)
 */

export interface HypothesisOutcome {
  readonly id: string;
  readonly hypothesis: string;
  /** Did the backtest pass the discovery gate? */
  readonly gatePassed: boolean;
  /** Failure mode label when it failed (e.g. "lookahead-bias"). */
  readonly failureMode: string | null;
  /** Batch this hypothesis belonged to (arm B). */
  readonly batchId: string | null;
  /** Hypothesis quality score (0..1) on the first backtest. */
  readonly firstBatchQuality: number;
}

export interface TestingSkill {
  readonly id: string;
  /** Failure mode this skill prevents (e.g. "lookahead-bias"). */
  readonly preventsFailureMode: string;
  /** How the check runs (deterministic check description). */
  readonly check: string;
  /** Number of distinct times it prevented a repeated failure. */
  timesPrevented: number;
  /** ISO timestamp of first accumulation. */
  readonly accumulatedAt: string;
}

export interface FeedbackArmState {
  readonly name: "A" | "B";
  /** Arm A: feedback per hypothesis. Arm B: feedback per batch. */
  outcomes: HypothesisOutcome[];
}

/** Hit rate: fraction of hypotheses that passed the gate. */
export function hitRate(arm: FeedbackArmState): number {
  if (arm.outcomes.length === 0) return 0;
  const hits = arm.outcomes.filter((o) => o.gatePassed).length;
  return hits / arm.outcomes.length;
}

/** Batch-level hit rate for arm B: fraction of batches with >=1 passer. */
export function batchHitRate(arm: FeedbackArmState): number {
  const batches = new Map<string, boolean>();
  for (const o of arm.outcomes) {
    if (o.batchId === null) continue;
    batches.set(o.batchId, (batches.get(o.batchId) ?? false) || o.gatePassed);
  }
  if (batches.size === 0) return 0;
  const hits = [...batches.values()].filter(Boolean).length;
  return hits / batches.size;
}

export class TestingPlaybook {
  private skills: TestingSkill[] = [];

  /** Accumulate a skill; dedupes on preventsFailureMode (no tautologies). */
  accumulate(
    preventsFailureMode: string,
    check: string,
    at: string = new Date().toISOString(),
  ): TestingSkill {
    const existing = this.skills.find(
      (s) => s.preventsFailureMode === preventsFailureMode,
    );
    if (existing) return existing;
    const skill: TestingSkill = {
      id: `skill-${this.skills.length + 1}`,
      preventsFailureMode,
      check,
      timesPrevented: 0,
      accumulatedAt: at,
    };
    this.skills.push(skill);
    return skill;
  }

  /** Apply the playbook before a backtest: count prevented failure modes. */
  applyChecks(failureModesPresent: readonly string[]): string[] {
    const prevented: string[] = [];
    for (const mode of failureModesPresent) {
      const skill = this.skills.find((s) => s.preventsFailureMode === mode);
      if (skill) {
        skill.timesPrevented += 1;
        prevented.push(mode);
      }
    }
    return prevented;
  }

  skillCount(): number {
    return this.skills.length;
  }

  /** Distinct non-duplicate skills that each prevented >=1 repeat. */
  effectiveSkills(): TestingSkill[] {
    return this.skills.filter((s) => s.timesPrevented >= 1);
  }

  /** Tautology guard: a skill whose check restates the failure mode. */
  static isTautological(check: string, preventsFailureMode: string): boolean {
    const c = check.toLowerCase();
    const m = preventsFailureMode.toLowerCase().replace(/-/g, " ");
    return c.includes(m) && c.length < m.length + 20;
  }
}

/**
 * Transfer check: does first-batch quality on FRESH hypotheses improve
 * after the playbook / batch feedback kicks in?
 */
export function transferImprovement(
  baselineFirstBatchQualities: readonly number[],
  laterFirstBatchQualities: readonly number[],
): number {
  const mean = (xs: readonly number[]) =>
    xs.length > 0 ? xs.reduce((t, v) => t + v, 0) / xs.length : 0;
  const base = mean(baselineFirstBatchQualities);
  const later = mean(laterFirstBatchQualities);
  return base > 0 ? (later - base) / base : 0;
}

/**
 * Gate check from the record: arm B batch hit-rate >= 2x arm A
 * per-hypothesis rate, >=5 effective playbook skills, transfer >=20%.
 */
export function passesHypoForgeGate(input: {
  readonly armAPerHypothesisRate: number;
  readonly armBBatchHitRate: number;
  readonly effectivePlaybookSkills: number;
  readonly transferImprovement: number;
}): boolean {
  const baseline =
    input.armAPerHypothesisRate > 0 ? input.armAPerHypothesisRate : 1e-9;
  return (
    input.armBBatchHitRate / baseline >= 2 &&
    input.effectivePlaybookSkills >= 5 &&
    input.transferImprovement >= 0.2
  );
}
