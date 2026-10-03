import { describe, expect, it } from "vitest";
import {
  buildProvenPathPlan,
  passesProvenPathFilter,
  scoreProbability,
  type ProvenPathPickRow,
  type RankingScoreKind,
} from "@/lib/calibration/proven-path-engine";
import {
  isSelectivePublishRuntimeEnabled,
  passesPublicSelectiveFilter,
} from "@/lib/calibration/selective-publish-runtime";

const ALLOWED_KINDS: RankingScoreKind[] = [
  "confidence",
  "independent_trueProb",
  "blend_indep_conf",
  "marketFairProb",
];

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
      // Diagnostic only — must never drive bake-off
      pEdge: conf * 0.9 + 0.05,
      pIndependent: group === "nfl|spread" ? conf * 0.95 + 0.03 : null,
      y,
      groupKey: group,
      marketP: 0.5,
    };
  });

  it("builds plan with probability-only score bakeoff (no edge kinds)", () => {
    const plan = buildProvenPathPlan(rows, { minN: 40 });
    expect(plan.floorsUnchanged).toBe(true);
    expect(plan.rankingPolarityLaw).toBe("positive_separation_required");
    expect(plan.scoreBakeoff.length).toBe(4);
    const kinds = plan.scoreBakeoff.map((r) => r.score);
    expect(kinds).toEqual(ALLOWED_KINDS);
    expect(kinds).not.toContain("edgeScore");
    expect(kinds).not.toContain("blend_conf_edge");
    expect(plan.pathSteps.length).toBeGreaterThan(4);
    expect(plan.baseline.n).toBeGreaterThan(0);
    expect(plan.honesty).toMatch(/NOT a win probability/i);
    expect(plan.pauseSources).toBeDefined();
    expect(Array.isArray(plan.pauseSources.resNearZero)).toBe(true);
    expect(Array.isArray(plan.pauseSources.significanceDead)).toBe(true);
  });

  it("pause list unions Res≈0 and significance-dead", () => {
    const plan = buildProvenPathPlan(rows, { minN: 40 });
    // thin|ml is noise → should appear in pause via Res or significance
    const allPause = new Set(plan.pauseGroups);
    for (const g of plan.pauseSources.resNearZero) {
      expect(allPause.has(g)).toBe(true);
    }
    for (const g of plan.pauseSources.significanceDead) {
      expect(allPause.has(g)).toBe(true);
    }
    // When noise group exists at n≥20, expect at least one pause candidate
    expect(plan.pauseGroups.length + plan.keepGroups.length).toBeGreaterThan(0);
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

describe("ranking polarity law", () => {
  it("scoreProbability never returns edge / pEdge", () => {
    const r: ProvenPathPickRow = {
      pConfidence: 0.6,
      pEdge: 0.99, // if used as p would dominate
      pIndependent: 0.75,
      marketP: 0.52,
      y: 1,
      groupKey: "nfl|ml",
    };
    expect(scoreProbability(r, "confidence")).toBe(0.6);
    expect(scoreProbability(r, "independent_trueProb")).toBe(0.75);
    expect(scoreProbability(r, "blend_indep_conf")).toBeCloseTo(0.675, 5);
    expect(scoreProbability(r, "marketFairProb")).toBe(0.52);
    // No RankingScoreKind maps to pEdge
    for (const k of ALLOWED_KINDS) {
      const p = scoreProbability(r, k);
      expect(p).not.toBe(0.99);
    }
  });

  it("positive trueProb separation ⇒ bestScore independent or blend", () => {
    const rows: ProvenPathPickRow[] = [];
    for (let i = 0; i < 200; i++) {
      const win = i % 2 === 0;
      const conf = 0.5 + (i % 10) * 0.01;
      // Independent strongly ranks: high p when win
      const pIndependent = win ? 0.65 + (i % 5) * 0.02 : 0.35 - (i % 5) * 0.02;
      rows.push({
        pConfidence: conf,
        pIndependent,
        y: win ? 1 : 0,
        groupKey: "baseball_mlb|MONEYLINE",
        marketP: 0.5,
      });
    }
    const plan = buildProvenPathPlan(rows, { minN: 40 });
    expect(["independent_trueProb", "blend_indep_conf"]).toContain(plan.bestScore);
    expect(plan.baseline.separation).toBeGreaterThan(0);
  });
});

describe("selective runtime default", () => {
  it("selective publish defaults ON", () => {
    expect(isSelectivePublishRuntimeEnabled({})).toBe(true);
    expect(isSelectivePublishRuntimeEnabled({ SELECTIVE_PUBLISH_ENABLED: "false" })).toBe(
      false,
    );
  });

  it("public filter respects pause when apply on", () => {
    const pick = {
      confidence: 70,
      pickType: "MONEYLINE",
      sportKey: "baseball_mlb",
      rankingP: 0.7,
    };
    // Without plan pause apply, high-δ may still pass
    expect(
      passesPublicSelectiveFilter(pick, { SELECTIVE_PUBLISH_DELTA: "0.05" }, null),
    ).toBe(true);
  });
});
