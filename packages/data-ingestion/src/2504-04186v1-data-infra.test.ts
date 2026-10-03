/**
 * Tests for ./2504-04186v1-data-infra (arXiv:2504.04186v1, lane=data_infra).
 *
 * ACCEPTANCE GATE: ADOPT the hook iff: (a) uncompacted 8-week fragmentation degrades the training-path join by ≥ 20% vs post-OPTIMIZE; (b) weekly OPTIMIZE cost < 5% of the weekly build's compute cost; (c) zero write-write conflicts over 4 consecutive weeks of hook operation.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2504-04186v1-data-infra";

describe("2504.04186v1 compaction frontier scaffold", () => {
  it("enumerates a Pareto frontier and selects a knee", () => {
    const plan = mod.buildCompactionPlan([
      { id: "cheap", fragmentationReduction: 0.2, computeHours: 1 },
      { id: "balanced", fragmentationReduction: 0.4, computeHours: 2 },
      { id: "expensive", fragmentationReduction: 0.4, computeHours: 4 },
      { id: "weak", fragmentationReduction: 0.1, computeHours: 1 },
    ]);
    expect(plan?.frontier.map((candidate) => candidate.id)).toEqual(["cheap", "balanced"]);
    expect(plan?.knee?.id).toBe("balanced");
    expect(mod.buildCompactionPlan([{ id: "x", fragmentationReduction: -1, computeHours: 1 }])).toBeNull();
  });

  it("evaluates every measured acceptance criterion", () => {
    const result = mod.evaluateCompactionGate({
      uncompactedJoinDegradation: 0.4,
      optimizedJoinDegradation: 0.1,
      weeklyOptimizeHours: 1,
      weeklyBuildHours: 30,
      writeWriteConflicts: 0,
      consecutiveWeeksObserved: 4,
    });
    expect(result).toEqual({ fragmentationGate: true, costGate: true, conflictGate: true, passes: true });
    expect(mod.evaluateCompactionGate({
      uncompactedJoinDegradation: 0.4,
      optimizedJoinDegradation: 0.1,
      weeklyOptimizeHours: 2,
      weeklyBuildHours: 30,
      writeWriteConflicts: 1,
      consecutiveWeeksObserved: 4,
    }).passes).toBe(false);
  });

  it("keeps the weekly hook disabled by default", () => {
    expect(mod.ENABLED).toBe(false);
    expect(mod.runWeeklyOptimizeHook()).toEqual({ executed: false, reason: "disabled-by-default" });
  });
});
