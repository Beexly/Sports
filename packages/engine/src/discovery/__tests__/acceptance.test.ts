/**
 * DISCOVERY LAYER — Acceptance Scenarios (A–G).
 *
 * The owner's acceptance test, wired end-to-end against the real modules (no mocks):
 *
 *   Given a fixture market sequence, can GSE:
 *     • reconstruct belief-state transitions,
 *     • propose ≥2 competing causal theories,
 *     • design the cheapest falsifying experiment,
 *     • rank by compression / OOS survivability,
 *     • detect friction survival,
 *     • bury failed theories into the ghost economy,
 *     • update ontology ONLY when a concept earns its keep?
 *
 * Each scenario asserts one of those capabilities on a deterministic fixture. Nothing here flips a
 * live gate, sets priced=true, makes a public claim, or uses certainty language — every disposition
 * is shadow/research-only.
 */

import { describe, it, expect } from "vitest";
import { runDiscoveryCycle, type CouncilInput } from "../scientific-discovery-council.js";
import { scoreTheoryValue, type TheoryEvidence } from "../epistemic-compression.js";
import { rankByEDY, type DiscoveryYieldInputs } from "../expected-discovery-yield.js";
import { assessAgainstGhosts, type GhostCluster } from "../ghost-economy.js";
import { detectDarkMatter } from "../market-dark-matter.js";
import { assembleBeliefTransition, withLearning } from "../belief-state-transition.js";
import { evaluateLightCone } from "../../einstein/information-light-cone.js";
import { assessTradability } from "../../einstein/tradability-filter.js";
import { convene } from "../../einstein/self-disproof-court.js";

// ── Shared fixture: a confirmed WR1-out injury shock; props lag the main market. ─────────────────
const GHOST_EARLY_UNDER: GhostCluster = {
  id: "ghost:early-season-total-under",
  shape: { marketFamily: "total", side: "UNDER", structure: "early_season" },
  failureReason: "settlement_negative",
  severity: 1,
  recencyWeight: 1,
};

const INJURY_TRADABILITY = {
  rawEdge: 0.06, vig: 0.01, spread: 0.005, latencyCost: 0.005, executeMin: 3, windowMin: 25,
  limitProxy: 0.7, correlationPenalty: 0.005, modelError: 0.005, dataQualityOk: true, publicationDelayCost: 0.005,
} as const;

function injuryCouncilInput(overrides: Partial<CouncilInput> = {}): CouncilInput {
  return {
    observation: "WR1 ruled out; team total moved but WR2 reception-yard props lagged the main market",
    theories: [
      {
        id: "A", name: "derivative-prop-lag",
        shape: { marketFamily: "player_reception_yds", side: "OVER", structure: "derivative_lag" },
        entrant: { id: "A", name: "derivative-prop-lag", oosGain: 0.6, compressionGain: 0.5, causalPlausibility: 0.5, tradabilityExplanation: 0.4, complexity: 0.3, instabilityRisk: 0.1, leakageRisk: 0, rightsRisk: 0, ghostSimilarity: 0 },
        evidence: { predictiveGain: 0.5, causalExplanationGain: 0.4, compressionGain: 0.5, tradabilityGain: 0.3, complexityPenalty: 0.2, dataRightsRisk: 0.05, instabilityPenalty: 0.1, leakageRisk: 0, seasonsSurvived: 3, marketFamiliesSurvived: 2, booksSurvived: 2, outOfSampleSurvived: true },
      },
      {
        id: "B", name: "early-season-under-redux",
        shape: { marketFamily: "total", side: "UNDER", structure: "early_season" },
        entrant: { id: "B", name: "early-season-under-redux", oosGain: 0.4, compressionGain: 0.3, causalPlausibility: 0.2, tradabilityExplanation: 0.2, complexity: 0.3, instabilityRisk: 0.2, leakageRisk: 0, rightsRisk: 0, ghostSimilarity: 0 },
        evidence: { predictiveGain: 0.3, causalExplanationGain: 0.1, compressionGain: 0.2, tradabilityGain: 0.1, complexityPenalty: 0.3, dataRightsRisk: 0.05, instabilityPenalty: 0.2, leakageRisk: 0, seasonsSurvived: 1, marketFamiliesSurvived: 1, booksSurvived: 1, outOfSampleSurvived: false },
      },
    ],
    experiments: [
      { id: "injury_replay", deltaPredictiveInformation: 0.4, deltaCausalCertainty: 0.4, deltaCompression: 0.2, deltaTradabilityCertainty: 0.2, deltaGateUnlockProbability: 0.2, deltaFalseConfidenceRisk: 0.05, dataCost: 0.4, rightsRisk: 0.1, engineeringTime: 0.2, operationalComplexity: 0.2 },
    ],
    ghostClusters: [GHOST_EARLY_UNDER],
    winnerTradability: INJURY_TRADABILITY,
    rightsStatus: "cleared",
    ontologyProposal: { name: "Derivative Echo Lag", compressionGain: 0.5, survivesFalsification: true },
    ...overrides,
  };
}

