/**
 * Decision Genome fixtures — three honest sample decisions.
 *
 * A clean Signal, a disciplined Pass, and an unsafe Quarantine. Each is assembled with
 * `evaluateAperture` so the recorded aperture state is always consistent with the layers
 * (replay-faithful by construction). Used by tests, demos, and storybook surfaces.
 */

import { evaluateAperture, type ApertureInput } from "./aperture";
import { makeDecisionGenome, type DecisionGenome, type DecisionType } from "./decision-genome";

const LOCK_TIME = Date.parse("2026-09-13T16:00:00.000Z");
const KICKOFF = Date.parse("2026-09-13T17:00:00.000Z");

interface BuildArgs {
  readonly id: string;
  readonly decisionType: DecisionType;
  readonly input: ApertureInput;
}

function build({ id, decisionType, input }: BuildArgs): DecisionGenome {
  const evaluation = evaluateAperture(input);
  return makeDecisionGenome({
    id,
    decisionType,
    aperture: evaluation.state,
    time: {
      window: { decisionLockedAt: LOCK_TIME, eventStartedAt: KICKOFF },
      stamps: { availableAt: LOCK_TIME - 1000 * 60 * 30, trustedAt: LOCK_TIME - 1000 * 60 * 20 },
    },
    market: input.market,
    evidence: input.evidence,
    model: input.model,
    agents: {
      positions: [
        { agent: "scout", claim: "Line will beat close", confidence: 0.62 },
        { agent: "tal", claim: "Sources independent and fresh", confidence: 0.7 },
      ],
    },
    user: { jurisdiction: "US-CO", availableBooks: ["bookA", "bookB"], riskPosture: "balanced", priorWarnings: 0 },
    compliance: input.compliance,
    proof: { proofCardEligible: false, priced: false },
    learning: { whatChanged: [], promoted: [], demoted: [], neverAgain: [] },
  });
}

/** A clean edge that survives every gate → Signal. */
export const signalGenome: DecisionGenome = build({
  id: "genome-signal-1",
  decisionType: "play",
  input: {
    market: { book: "bookA", line: -2.5, price: -110, devigFairProb: 0.5, userAvailable: true, edgeHalfLifeMs: 1000 * 60 * 45 },
    evidence: { sourceTier: "official", independentSources: 3, freshnessAgeMinutes: 20, rightsCleared: true, conflict: false, rumorQuarantined: false, permissions: { decisionUse: true, publicUse: true } },
    model: { modelVersion: "v2026.6.1", probability: 0.58, confidenceDisplay: 64, uncertaintyBand: { low: 0.5, high: 0.66 }, calibrationHealth: 0.78, refused: false },
    compliance: { rightsCleared: true, publicClaimAllowed: true, contestBoundaryRespected: true, responsibleGamingRisk: false, languageClean: true },
  },
});

/** No reachable edge → the pass IS the decision. */
export const passGenome: DecisionGenome = build({
  id: "genome-pass-1",
  decisionType: "pass",
  input: {
    market: { book: "bookA", line: -2.5, price: -110, devigFairProb: 0.55, userAvailable: true },
    evidence: { sourceTier: "tier1", independentSources: 2, freshnessAgeMinutes: 30, rightsCleared: true, conflict: false, rumorQuarantined: false, permissions: { decisionUse: true, publicUse: true } },
    model: { modelVersion: "v2026.6.1", probability: 0.56, confidenceDisplay: 55, uncertaintyBand: { low: 0.49, high: 0.63 }, calibrationHealth: 0.7, refused: false },
    compliance: { rightsCleared: true, publicClaimAllowed: true, contestBoundaryRespected: true, responsibleGamingRisk: false, languageClean: true },
  },
});

/** Rights not cleared / rumor-contaminated → Quarantine. */
export const quarantineGenome: DecisionGenome = build({
  id: "genome-quarantine-1",
  decisionType: "quarantine",
  input: {
    market: { book: "bookA", line: -2.5, price: -110, devigFairProb: 0.5, userAvailable: true },
    evidence: { sourceTier: "rumor", independentSources: 1, freshnessAgeMinutes: 5, rightsCleared: false, conflict: true, rumorQuarantined: true, permissions: { decisionUse: false, publicUse: false } },
    model: { modelVersion: "v2026.6.1", probability: 0.6, confidenceDisplay: 70, uncertaintyBand: { low: 0.5, high: 0.7 }, calibrationHealth: 0.6, refused: false },
    compliance: { rightsCleared: false, publicClaimAllowed: false, contestBoundaryRespected: true, responsibleGamingRisk: false, languageClean: true },
  },
});

export const allFixtures: readonly DecisionGenome[] = [signalGenome, passGenome, quarantineGenome];
