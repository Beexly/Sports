/**
 * Targeted coverage for projectForLens and buildMarketPulse branches not
 * reached by intelligence-graph.test.ts or intelligence-graph-gaps.test.ts.
 *
 * The primary test covers: FAN (canShowEdgeIndex=true, canShowConfidence=false),
 * BETTOR (canShowConfidence=true), ANALYST (canShowFactorBreakdown=true).
 *
 * This file covers:
 *   - CREATOR lens: canShowConfidence=false, canShowFactorBreakdown=false
 *   - FANTASY lens: canShowConfidence=false, canShowFactorBreakdown=false
 *   - ANALYST lens: canShowConfidence=true (not tested in primary)
 *   - visibleSummary FAN format: includes matchup + "evidence health" phrase
 *   - visibleSummary non-FAN format: includes "Edge Index" + "evidence X/100"
 *   - buildMarketPulse: lineMovementSpread/lineMovementTotal when set
 *   - buildMarketPulse: edgeIndex=null when currentEdgeIndex is null/absent
 *   - buildMarketPulse: bookmakerCoverage=0 when bookmakerCoverageMax is null
 */

import { describe, it, expect } from "vitest";
import {
  projectForLens,
  buildMarketPulse,
  buildGameIntelligenceNode,
} from "@/lib/intelligence-graph";
import type { IntelligenceGameInput } from "@/lib/intelligence-graph";
import { fixtureGame } from "@/__fixtures__/intelligence-graph/game-node";

const NOW = new Date("2026-05-22T18:30:00.000Z");

function makeNode(gameOverrides: Partial<IntelligenceGameInput> = {}) {
  return buildGameIntelligenceNode({
    game: { ...fixtureGame, ...gameOverrides },
    picks: [],
    signals: [],
    now: NOW,
  });
}

// ============================================================
// projectForLens — CREATOR lens
// ============================================================

describe("projectForLens — CREATOR lens", () => {
  it("canShowConfidence is false for CREATOR", () => {
    expect(projectForLens(makeNode(), "CREATOR").canShowConfidence).toBe(false);
  });

  it("canShowFactorBreakdown is false for CREATOR", () => {
    expect(projectForLens(makeNode(), "CREATOR").canShowFactorBreakdown).toBe(false);
  });

  it("canShowEdgeIndex is always true for CREATOR", () => {
    expect(projectForLens(makeNode(), "CREATOR").canShowEdgeIndex).toBe(true);
  });

  it("visibleSummary for CREATOR uses non-FAN format (includes Edge Index)", () => {
    const surface = projectForLens(makeNode({ currentEdgeIndex: 72 }), "CREATOR");
    expect(surface.visibleSummary).toContain("Edge Index");
  });
});

// ============================================================
// projectForLens — FANTASY lens
// ============================================================

describe("projectForLens — FANTASY lens", () => {
  it("canShowConfidence is false for FANTASY", () => {
    expect(projectForLens(makeNode(), "FANTASY").canShowConfidence).toBe(false);
  });

  it("canShowFactorBreakdown is false for FANTASY", () => {
    expect(projectForLens(makeNode(), "FANTASY").canShowFactorBreakdown).toBe(false);
  });

  it("canShowEdgeIndex is always true for FANTASY", () => {
    expect(projectForLens(makeNode(), "FANTASY").canShowEdgeIndex).toBe(true);
  });

  it("visibleSummary for FANTASY uses non-FAN format (includes Edge Index)", () => {
    const surface = projectForLens(makeNode({ currentEdgeIndex: 55 }), "FANTASY");
    expect(surface.visibleSummary).toContain("Edge Index");
  });
});

// ============================================================
// projectForLens — ANALYST lens (canShowConfidence not yet tested)
// ============================================================

describe("projectForLens — ANALYST lens canShowConfidence", () => {
  it("canShowConfidence is true for ANALYST (like BETTOR)", () => {
    expect(projectForLens(makeNode(), "ANALYST").canShowConfidence).toBe(true);
  });

  it("visibleSummary for ANALYST uses non-FAN format", () => {
    const surface = projectForLens(makeNode({ currentEdgeIndex: 84 }), "ANALYST");
    expect(surface.visibleSummary).toContain("Edge Index");
    expect(surface.visibleSummary).toContain("evidence");
  });
});

// ============================================================
// projectForLens — visibleSummary content
// ============================================================

describe("projectForLens — visibleSummary FAN format", () => {
  it("FAN summary includes matchup and 'evidence health' phrase", () => {
    const node = makeNode();
    const surface = projectForLens(node, "FAN");
    // Format: "${matchup} has ${evidenceHealth.status.toLowerCase()} evidence health."
    expect(surface.visibleSummary).toContain(node.matchup);
    expect(surface.visibleSummary.toLowerCase()).toContain("evidence health");
  });

  it("FAN summary does not contain 'Edge Index'", () => {
    const surface = projectForLens(makeNode({ currentEdgeIndex: 70 }), "FAN");
    expect(surface.visibleSummary).not.toContain("Edge Index");
  });
});

describe("projectForLens — visibleSummary non-FAN format", () => {
  it("BETTOR summary includes Edge Index and evidence score", () => {
    const node = makeNode({ currentEdgeIndex: 75 });
    const surface = projectForLens(node, "BETTOR");
    // Format: "${matchup}: Edge Index ${edgeIndex ?? 'N/A'}, evidence ${score}/100."
    expect(surface.visibleSummary).toContain("Edge Index 75");
    expect(surface.visibleSummary).toContain("/100");
  });

  it("non-FAN summary shows 'N/A' when edgeIndex is null", () => {
    const node = makeNode({ currentEdgeIndex: null });
    const surface = projectForLens(node, "BETTOR");
    expect(surface.visibleSummary).toContain("Edge Index N/A");
  });
});

// ============================================================
// buildMarketPulse — lineMovementSpread/lineMovementTotal branches
// ============================================================

describe("buildMarketPulse — line movement fields", () => {
  it("sets lineMovementSpread from game field when provided", () => {
    const pulse = buildMarketPulse({ ...fixtureGame, lineMovementSpread: 1.5 });
    expect(pulse.lineMovementSpread).toBe(1.5);
  });

  it("sets lineMovementTotal from game field when provided", () => {
    const pulse = buildMarketPulse({ ...fixtureGame, lineMovementTotal: -0.5 });
    expect(pulse.lineMovementTotal).toBe(-0.5);
  });

  it("lineMovementSpread is null when field is absent", () => {
    const gameWithoutMovement: IntelligenceGameInput = { ...fixtureGame, lineMovementSpread: null };
    const pulse = buildMarketPulse(gameWithoutMovement);
    expect(pulse.lineMovementSpread).toBeNull();
  });

  it("lineMovementTotal is null when field is absent", () => {
    const gameWithoutMovement: IntelligenceGameInput = { ...fixtureGame, lineMovementTotal: null };
    const pulse = buildMarketPulse(gameWithoutMovement);
    expect(pulse.lineMovementTotal).toBeNull();
  });
});

describe("buildMarketPulse — edgeIndex null fallback", () => {
  it("edgeIndex is null when currentEdgeIndex is null", () => {
    const pulse = buildMarketPulse({ ...fixtureGame, currentEdgeIndex: null });
    expect(pulse.edgeIndex).toBeNull();
  });
});

describe("buildMarketPulse — bookmakerCoverage zero fallback", () => {
  it("bookmakerCoverage is 0 when bookmakerCoverageMax is null", () => {
    const pulse = buildMarketPulse({ ...fixtureGame, bookmakerCoverageMax: null });
    expect(pulse.bookmakerCoverage).toBe(0);
  });
});