// ── A. Confirmed injury shock where derivative props lag the main market. ────────────────────────
describe("A. Reconstruct the belief-state transition for a confirmed injury shock", () => {
  it("reconstructs a knowable, court-cleared, friction-surviving transition and attaches a learning outcome", () => {
    // The information light cone: knowable at decision, prop family not yet absorbed → open window.
    const lightCone = evaluateLightCone(
      {
        eventId: "wr1-out", eventType: "injury_confirmed",
        eventTime: "2026-01-04T17:00:00Z",
        sourceFirstSeenTime: "2026-01-04T17:05:00Z",
        sourceConfirmedTime: "2026-01-04T17:10:00Z",
        marketFamilyAbsorptionTime: { player_reception_yds: "2026-01-04T17:40:00Z" },
      },
      { decisionTime: "2026-01-04T17:15:00Z", marketFamily: "player_reception_yds" },
    );
    expect(lightCone.status).toBe("inside_window");
    expect(lightCone.knowableAtDecision).toBe(true);

    const tradability = assessTradability(INJURY_TRADABILITY);
    expect(tradability.status).toBe("EXECUTABLE_SHADOW");

    const court = convene({
      lightConeStatus: lightCone.status, tradabilityStatus: tradability.status,
      survivesSeparation: true, dataRightsCleared: true, clvBeatSharpClose: true,
    });
    expect(court.survives).toBe(true);

    const transition = assembleBeliefTransition({
      id: "bt-wr1-out", marketKey: "NFL:player_reception_yds:WR2",
      decisionTime: "2026-01-04T17:15:00Z",
      whatChanged: "WR1 ruled out; WR2 target share rises.",
      whatShouldHaveChanged: "WR2 reception-yard line should rise with the team total.",
      whatFailedToChange: "WR2 prop lagged the main-market move for ~20 minutes.",
      provenance: { discoveredBy: "discovery-acceptance", reportPath: "DISCOVERY_LAYER_STATUS.md" },
      lightCone, dataQualityStatus: "ok", rightsStatus: "cleared",
      tradability, court,
      graveyard: { matched: false, deadEdge: null, suppressionNote: null },
      immuneSurvived: true,
    });
    expect(transition.disposition).toBe("EXECUTABLE_SHADOW");

    const learned = withLearning(transition, {
      theoryId: "A", effect: "supports", resultingStatus: "HYPOTHESIS",
      note: "Transition supports the derivative-prop-lag theory; promote to a tracked hypothesis.",
    });
    expect(learned.learning.theoryId).toBe("A");
    expect(learned.learning.effect).toBe("supports");
  });

  it("runs the full council: ≥2 theories, derivative-lag wins, shadow-track (not live) task emitted", () => {
    const r = runDiscoveryCycle(injuryCouncilInput());
    expect(injuryCouncilInput().theories.length).toBeGreaterThanOrEqual(2);
    expect(r.winner!.id).toBe("A");
    expect(r.tradabilityStatus).toBe("EXECUTABLE_SHADOW");
    expect(r.researchTasks.join(" ")).toMatch(/shadow-track/i);
    expect(r.researchTasks.join(" ")).toMatch(/no live bet, no gate/i);
    // Governance: rights cleared permits a claim but the council never emits certainty language.
    expect(r.publicClaimAllowed).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/guaranteed|lock|sure thing|certain win/i);
  });
});

