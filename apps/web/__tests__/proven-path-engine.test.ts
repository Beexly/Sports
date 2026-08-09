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
      rows.push({
        // confidence near coin flip — weak ranking
        pConfidence: 0.5 + (i % 3) * 0.01 - 0.01,
        // inverted edge diagnostic — if used as p would anti-rank
        pEdge: win ? 0.2 : 0.8,
        // strong independent separation
        pIndependent: win ? 0.78 : 0.22,
        y: win ? 1 : 0,
        groupKey: "mlb|MONEYLINE",
        marketP: 0.5,
      });
    }
    const plan = buildProvenPathPlan(rows, { minN: 40 });
    expect(
      plan.bestScore === "independent_trueProb" ||
        plan.bestScore === "blend_indep_conf",
    ).toBe(true);
    const best = plan.scoreBakeoff.find((r) => r.score === plan.bestScore)!;
    expect(best.separation).toBeGreaterThan(0);
    expect(plan.scoreBakeoff.map((r) => r.score)).not.toContain("edgeScore");
  });

  it("edge-as-p path does not exist in bake-off kinds", () => {
    const rows: ProvenPathPickRow[] = Array.from({ length: 120 }, (_, i) => ({
      pConfidence: 0.55,
      pEdge: i % 2 === 0 ? 0.9 : 0.1,
      pIndependent: null,
      y: (i % 2) as 0 | 1,
      groupKey: "nba|ml",
      marketP: null,
    }));
    const plan = buildProvenPathPlan(rows);
    for (const row of plan.scoreBakeoff) {
      expect(row.score === "edgeScore" || row.score === "blend_conf_edge").toBe(
        false,
      );
    }
  });

  it("separation ≤ 0 cannot beat confidence when confidence n is sufficient", () => {
    // Independent inverted: high p on losses → separation < 0 and high junk RES possible
    const rows: ProvenPathPickRow[] = [];
    for (let i = 0; i < 200; i++) {
      const win = i % 2 === 0;
      rows.push({
        pConfidence: win ? 0.62 : 0.45, // mild positive sep
        pIndependent: win ? 0.15 : 0.85, // inverted
        pEdge: win ? 0.1 : 0.9,
        y: win ? 1 : 0,
        groupKey: "nfl|spread",
        marketP: 0.5,
      });
    }
    const plan = buildProvenPathPlan(rows, { minN: 40 });
    const indep = plan.scoreBakeoff.find((r) => r.score === "independent_trueProb");
    expect(indep).toBeDefined();
    expect(indep!.separation).toBeLessThanOrEqual(0);
    // Must not promote inverted independent
    expect(plan.bestScore).toBe("confidence");
    const conf = plan.scoreBakeoff.find((r) => r.score === "confidence")!;
    expect(conf.n).toBeGreaterThanOrEqual(50);
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
