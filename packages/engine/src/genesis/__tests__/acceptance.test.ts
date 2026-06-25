/**
 * GENESIS LAYER — Acceptance Scenarios (A–G), wired end-to-end against real modules.
 *
 * The acceptance bar is NOT "did it find a good pick?" It is: can GSE invent a candidate concept,
 * formalize it, test it, compare it to existing concepts, survive prosecutor review, and either
 * promote it (as a HYPOTHESIS, not a LAW) or bury it? Nothing here flips a live gate, makes a public
 * claim, or uses certainty language.
 */

import { describe, it, expect } from "vitest";
import { scoutUnknowns, type ResidualObservation } from "../unknown-unknown-scout.js";
import { scoreCreativity } from "../proof-weighted-creativity.js";
import { evaluateConstitution, type ConstitutionEvidence } from "../law-making-constitution.js";
import { computeRBET, type RBETInput } from "../reality-belief-entanglement-tensor.js";
import { assessGhostSimilarity, type GhostFeatureCluster } from "../ghost-similarity-physics.js";
import { mapMinefield } from "../anti-edge-minefield.js";
import { computeScarcityCurvature } from "../scarcity-curvature.js";
import { assessContestField } from "../contest-field-reflexivity.js";
import { assessReflexiveRisk } from "../reflexive-product-risk.js";

// ── A. New concept proposal from unexplained residuals. ──────────────────────────────────────────
describe("A. The scout invents a candidate concept from an unexplained, recurring residual", () => {
  it("proposes a concept with a formula sketch, mechanism, and falsifier", () => {
    const obs: ResidualObservation[] = [
      { id: "r1", label: "pre_box_value_move", surface: "dfs_salary", residual: 0.6, explainedByExistingConcept: false, distanceFromOntology: 0.8, recurrence: 0.7, crossSurface: 0.7, decisionLeverageGain: 0.5, complexity: 0.2, hallucinationRisk: 0.1, proofGap: 0.2 },
    ];
    const p = scoutUnknowns(obs);
    expect(p).toHaveLength(1);
    expect(p[0]!.formulaSketch).toMatch(/≈/);
    expect(p[0]!.mechanism.length).toBeGreaterThan(0);
    expect(p[0]!.falsifier).toMatch(/out-of-sample|recur/i);
  });
});

// ── B. A cool-sounding concept is rejected for adding language without compression. ──────────────
describe("B. A concept that adds language but no compression is rejected", () => {
  it("creativity scoring rejects it AND the constitution rejects it", () => {
    expect(scoreCreativity({ novelty: 0.8, compression: 0.05, decisionLeverage: 0.05, crossSurfaceSupport: 0.1, hallucinationRisk: 0.1, complexity: 0.3, ghostSimilarity: 0.1, governanceRisk: 0.1 }).verdict).toBe("language_without_substance");
    const e: ConstitutionEvidence = { novelty: 0.8, compression: 0.02, decisionLeverage: 0.01, falsifiable: true, replaySurvived: true, crossSurfaceSupport: 0.1, ghostDefense: 0.8, governanceSafe: true, simplicity: 0.6, oosWindowsSurvived: 1 };
    expect(evaluateConstitution(e).verdict).toBe("REJECTED");
  });
});

// ── C. Cross-surface discovery: the same shock appears late on the lagging observer. ─────────────
describe("C. The entanglement tensor maps belief propagation and names the lagging observer", () => {
  it("identifies the analyst rank as the laggard while the prop already reflects the role shock", () => {
    const input: RBETInput = {
      entity: "WR2", trueRoleState: 0.72,
      readings: [
        { observer: "prop_market", impliedRoleState: 0.7, dataQuality: 0.9 },   // reacted
        { observer: "dfs_salary", impliedRoleState: 0.5, dataQuality: 0.8 },     // partial / stale
        { observer: "waiver_roster", impliedRoleState: 0.45, dataQuality: 0.7 }, // lagging
        { observer: "analyst", impliedRoleState: 0.4, dataQuality: 0.8 },        // most lagging
      ],
    };
    const r = computeRBET(input);
    expect(r.laggards[0]).toBe("analyst"); // most under-reacted is first
    expect(r.crossSurfaceContradiction).toBeGreaterThan(0.1);
  });
});

