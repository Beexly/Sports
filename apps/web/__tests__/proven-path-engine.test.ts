import { describe, expect, it } from "vitest";
import {
  buildProvenPathPlan,
  passesProvenPathFilter,
} from "@/lib/calibration/proven-path-engine";
import {
  isSelectivePublishRuntimeEnabled,
  passesPublicSelectiveFilter,
} from "@/lib/calibration/selective-publish-runtime";

describe("proven path engine", () => {
  const rows = Array.from({ length: 200 }, (_, i) => {
    const group = i < 100 ? "nfl|spread" : "thin|ml";
    // nfl has ranking; thin is noise
    const conf =
      group === "nfl|spread"
        ? 0.4 + (i % 20) * 0.02
        : 0.48 + (i % 5) * 0.01;
    const y = (
      group === "nfl|spread" ? (conf > 0.55 ? 1 : 0) : i % 2
    ) as 0 | 1;
    return {
      pConfidence: conf,
      pEdge: conf * 0.9 + 0.05,
      y,
      groupKey: group,
      marketP: 0.5,
    };
  });

  it("builds plan with score bakeoff and pause candidates", () => {
    const plan = buildProvenPathPlan(rows, { minN: 40 });
    expect(plan.floorsUnchanged).toBe(true);
    expect(plan.scoreBakeoff.length).toBe(3);
    expect(plan.pathSteps.length).toBeGreaterThan(4);
    expect(plan.baseline.n).toBeGreaterThan(0);
  });

  it("selective can raise or match Res without inventing floors", () => {
    const plan = buildProvenPathPlan(rows, { minN: 40 });
    if (plan.selectiveRecommended && plan.selectiveGainRes != null) {
      expect(plan.selectiveRecommended.n).toBeGreaterThanOrEqual(40);
    }
  });

  it("pause filter rejects paused groups", () => {
    const plan = buildProvenPathPlan(rows, { minN: 40 });
    const blocked = passesProvenPathFilter(
      { p: 0.7, y: 1, groupKey: plan.pauseGroups[0] ?? "thin|ml" },
      plan,
    );
    if (plan.pauseGroups.length > 0) {
      expect(blocked).toBe(false);
    }
  });
});

describe("selective runtime default ON", () => {
  it("default enabled; false only when env false", () => {
    expect(isSelectivePublishRuntimeEnabled({})).toBe(true);
    expect(isSelectivePublishRuntimeEnabled({ SELECTIVE_PUBLISH_ENABLED: "false" })).toBe(
      false,
    );
  });

  it("filters coin flips when on", () => {
    expect(
      passesPublicSelectiveFilter({ confidence: 50 }, {}),
    ).toBe(false);
    expect(
      passesPublicSelectiveFilter({ confidence: 70 }, {}),
    ).toBe(true);
  });
});