// ── B. Rank by compression / OOS survivability. ──────────────────────────────────────────────────
describe("B. Compression and OOS survivability decide which theory is a LAW", () => {
  const simpleBroadLaw: TheoryEvidence = {
    predictiveGain: 0.5, causalExplanationGain: 0.4, compressionGain: 0.5, tradabilityGain: 0.3,
    complexityPenalty: 0.2, dataRightsRisk: 0.05, instabilityPenalty: 0.1, leakageRisk: 0,
    seasonsSurvived: 3, marketFamiliesSurvived: 2, booksSurvived: 2, outOfSampleSurvived: true,
  };
  const complexNarrowInSample: TheoryEvidence = {
    predictiveGain: 0.55, causalExplanationGain: 0.2, compressionGain: 0.1, tradabilityGain: 0.2,
    complexityPenalty: 0.6, dataRightsRisk: 0.05, instabilityPenalty: 0.3, leakageRisk: 0,
    seasonsSurvived: 1, marketFamiliesSurvived: 1, booksSurvived: 1, outOfSampleSurvived: false,
  };
  it("promotes the simple, broad, OOS-surviving theory to LAW", () => {
    expect(scoreTheoryValue(simpleBroadLaw).status).toBe("LAW");
  });
  it("buries the complex, narrow, in-sample-only theory as a GHOST (despite higher raw predictive gain)", () => {
    expect(scoreTheoryValue(complexNarrowInSample).status).toBe("GHOST");
  });
});

// ── C. Design the cheapest falsifying experiment. ────────────────────────────────────────────────
describe("C. Select the cheapest high-yield falsifying experiment", () => {
  it("ranks a cheap informative replay above an expensive net-negative feed", () => {
    const experiments: DiscoveryYieldInputs[] = [
      { id: "injury_replay", deltaPredictiveInformation: 0.4, deltaCausalCertainty: 0.4, deltaCompression: 0.2, deltaTradabilityCertainty: 0.2, deltaGateUnlockProbability: 0.2, deltaFalseConfidenceRisk: 0.05, dataCost: 0.4, rightsRisk: 0.1, engineeringTime: 0.2, operationalComplexity: 0.2 },
      { id: "premium_social_feed", deltaPredictiveInformation: 0.1, deltaCausalCertainty: 0.0, deltaCompression: 0.0, deltaTradabilityCertainty: 0.0, deltaGateUnlockProbability: 0.0, deltaFalseConfidenceRisk: 0.5, dataCost: 0.8, rightsRisk: 0.6, engineeringTime: 0.4, operationalComplexity: 0.4 },
    ];
    const ranked = rankByEDY(experiments);
    expect(ranked[0]!.id).toBe("injury_replay");
    expect(ranked.find((x) => x.id === "premium_social_feed")!.edy).toBeLessThanOrEqual(0);
    // The council picks the same cheapest falsifier.
    const r = runDiscoveryCycle(injuryCouncilInput({ experiments }));
    expect(r.cheapestExperiment!.id).toBe("injury_replay");
  });
});