// ── D. Ghost defense: an attractive candidate resembling a TD-spike trap is killed. ──────────────
describe("D. A candidate resembling a prior TD-spike trap is downgraded despite an attractive projection", () => {
  const tdSpike: GhostFeatureCluster = { id: "td-spike", centroid: [0.9, 0.1, 0.1, 0.85], failureSeverity: 1, marketFamily: "rb_rush", recencyWeight: 1, sampleReliability: 1 };
  it("ghost-similarity suppresses it and the minefield kills it outright", () => {
    const ghost = assessGhostSimilarity({ features: [0.88, 0.12, 0.12, 0.83], marketFamily: "rb_rush" }, [tdSpike]);
    expect(ghost.suppressed).toBe(true);
    const mine = mapMinefield({ candidateEdge: 0.8 /* attractive */, mines: [{ kind: "ghost_similarity", pressure: ghost.maxPenalty }] });
    expect(mine.survives).toBe(false);
    expect(mine.fatalMine).toBe("ghost_similarity");
  });
});

// ── E. Scarcity curvature: the same add is PASS shallow, ADD deep, AGGRESSIVE in superflex. ──────
describe("E. Scarcity curvature makes the same player a different decision by context", () => {
  it("action impact rises from shallow to deep to a superflex-scarce context", () => {
    const shallow = computeScarcityCurvature({ position: "RB", format: "ppr", playerRank: 30, replacementRank: 34, benchDepth: 7, waiverPoolQuality: 0.8, byeWeekPressure: 0.1, playoffContext: 0.2 });
    const deep = computeScarcityCurvature({ position: "RB", format: "ppr", playerRank: 30, replacementRank: 48, benchDepth: 3, waiverPoolQuality: 0.2, byeWeekPressure: 0.4, playoffContext: 0.6 });
    const superflex = computeScarcityCurvature({ position: "QB", format: "superflex", playerRank: 12, replacementRank: 26, benchDepth: 3, waiverPoolQuality: 0.2, byeWeekPressure: 0.4, playoffContext: 0.7 });
    expect(deep.actionImpact).toBeGreaterThan(shallow.actionImpact);
    expect(superflex.actionImpact).toBeGreaterThan(shallow.actionImpact);
    // …while the DFS leg is neutral/fade due to ownership, not scarcity.
    const dfs = assessContestField({ projectedOwnership: 0.3, fairOwnership: 0.28, salaryRelief: 0.3, publicStackTendency: 0.3, fieldSize: 50_000, lateNewsRisk: 0.1 });
    expect(dfs.chalkType).toBe("neutral");
  });
});

// ── F. Reflexive risk: a DFS-leverage discovery is marked PERSONALIZED_ONLY. ─────────────────────
describe("F. A discovery whose broad publication would destroy DFS ownership leverage is personalized", () => {
  it("marks it PERSONALIZED_ONLY", () => {
    const r = assessReflexiveRisk({ audienceSize: 0.7, marketSensitivity: 0.3, ownershipSensitivity: 0.8, waiverSensitivity: 0.3, liquidity: 0.3, publicness: 0.8, actionCrowding: 0.7 });
    expect(r.disposition).toBe("PERSONALIZED_ONLY");
  });
});

// ── G. Law graduation: a strong formula becomes a HYPOTHESIS, not a LAW, until enough OOS. ────────
describe("G. A formula that survives every gate graduates to HYPOTHESIS, not LAW, until enough OOS windows", () => {
  const passing: ConstitutionEvidence = { novelty: 0.5, compression: 0.4, decisionLeverage: 0.3, falsifiable: true, replaySurvived: true, crossSurfaceSupport: 0.5, ghostDefense: 0.8, governanceSafe: true, simplicity: 0.6, oosWindowsSurvived: 1 };
  it("is a HYPOTHESIS with one OOS window and a LAW only with enough", () => {
    expect(evaluateConstitution(passing).verdict).toBe("GRADUATE_HYPOTHESIS");
    expect(evaluateConstitution({ ...passing, oosWindowsSurvived: 3 }).verdict).toBe("GRADUATE_LAW");
  });
});
