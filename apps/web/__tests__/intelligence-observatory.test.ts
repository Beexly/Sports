import { describe, it, expect } from "vitest";
import {
  buildIntelligenceGrowthSnapshot,
  CANONICAL_AUTOPSY_DEFAULTS,
  CANONICAL_PIPELINE_DEFAULTS,
  CANONICAL_QUAD_ENGINE_DEFAULTS,
  CANONICAL_ROUTER_FUNNEL_DEFAULTS,
} from "@/lib/intelligence/growth-observatory";

/**
 * These pins used to re-type the canonical counts (1252 / 761 / 101 / ... /
 * 3646). Every corpus roll moved the source and left the test behind, so the
 * suite reported a failure no user could see and no source fix could clear.
 * The snapshot builder's single source of truth is the exported CANONICAL_*
 * constants, so the assertions read from those constants plus the structural
 * invariants that must hold whatever the counts are. Re-typing a number here
 * is the defect, not the fix.
 */
describe("Live Intelligence & Reasoning Growth Observatory", () => {
  it("builds a snapshot whose defaults are exactly the exported canonical constants", () => {
    const snapshot = buildIntelligenceGrowthSnapshot();

    expect(snapshot.quadEngineCounts).toEqual({ ...CANONICAL_QUAD_ENGINE_DEFAULTS });
    expect(snapshot.routerFunnel).toEqual({ ...CANONICAL_ROUTER_FUNNEL_DEFAULTS });
    expect(snapshot.postGameAutopsyStats).toEqual({
      gamesGraded: CANONICAL_AUTOPSY_DEFAULTS.gamesGraded,
      ourDefectCount: CANONICAL_AUTOPSY_DEFAULTS.ourDefectCount,
      sharedBlindCount: CANONICAL_AUTOPSY_DEFAULTS.sharedBlindCount,
      weSawCount: CANONICAL_AUTOPSY_DEFAULTS.weSawCount,
      brierTrajectory: CANONICAL_AUTOPSY_DEFAULTS.brierTrajectory,
    });
    expect(snapshot.autonomousPipelineStatus).toEqual({ ...CANONICAL_PIPELINE_DEFAULTS });
    expect(typeof snapshot.timestampIso).toBe("string");
    expect(Number.isNaN(Date.parse(snapshot.timestampIso))).toBe(false);
  });

  it("keeps the router funnel anchored to the canonical node count and monotone", () => {
    const { routerFunnel, quadEngineCounts, postGameAutopsyStats } =
      buildIntelligenceGrowthSnapshot();

    // Stage A is every canonical node: if the corpus rolls, the funnel mouth
    // must roll with it rather than drift below the count it claims to route.
    expect(routerFunnel.stageA).toBe(quadEngineCounts.totalCanonicalNodes);

    // A funnel that widens downstream is not a funnel.
    expect(routerFunnel.stageA).toBeGreaterThanOrEqual(routerFunnel.stageB);
    expect(routerFunnel.stageB).toBeGreaterThanOrEqual(routerFunnel.stageC);
    expect(routerFunnel.stageC).toBeGreaterThanOrEqual(routerFunnel.stageD);
    expect(routerFunnel.stageD).toBeGreaterThan(0);

    // The autopsy partitions count games, so none can exceed games graded.
    expect(postGameAutopsyStats.ourDefectCount).toBeLessThanOrEqual(
      postGameAutopsyStats.gamesGraded
    );
    expect(postGameAutopsyStats.sharedBlindCount).toBeLessThanOrEqual(
      postGameAutopsyStats.gamesGraded
    );
    expect(postGameAutopsyStats.weSawCount).toBeLessThanOrEqual(
      postGameAutopsyStats.gamesGraded
    );
    // "Games we saw" must be at least the subset we graded as defects.
    expect(postGameAutopsyStats.weSawCount).toBeGreaterThanOrEqual(
      postGameAutopsyStats.ourDefectCount
    );
  });

  it("filters out NaN, Infinity, and invalid trajectory points", () => {
    const snapshot = buildIntelligenceGrowthSnapshot({
      postGameAutopsyStats: {
        gamesGraded: 120,
        ourDefectCount: 10,
        sharedBlindCount: 15,
        weSawCount: 95,
        brierTrajectory: [
          { week: "W1", brier: 0.22, clvMean: 0.01 },
          { week: "W2", brier: NaN, clvMean: 0.02 },
          { week: "W3", brier: 0.20, clvMean: Infinity },
          { week: "W4", brier: -Infinity, clvMean: 0.03 },
          { week: "W5", brier: 0.18, clvMean: 0.04 },
        ],
      },
    });

    expect(snapshot.postGameAutopsyStats.brierTrajectory).toEqual([
      { week: "W1", brier: 0.22, clvMean: 0.01 },
      { week: "W5", brier: 0.18, clvMean: 0.04 },
    ]);
  });

  it("merges partial overrides without silently resetting untouched defaults", () => {
    const customSnapshot = buildIntelligenceGrowthSnapshot({
      timestampIso: "2026-10-29T12:00:00Z",
      quadEngineCounts: {
        ...CANONICAL_QUAD_ENGINE_DEFAULTS,
        arxivPapers: 1300,
        totalCanonicalNodes: 3700,
      },
      routerFunnel: {
        ...CANONICAL_ROUTER_FUNNEL_DEFAULTS,
        stageD: 30,
      },
    });

    expect(customSnapshot.timestampIso).toBe("2026-10-29T12:00:00Z");
    expect(customSnapshot.quadEngineCounts.arxivPapers).toBe(1300);
    expect(customSnapshot.quadEngineCounts.totalCanonicalNodes).toBe(3700);
    expect(customSnapshot.routerFunnel.stageD).toBe(30);

    // Untouched fields still come from the canon, not from a stale literal.
    expect(customSnapshot.quadEngineCounts.kaggleAssets).toBe(
      CANONICAL_QUAD_ENGINE_DEFAULTS.kaggleAssets
    );
    expect(customSnapshot.routerFunnel.stageA).toBe(
      CANONICAL_ROUTER_FUNNEL_DEFAULTS.stageA
    );
    expect(customSnapshot.postGameAutopsyStats.gamesGraded).toBe(
      CANONICAL_AUTOPSY_DEFAULTS.gamesGraded
    );
    expect(customSnapshot.autonomousPipelineStatus).toEqual({
      ...CANONICAL_PIPELINE_DEFAULTS,
    });
  });
});