// ── D. Detect friction survival (a clever theory that dies on cost). ─────────────────────────────
describe("D. Detect friction survival — a theoretically interesting winner can still be friction-killed", () => {
  it("flags a sub-friction edge as FRICTION_KILLED and routes it to burial, not shadow-tracking", () => {
    const tinyEdge = { ...INJURY_TRADABILITY, rawEdge: 0.02 }; // < summed frictions
    const trad = assessTradability(tinyEdge);
    expect(trad.status).toBe("FRICTION_KILLED");

    const r = runDiscoveryCycle(injuryCouncilInput({ winnerTradability: tinyEdge }));
    expect(r.tradabilityStatus).toBe("FRICTION_KILLED");
    expect(r.researchTasks.join(" ")).toMatch(/friction-killed/i);
    expect(r.researchTasks.join(" ")).not.toMatch(/shadow-track/i);
  });
});

// ── E. Bury an in-sample mirage into the ghost economy after OOS failure. ────────────────────────
describe("E. An in-sample-pretty theory is buried by the ghost economy after OOS failure", () => {
  it("classifies a resurrected early-season-under as a GHOST and buries it in the tournament", () => {
    // It resembles a buried failure cluster…
    const ghostHit = assessAgainstGhosts(
      { marketFamily: "total", side: "UNDER", structure: "early_season" },
      [GHOST_EARLY_UNDER],
    );
    expect(ghostHit.suppressed).toBe(true);

    // …and the council's Historian + tournament bury it; its compression status is GHOST.
    const r = runDiscoveryCycle(injuryCouncilInput());
    expect(r.buried.map((b) => b.id)).toContain("B");
    expect(r.theoryStatuses["B"]).toBe("GHOST");
    expect(r.winner!.id).toBe("A"); // the survivor, not the mirage
  });
});

// ── F. Unexplained pressure is quarantined — no fabricated cause, no public claim. ───────────────
describe("F. Hidden-pressure (market dark matter) is quarantined, never published as fact", () => {
  it("routes sharp-before-public movement with no news to RESEARCH_ONLY with no public claim", () => {
    const v = detectDarkMatter({
      sharpBeforePublicMs: 180_000, asymmetricPropMovement: 0.6, altCurvatureShift: 0.5,
      publicNewsPresent: false, sourceCleared: false,
    });
    expect(v.hiddenPressureDetected).toBe(true);
    expect(v.disposition).toBe("RESEARCH_ONLY");
    expect(v.publicClaimAllowed).toBe(false);
    expect(v.quarantined).toBe(true);
    expect(v.affectedStateGuess).not.toMatch(/insider|leak|we know/i);
  });
  it("does NOT fire when a public news item already explains the move", () => {
    const v = detectDarkMatter({
      sharpBeforePublicMs: 180_000, asymmetricPropMovement: 0.6, altCurvatureShift: 0.5,
      publicNewsPresent: true, sourceCleared: false,
    });
    expect(v.disposition).toBe("NO_SIGNAL");
  });
});

// ── G. Update ontology only when a concept earns its keep. ───────────────────────────────────────
describe("G. A self-extending ontology proposal must compress, not just add language", () => {
  it("accepts a term that compresses AND survives falsification", () => {
    const r = runDiscoveryCycle(injuryCouncilInput({
      ontologyProposal: { name: "Derivative Echo Lag", compressionGain: 0.5, survivesFalsification: true },
    }));
    expect(r.ontologyDecision).toBe("accepted");
  });
  it("rejects a term that adds language but no compression", () => {
    const r = runDiscoveryCycle(injuryCouncilInput({
      ontologyProposal: { name: "Quantum Vibe Resonance", compressionGain: 0, survivesFalsification: true },
    }));
    expect(r.ontologyDecision).toBe("rejected");
  });
  it("rejects a compressing term that does not survive falsification", () => {
    const r = runDiscoveryCycle(injuryCouncilInput({
      ontologyProposal: { name: "Overfit Lore", compressionGain: 0.6, survivesFalsification: false },
    }));
    expect(r.ontologyDecision).toBe("rejected");
  });
});
