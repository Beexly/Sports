import { describe, it, expect } from "vitest";
import {
  buildIntelligenceGrowthSnapshot,
  CANONICAL_QUAD_ENGINE_DEFAULTS,
  CANONICAL_ROUTER_FUNNEL_DEFAULTS,
} from "@/lib/intelligence/growth-observatory";

describe("Live Intelligence & Reasoning Growth Observatory", () => {
  it("builds a snapshot with exact canonical defaults", () => {
    const snapshot = buildIntelligenceGrowthSnapshot();

    expect(snapshot.quadEngineCounts).toEqual({
      arxivPapers: 1252,
      openalexWorks: 761,
      kaggleAssets: 101,
      hfDatasetsAndEquations: 84,
      docxOmmlEquations: 277,
      tsEquationModules: 1727,
      totalCanonicalNodes: 3646,
    });

    expect(snapshot.routerFunnel).toEqual({
      stageA: 3646,
      stageB: 2000,
      stageC: 250,
      stageD: 25,
    });

    expect(snapshot.postGameAutopsyStats.gamesGraded).toBe(112);
    expect(snapshot.postGameAutopsyStats.ourDefectCount).toBe(9);
    expect(snapshot.postGameAutopsyStats.sharedBlindCount).toBe(14);
    expect(snapshot.postGameAutopsyStats.weSawCount).toBe(89);

    expect(snapshot.autonomousPipelineStatus.activePackagesPublished).toBe(18);
    expect(snapshot.autonomousPipelineStatus.activeAgentsOnline).toBe(22);
    expect(typeof snapshot.timestampIso).toBe("string");
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

  it("merges partial overrides correctly", () => {
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
    expect(customSnapshot.quadEngineCounts.kaggleAssets).toBe(101);
    expect(customSnapshot.routerFunnel.stageD).toBe(30);
    expect(customSnapshot.routerFunnel.stageA).toBe(3646);
  });
});
