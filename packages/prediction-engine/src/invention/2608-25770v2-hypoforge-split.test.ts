import { describe, expect, it } from "vitest";
import {
  FeedbackArmState,
  HypothesisOutcome,
  TestingPlaybook,
  batchHitRate,
  hitRate,
  passesHypoForgeGate,
  transferImprovement,
} from "./2608-25770v2-hypoforge-split";

function outcome(
  id: string,
  gatePassed: boolean,
  batchId: string | null,
  failureMode: string | null = null,
  quality = 0.5,
): HypothesisOutcome {
  return {
    id,
    hypothesis: `hypothesis ${id}`,
    gatePassed,
    failureMode,
    batchId,
    firstBatchQuality: quality,
  };
}

describe("HypoForge split", () => {
  it("hitRate counts per-hypothesis gate passes (arm A)", () => {
    const arm: FeedbackArmState = {
      name: "A",
      outcomes: [
        outcome("a1", true, null),
        outcome("a2", false, null, "lookahead-bias"),
        outcome("a3", true, null),
        outcome("a4", false, null, "overfit"),
      ],
    };
    expect(hitRate(arm)).toBe(0.5);
  });

  it("batchHitRate counts batches with >=1 passer (arm B)", () => {
    const arm: FeedbackArmState = {
      name: "B",
      outcomes: [
        outcome("b1", false, "batch-1", "lookahead-bias"),
        outcome("b2", true, "batch-1"),
        outcome("b3", false, "batch-2", "overfit"),
        outcome("b4", false, "batch-2", "overfit"),
      ],
    };
    // batch-1 has a passer, batch-2 does not -> 1/2.
    expect(batchHitRate(arm)).toBe(0.5);
  });

  it("arm B batch rate can exceed arm A per-hypothesis rate on shared data", () => {
    const outcomesA = [
      outcome("a1", true, null),
      outcome("a2", false, null),
      outcome("a3", false, null),
      outcome("a4", false, null),
      outcome("a5", true, null),
      outcome("a6", false, null),
      outcome("a7", false, null),
      outcome("a8", false, null),
    ];
    const armA: FeedbackArmState = { name: "A", outcomes: outcomesA };
    // Same underlying hypotheses grouped in batches of 2 -> 2/4 batches pass.
    const armB: FeedbackArmState = {
      name: "B",
      outcomes: [
        outcome("a1", true, "batch-1"),
        outcome("a2", false, "batch-1"),
        outcome("a3", false, "batch-2"),
        outcome("a4", false, "batch-2"),
        outcome("a5", true, "batch-3"),
        outcome("a6", false, "batch-3"),
        outcome("a7", false, "batch-4"),
        outcome("a8", false, "batch-4"),
      ],
    };
    expect(hitRate(armA)).toBe(0.25);
    expect(batchHitRate(armB)).toBe(0.5);
    expect(batchHitRate(armB) / hitRate(armA)).toBe(2);
  });

  it("playbook accumulates distinct skills and dedupes repeats", () => {
    const playbook = new TestingPlaybook();
    const s1 = playbook.accumulate(
      "lookahead-bias",
      "Shift feature window back by the embargo period and re-run; require features dated before kickoff.",
    );
    const s2 = playbook.accumulate(
      "lookahead-bias",
      "A different phrasing of the same check.",
    );
    playbook.accumulate(
      "survivor-bias",
      "Require inactive-player rows in the training sample; reject if dropped.",
    );
    expect(s1.id).toBe(s2.id); // deduped
    expect(playbook.skillCount()).toBe(2);
  });

  it("applyChecks prevents repeated failure modes and counts them", () => {
    const playbook = new TestingPlaybook();
    playbook.accumulate(
      "lookahead-bias",
      "Embargo features by 24h before kickoff and re-run.",
    );
    const prevented = playbook.applyChecks(["lookahead-bias", "unknown-mode"]);
    expect(prevented).toEqual(["lookahead-bias"]);
    expect(playbook.effectiveSkills().length).toBe(1);
    expect(playbook.effectiveSkills()[0]!.timesPrevented).toBe(1);
    // A skill that never fires is not "effective".
    playbook.accumulate("overfit", "Require walk-forward validation across 3 seasons.");
    expect(playbook.effectiveSkills().length).toBe(1);
  });

  it("isTautological flags checks that just restate the failure mode", () => {
    expect(
      TestingPlaybook.isTautological("Avoid lookahead bias.", "lookahead-bias"),
    ).toBe(true);
    expect(
      TestingPlaybook.isTautological(
        "Shift feature window back by the embargo period and re-run; require features dated before kickoff.",
        "lookahead-bias",
      ),
    ).toBe(false);
  });

  it("transferImprovement measures fresh-hypothesis quality lift", () => {
    expect(transferImprovement([0.5, 0.5], [0.6, 0.7])).toBeCloseTo(0.3, 9);
    expect(transferImprovement([], [0.6])).toBe(0);
  });

  it("passesHypoForgeGate requires 2x rate, >=5 skills, >=20% transfer", () => {
    const good = {
      armAPerHypothesisRate: 0.2,
      armBBatchHitRate: 0.45,
      effectivePlaybookSkills: 6,
      transferImprovement: 0.25,
    };
    expect(passesHypoForgeGate(good)).toBe(true);
    expect(passesHypoForgeGate({ ...good, armBBatchHitRate: 0.35 })).toBe(false); // <2x
    expect(passesHypoForgeGate({ ...good, effectivePlaybookSkills: 4 })).toBe(false);
    expect(passesHypoForgeGate({ ...good, transferImprovement: 0.1 })).toBe(false);
  });
});
