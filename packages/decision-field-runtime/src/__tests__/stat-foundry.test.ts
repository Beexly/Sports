/**
 * THE STAT FOUNDRY + FIVE LEDGERS — tests.
 *
 * Two things to prove: (1) the flagship metrics compute the right values from the PARALLAX engine, and
 * (2) the HONESTY DISCIPLINE holds — a statistic computed on fixture data can never claim more than
 * EXPERIMENTAL, every genome carries a falsifier, and the five ledgers are a faithful read-view of one
 * Decision Object (no new authority).
 */

import { describe, it, expect } from "vitest";
import {
  decisionBoundaryDistance,
  counterfactualRobustnessRadius,
  opportunityTransferMatrix,
  authorityMargin,
  observerLagVector,
  beliefIndependenceScore,
  refusalAlpha,
  maxStatusForEvidence,
  clampStatus,
  FLAGSHIP_STATS,
} from "../stat-foundry.js";
import { projectToLedgers } from "../five-ledgers.js";
import { buildDecisionObject, lightCone, PARALLAX_FIXTURE, FIXTURE_AUTHORITY } from "../parallax-instrument.js";

const cone = lightCone(PARALLAX_FIXTURE.facts, 3);

describe("Flagship metrics — computed from the engine", () => {
  it("Decision Boundary Distance ρ = 0.12 (1 − x*, with x*=0.88)", () => {
    const m = decisionBoundaryDistance(cone);
    expect(m.value).toBe(0.12);
    expect(m.genome.falsifier.length).toBeGreaterThan(0);
  });

  it("Counterfactual Robustness Radius is a fraction in (0,1)", () => {
    const m = counterfactualRobustnessRadius(cone);
    expect(m.value).not.toBeNull();
    expect(m.value!).toBeGreaterThan(0);
    expect(m.value!).toBeLessThan(1);
  });

  it("Opportunity Transfer conserves target mass (residual < 1e-9)", () => {
    const m = opportunityTransferMatrix(0, cone);
    expect(m.value).not.toBeNull();
    expect(m.value!).toBeLessThan(1e-9);
  });

  it("Authority Margin on the fixture is 1 rung, blocked by SOURCE_REALITY", () => {
    const m = authorityMargin(FIXTURE_AUTHORITY);
    expect(m.value).toBe(1);
    expect((m.detail as { blockingLayers: string[] }).blockingLayers).toContain("SOURCE_REALITY");
    expect((m.detail as { ceiling: string }).ceiling).toBe("INFO_ONLY");
  });

  it("Observer Lag Vector: BOOK/FANTASY/CROWD are early (−2), GSE at 0", () => {
    const m = observerLagVector(PARALLAX_FIXTURE.beliefs, 2);
    expect(m.value).toBe(-2);
    const lags = (m.detail as { lags: { observer: string; lag: number }[] }).lags;
    expect(lags.find((l) => l.observer === "GSE")?.lag).toBe(0);
  });

  it("Belief Independence Score = 1.0 (four distinct origins, four observers)", () => {
    const m = beliefIndependenceScore(PARALLAX_FIXTURE.beliefs);
    expect(m.value).toBe(1);
  });

  it("Refusal Alpha is CANDIDATE on fixtures (needs settled outcomes)", () => {
    const m = refusalAlpha([]);
    expect(m.genome.status).toBe("CANDIDATE");
    expect(m.genome.implemented).toBe(false);
  });
});

describe("Honesty discipline — fixtures cannot validate a statistic", () => {
  it("maxStatusForEvidence: FIXTURE/SHADOW → EXPERIMENTAL; OUT_OF_SAMPLE → VALIDATED", () => {
    expect(maxStatusForEvidence("FIXTURE")).toBe("EXPERIMENTAL");
    expect(maxStatusForEvidence("SHADOW")).toBe("EXPERIMENTAL");
    expect(maxStatusForEvidence("OUT_OF_SAMPLE")).toBe("VALIDATED");
  });

  it("clampStatus never lets fixture evidence exceed EXPERIMENTAL", () => {
    expect(clampStatus("OFFICIAL", "FIXTURE")).toBe("EXPERIMENTAL");
    expect(clampStatus("VALIDATED", "FIXTURE")).toBe("EXPERIMENTAL");
    expect(clampStatus("OFFICIAL", "OUT_OF_SAMPLE")).toBe("VALIDATED"); // OFFICIAL still needs owner promotion
    expect(clampStatus("RETIRED", "FIXTURE")).toBe("RETIRED"); // failure states pass through
  });

  it("NO flagship stat claims VALIDATED or OFFICIAL (settled-n = 0, gate HELD)", () => {
    for (const g of FLAGSHIP_STATS) {
      expect(["CANDIDATE", "EXPERIMENTAL", "DEGRADED", "RETIRED"]).toContain(g.status);
      expect(g.falsifier.length).toBeGreaterThan(0); // every passport carries a falsifier
      expect(g.questionAnswered.length).toBeGreaterThan(0);
    }
  });

  it("the registry holds all ten flagship genomes; six are implemented, four await data", () => {
    expect(FLAGSHIP_STATS).toHaveLength(10);
    expect(FLAGSHIP_STATS.filter((g) => g.implemented)).toHaveLength(6);
    expect(FLAGSHIP_STATS.filter((g) => !g.implemented)).toHaveLength(4);
  });
});

describe("The Five Ledgers — one object, five views (no new authority)", () => {
  const obj = buildDecisionObject({
    id: "ledger-demo",
    at: 3,
    facts: PARALLAX_FIXTURE.facts,
    beliefs: PARALLAX_FIXTURE.beliefs,
    quantity: PARALLAX_FIXTURE.quantity,
    authority: FIXTURE_AUTHORITY,
    intervention: { kind: "PLAYER_OUT", subject: "WR1", snapProbability: 0 },
  });
  const ledgers = projectToLedgers(obj, [decisionBoundaryDistance(cone), authorityMargin(FIXTURE_AUTHORITY)]);

  it("Reality ledger reflects only knowable facts (includes WR1 inactive at kickoff)", () => {
    expect(ledgers.reality.knownFacts.some((f) => f.subject === "WR1" && f.kind === "inactive")).toBe(true);
  });
  it("Belief ledger carries all four observers with disagreement", () => {
    expect(ledgers.belief.beliefs).toHaveLength(4);
    expect(ledgers.belief.disagreement).toBeGreaterThan(0);
  });
  it("Decision ledger shows the forked role-up read", () => {
    expect(ledgers.decision.state).toBe("ROLE_UP_FANTASY_LATE");
    expect(ledgers.decision.refused).toBe(false);
  });
  it("Authority ledger pins the claim to INFO_ONLY on the fixture (the meet)", () => {
    expect(ledgers.authority.ceiling).toBe("INFO_ONLY");
    expect(ledgers.authority.claimStrength).toBe("INFO_ONLY");
  });
  it("Learning ledger carries the metrics with their earned (non-validated) status", () => {
    expect(ledgers.learning.metrics.length).toBe(2);
    for (const m of ledgers.learning.metrics) expect(m.status).not.toBe("VALIDATED");
  });
});
